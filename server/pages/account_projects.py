"""Project context for the shared account, without a portfolio account menu."""

from urllib.parse import parse_qs, urlencode, urlsplit

from django.urls import reverse


PROJECTS = (
    ("/shop/", "Torten- und Kuchen-Shop", "/shop/"),
    ("/botanic/", "ENBT Botanic", "/botanic/"),
    ("/wohnungssuche/", "Wohnungssuche Bodensee", "/wohnungssuche/"),
    ("/static/portfolio/notenrechner/", "Notenrechner", "/static/portfolio/notenrechner/index.html"),
    ("/deutschlive/", "DeutschLive", "/deutschlive/"),
)


def project_target(value):
    """Accept local project paths only; unwrap shared account return links once."""
    if not isinstance(value, str) or not value.startswith("/") or value.startswith("//"):
        return None
    if any(character.isspace() or character == "\\" for character in value):
        return None
    parsed = urlsplit(value)
    if parsed.netloc or parsed.scheme:
        return None
    if parsed.path in {reverse("pages:login"), reverse("pages:profile")}:
        values = parse_qs(parsed.query).get("next", [])
        value = values[0] if len(values) == 1 else ""
        if not value.startswith("/") or value.startswith("//") or "\\" in value or any(c.isspace() for c in value):
            return None
        parsed = urlsplit(value)
    for prefix, name, home in PROJECTS:
        if parsed.path.startswith(prefix) or parsed.path == prefix.rstrip("/"):
            return {"name": name, "home": home, "target": value}
    return None


def shared_account_url(name, target):
    return reverse(name) + "?" + urlencode({"next": target})


def project_account_context(request, target=None):
    # Project pages must not copy private search/filter terms into account links.
    # Explicit return URLs on account forms still retain their query and fragment.
    if target is not None:
        candidate = target
    elif project_target(request.path):
        candidate = request.path
    else:
        candidate = request.POST.get("next") or request.GET.get("next") or request.path
    project = project_target(candidate)
    if not project:
        return {
            "account_login_url": reverse("pages:login"),
            "account_register_url": reverse("pages:register"),
            "account_password_reset_url": reverse("password_reset"),
            "account_profile_url": reverse("pages:profile"),
            "account_logout_url": reverse("pages:logout"),
            "account_home_url": reverse("pages:home"),
        }
    destination = project["target"]
    login_url = shared_account_url("pages:login", destination)
    if project["home"] == "/wohnungssuche/":
        login_url = "/wohnungssuche/login"
    elif project["home"] == "/deutschlive/":
        login_url = "/deutschlive/account"
    return {
        "account_project": project,
        "account_home_url": project["home"],
        "account_login_url": login_url,
        "account_register_url": "/wohnungssuche/register" if project["home"] == "/wohnungssuche/" else shared_account_url("pages:register", destination),
        "account_profile_url": shared_account_url("pages:profile", destination),
        "account_logout_url": shared_account_url("pages:logout", project["home"]),
        "account_password_reset_url": reverse("password_reset") + "?" + urlencode({"next": login_url}),
    }


def recovery_login_url(candidate):
    """Recovery may return to a known login, never an arbitrary URL."""
    if candidate in {"/wohnungssuche/login", "/wohnungssuche/login/"}:
        return "/wohnungssuche/login"
    if candidate in {"/deutschlive/account", "/deutschlive/account/"}:
        return "/deutschlive/account"
    project = project_target(candidate)
    if project and urlsplit(candidate).path == reverse("pages:login"):
        return shared_account_url("pages:login", project["target"])
    return reverse("pages:login")
