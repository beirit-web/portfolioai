import logging
import json
import re
from urllib.parse import urlencode, urlsplit

from django.conf import settings
from django.contrib.auth import logout
from django.core.exceptions import DisallowedHost
from django.http import (
  HttpResponse,
  HttpResponseNotFound,
  HttpResponsePermanentRedirect,
  JsonResponse,
)
from django.http.request import split_domain_port
from django.urls import reverse
from django.shortcuts import redirect, render
from django.utils.cache import patch_response_headers, patch_vary_headers

from pages.auth_session import (
  SESSION_IDLE_TIMEOUT_REASON,
  check_authenticated_session,
  get_session_idle_timeout_seconds,
)
from pages.login_security import clear_login_attempts, consume_login_attempt
from .error_views import error_response, wants_json_error_response

logger = logging.getLogger(__name__)
IMMUTABLE_STATIC_RE = re.compile(r"\.[0-9a-f]{8,}\.")
SUSPICIOUS_PATH_RE = re.compile(
  r"(?ix)"
  r"("
  r"(^|/)\.env($|[./])|"
  r"(^|/)\.git($|/)|"
  r"(^|/)wp-admin($|/)|"
  r"(^|/)wp-login\.php$|"
  r"(^|/)phpmyadmin($|/)|"
  r"(^|/)server-status$|"
  r"(^|/)(backup|backups|dump|db|database)(\.|/|$)|"
  r"\.\./|%2e%2e|"
  r"<script|%3cscript|"
  r"union(\s|%20)+select|"
  r"information_schema"
  r")"
)


def _normalize_prefix(value: str) -> str:
  """
  Return a path prefix with leading/trailing slash or empty string if undefined.
  """
  value = (value or "").strip()
  if not value:
    return ""
  cleaned = value.strip("/")
  return f"/{cleaned}/"


def _ensure_leading_slash(value: str) -> str:
  """
  Ensure a path starts with a single leading slash.
  """
  value = (value or "").strip()
  return f"/{value.lstrip('/')}"


def _is_json_response(response) -> bool:
  content_type = (response.get("Content-Type") or "").lower()
  return "application/json" in content_type or "+json" in content_type


def _replace_error_response(request, response):
  replacement = error_response(request, response.status_code)
  # These describe the old body. Preserve protocol headers and cookies instead.
  body_headers = {
    "content-type", "content-length", "content-encoding", "content-range",
    "etag", "last-modified", "content-md5", "digest", "content-digest", "repr-digest",
  }
  for header, value in response.items():
    if header.lower() == "vary":
      for vary_header in value.split(","):
        patch_vary_headers(replacement, (vary_header.strip(),))
    elif header.lower() not in body_headers:
      replacement[header] = value
  replacement.cookies.update(response.cookies)
  return replacement


def _hostname(value: str) -> str:
  return split_domain_port((value or "").strip().lower())[0]


class AdminIPRestrictionMiddleware:
  """
  Blocks access to admin paths if the remote IP is not whitelisted.
  Whitelist is configured via DJANGO_ADMIN_IP_WHITELIST.
  """

  def __init__(self, get_response):
    self.get_response = get_response
    self.admin_prefix = _normalize_prefix(settings.ADMIN_URL)
    self.whitelist = set(settings.ADMIN_IP_WHITELIST)

  def __call__(self, request):
    if self.whitelist and request.path.startswith(self.admin_prefix):
      remote_ip = (request.META.get("REMOTE_ADDR") or "").strip()
      if remote_ip not in self.whitelist:
        logger.warning("Blocked admin access from non-whitelisted IP %s", remote_ip)
        # Tarnish the admin endpoint by returning 404 instead of 403.
        return HttpResponseNotFound()
    return self.get_response(request)


class LoginAttemptLimitMiddleware:
  """Apply the same account/peer budget to every route that checks passwords."""

  def __init__(self, get_response):
    self.get_response = get_response
    self.login_paths = {
      "/login/", "/api/auth/login/", "/deutschlive/api/auth/login/",
      "/wohnungssuche-api/token-auth/",
      _normalize_prefix(settings.AUTH_URL_PREFIX) + "login/",
      _normalize_prefix(settings.ADMIN_URL) + "login/",
    }

  def __call__(self, request):
    response = self.get_response(request)
    # Django's built-in/admin login views redirect only after a successful login.
    if (request.path in self.login_paths and response.status_code == 302
        and getattr(request.user, "is_authenticated", False)):
      clear_login_attempts(request)
    return response

  def process_view(self, request, view_func, view_args, view_kwargs):
    if request.method != "POST" or request.path not in self.login_paths:
      return None
    if request.content_type == "application/json":
      try:
        data = json.loads(request.body.decode("utf-8"))
      except (UnicodeDecodeError, ValueError, RecursionError):
        return None  # The API's schema validation provides the input error.
      identifier = data.get("username") if isinstance(data, dict) else None
    else:
      identifier = request.POST.get("username", "")
    if not isinstance(identifier, str):
      return None
    if consume_login_attempt(request, identifier):
      return None
    response = JsonResponse({
      "error": "Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.",
      "code": "login_rate_limited",
    }, status=429) if wants_json_error_response(request) else error_response(request, 429)
    response["Retry-After"] = "900"
    return response


class SuspiciousRequestBlockMiddleware:
  """
  Blocks common scanner and exploit paths without revealing the technology stack.
  """

  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    full_path = request.get_full_path().lower()
    if SUSPICIOUS_PATH_RE.search(full_path):
      logger.warning(
        "Blocked suspicious request path=%s ua=%s",
        request.path[:180],
        (request.META.get("HTTP_USER_AGENT") or "")[:120],
      )
      return error_response(request, 404)
    return self.get_response(request)


class SecurityHeadersMiddleware:
  """
  Adds conservative production security headers.
  CSP is report-only by default and can be made enforcing after testing.
  """

  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    response = self.get_response(request)
    self._set_default(response, "X-Content-Type-Options", "nosniff")
    self._set_default(response, "X-Frame-Options", "DENY")
    self._set_default(response, "Referrer-Policy", "strict-origin-when-cross-origin")
    self._set_default(response, "Permissions-Policy", getattr(settings, "PERMISSIONS_POLICY", ""))

    csp = getattr(settings, "CONTENT_SECURITY_POLICY", "")
    if csp:
      header = (
        "Content-Security-Policy"
        if getattr(settings, "CONTENT_SECURITY_POLICY_ENFORCE", False)
        else "Content-Security-Policy-Report-Only"
      )
      self._set_default(response, header, csp)

    return response

  def _set_default(self, response, header: str, value: str):
    if value and header not in response:
      response[header] = value


class SafeStatusPageMiddleware:
  """
  Replaces browser-facing error responses with neutral branded pages.
  Existing JSON and streaming responses are left intact.
  """

  STATUS_CODES = {400, 403, 405, 429, 502, 503}

  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    response = self.get_response(request)
    if response.status_code not in self.STATUS_CODES:
      return response
    if getattr(response, "status_page_handled", False):
      return response
    if response.streaming or _is_json_response(response):
      return response
    return _replace_error_response(request, response)


class MaintenanceMiddleware:
  """
  Zeigt eine freundliche Wartungsseite, wenn MAINTENANCE_MODE aktiv ist.
  """

  def __init__(self, get_response):
    self.get_response = get_response
    self.admin_prefix = _normalize_prefix(settings.ADMIN_URL)

  def __call__(self, request):
    if getattr(settings, "MAINTENANCE_MODE", False):
      # Admin weiter zulassen, damit Deploys/Admin weiter arbeiten können.
      if not request.path.startswith(self.admin_prefix):
        return render(
          request,
          "maintenance.html",
          {"message": getattr(settings, "MAINTENANCE_MESSAGE", "")},
          status=503,
        )
    return self.get_response(request)


class SafeHostAndErrorMiddleware:
  """
  Versteckt Django-Debug-Seiten und erzwingt ALLOWED_HOSTS auch bei DEBUG=True.
  - Blockiert Host-Header, die nicht in settings.ALLOWED_HOSTS stehen.
  - Gibt neutrale 404/500-Antworten statt technischer Debug-Ausgaben.
  """

  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    try:
      request.get_host()
    except DisallowedHost:
      logger.warning("Blocked request with invalid host header")
      return error_response(request, 404)

    response = self.get_response(request)

    if (
      settings.DEBUG
      and response.status_code in {404, 500}
      and not getattr(response, "status_page_handled", False)
      and not response.streaming
      and not _is_json_response(response)
    ):
      # Django converts view exceptions to responses before middleware sees them.
      return _replace_error_response(request, response)
    return response


class HostRedirectMiddleware:
  """
  Redirects configured legacy domains permanently to the canonical SITE_URL.
  Preserves path and query string so search engines transfer signals cleanly.
  """

  def __init__(self, get_response):
    self.get_response = get_response
    self.redirect_hosts = {
      _hostname(host)
      for host in getattr(settings, "REDIRECT_OLD_HOSTS", [])
      if host and host.strip()
    }
    self.site_url = (getattr(settings, "SITE_URL", "") or "").rstrip("/")
    parsed = urlsplit(self.site_url) if self.site_url else None
    self.site_host = _hostname((parsed.netloc if parsed else "") or getattr(settings, "SITE_HOST", ""))

  def __call__(self, request):
    if not self.redirect_hosts or not self.site_url:
      return self.get_response(request)

    host = _hostname(request.get_host())
    if host and host in self.redirect_hosts and host != self.site_host:
      target = f"{self.site_url}{request.get_full_path()}"
      return HttpResponsePermanentRedirect(target)

    return self.get_response(request)


class LoginRequiredMiddleware:
  """
  Erzwingt Authentifizierung für alle URLs außer definierter Ausnahmen.
  """

  def __init__(self, get_response):
    self.get_response = get_response
    admin_prefix = _normalize_prefix(settings.ADMIN_URL)
    static_prefix = _normalize_prefix(getattr(settings, "STATIC_URL", ""))
    media_prefix = _normalize_prefix(getattr(settings, "MEDIA_URL", ""))

    self.exempt_prefixes = {
      p
      for p in (
        admin_prefix,
        _normalize_prefix(getattr(settings, "AUTH_URL_PREFIX", "auth/")),
        _normalize_prefix(getattr(settings, "PASSWORD_RESET_CONFIRM_PREFIX", "reset/")),
        "/verify-email/",
        "/api/session/",
        "/botanic/",
        "/shop/",
        "/api/shop/",
        static_prefix,
        media_prefix,
      )
      if p
    }
    login_url = _ensure_leading_slash(settings.LOGIN_URL)
    self.login_url = login_url
    self.exempt_paths = {login_url, "/login/", "/logout/", "/register/", "/email-bestaetigung/", "/favicon.ico", "/wetter", "/wetter/", "/vokabelbox", "/vokabelbox/"}
    self.exempt_paths.update(
      _ensure_leading_slash(value)
      for key in (
        "PASSWORD_RESET_URL", "PASSWORD_RESET_DONE_URL",
        "PASSWORD_RESET_COMPLETE_URL", "PASSWORD_RESET_INVALID_URL",
      )
      if (value := getattr(settings, key, ""))
    )

  def __call__(self, request):
    if not getattr(settings, "LOGIN_REQUIRED", True):
      return self.get_response(request)

    path = request.path
    if request.user.is_authenticated or self._is_exempt(path):
      return self.get_response(request)

    if request.method in {"GET", "HEAD"}:
      return redirect(f"{self.login_url}?{urlencode({'next': request.get_full_path()})}")
    return HttpResponse("Authentication required", status=401)

  def _is_exempt(self, path: str) -> bool:
    return path in self.exempt_paths or any(path.startswith(prefix) for prefix in self.exempt_prefixes)


class AuthSessionIdleTimeoutMiddleware:
  """
  Enforces the global idle timeout for authenticated users.
  """

  def __init__(self, get_response):
    self.get_response = get_response
    self.login_url = _ensure_leading_slash(settings.LOGIN_URL)
    self.logout_url = "/logout/"

  def __call__(self, request):
    session_state = check_authenticated_session(request)
    if not session_state or session_state.valid:
      return self.get_response(request)

    logout(request)
    payload = self._build_payload(request, session_state.reason)

    if wants_json_error_response(request):
      return JsonResponse(payload, status=401)

    if request.path == self.login_url:
      return self.get_response(request)

    return redirect(payload["loginUrl"])

  def _build_payload(self, request, reason: str) -> dict:
    return {
      "authenticated": False,
      "reason": reason,
      "idleTimeoutSeconds": get_session_idle_timeout_seconds(),
      "loginUrl": self._build_login_redirect(request, reason),
    }

  def _build_login_redirect(self, request, reason: str) -> str:
    if reason == SESSION_IDLE_TIMEOUT_REASON:
      return f"{reverse('pages:home')}?{urlencode({'reason': 'idle'})}"

    params = {}

    current_path = request.get_full_path()
    if current_path and request.path not in {self.login_url, self.logout_url}:
      params["next"] = current_path

    if not params:
      return self.login_url

    return f"{self.login_url}?{urlencode(params)}"



class VersionedStaticCacheMiddleware:
  """
  Add long-lived cache headers for versioned static assets.

  This covers local DEBUG responses where Django's static serve path may skip
  WhiteNoise caching, and also query-versioned assets like `main.css?v=...`.
  """

  def __init__(self, get_response):
    self.get_response = get_response
    self.static_prefix = _normalize_prefix(getattr(settings, "STATIC_URL", ""))
    self.cache_seconds = int(getattr(settings, "VERSIONED_STATIC_CACHE_SECONDS", 31536000))

  def __call__(self, request):
    response = self.get_response(request)

    if request.method not in {"GET", "HEAD"}:
      return response
    if response.status_code != 200 or not self.static_prefix:
      return response
    if not request.path.startswith(self.static_prefix):
      return response
    if not self._is_versioned_request(request):
      return response

    patch_response_headers(response, cache_timeout=self.cache_seconds)
    response["Cache-Control"] = f"public, max-age={self.cache_seconds}, immutable"
    return response

  def _is_versioned_request(self, request) -> bool:
    if request.GET.get("v"):
      return True
    filename = request.path.rsplit("/", 1)[-1]
    return bool(IMMUTABLE_STATIC_RE.search(filename))
