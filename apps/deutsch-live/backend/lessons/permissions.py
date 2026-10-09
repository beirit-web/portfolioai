from functools import wraps

from django.contrib.auth import logout

from .api_responses import error_response
from .account_service import get_profile, has_valid_auth_token
from .security import log_security_event


def api_login_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated or not has_valid_auth_token(request):
            log_security_event("api_auth_required", path=request.path, user_id=getattr(request.user, "id", None))
            logout(request)
            return error_response("Authentication required.", status=401, code="auth_required")
        return view_func(request, *args, **kwargs)

    return wrapper


def premium_required(view_func):
    @api_login_required
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not get_profile(request.user).has_premium_access:
            log_security_event("premium_route_denied", path=request.path, user_id=request.user.id)
            return error_response("Premium access required.", status=402, code="premium_required")
        return view_func(request, *args, **kwargs)

    return wrapper


def staff_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            log_security_event("staff_route_unauthenticated", path=request.path)
            return error_response("Authentication required.", status=401, code="auth_required")
        if not request.user.is_staff:
            log_security_event("staff_route_forbidden", user_id=request.user.id, path=request.path)
            return error_response("Staff access required.", status=403, code="staff_required")
        return view_func(request, *args, **kwargs)

    return wrapper
