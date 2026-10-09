from .middleware import client_ip, mask_sensitive_context
from .models import AuditEvent


SECURITY_RELEVANT_ADMIN_MODELS = {"UserProfile", "Subscription", "Plan"}


def log_audit_event(action, *, request=None, actor=None, target=None, target_type="", target_id="", metadata=None):
    actor = actor or _actor_from_request(request)
    clean_metadata = mask_sensitive_context(metadata or {})
    event = AuditEvent.objects.create(
        actor=actor,
        action=action,
        target_type=target_type or _target_type(target),
        target_id=str(target_id or _target_id(target) or ""),
        path=_request_path(request),
        request_id=getattr(request, "request_id", "") if request is not None else "",
        ip_address=_request_ip(request),
        metadata=clean_metadata,
    )
    return event


def audit_admin_change(request, obj, *, created=False, changed_fields=None):
    model_name = obj.__class__.__name__
    changed_fields = changed_fields or []
    if model_name not in SECURITY_RELEVANT_ADMIN_MODELS:
        return None

    action = "admin_model_created" if created else "admin_model_updated"
    if model_name == "UserProfile" and "role" in changed_fields:
        action = "role_changed"
    elif model_name == "UserProfile" and "premium_status" in changed_fields:
        action = "premium_status_changed"
    elif model_name == "Subscription":
        action = "subscription_changed"
    elif model_name == "Plan":
        action = "plan_changed"

    return log_audit_event(
        action,
        request=request,
        target=obj,
        metadata={"model": model_name, "changed_fields": changed_fields, "created": created},
    )


def audit_admin_delete(request, obj):
    model_name = obj.__class__.__name__
    if model_name not in SECURITY_RELEVANT_ADMIN_MODELS:
        return None
    return log_audit_event("admin_model_deleted", request=request, target=obj, metadata={"model": model_name})


def _actor_from_request(request):
    user = getattr(request, "user", None)
    if getattr(user, "is_authenticated", False):
        return user
    return None


def _target_type(target):
    return target.__class__.__name__ if target is not None else ""


def _target_id(target):
    return getattr(target, "pk", "")


def _request_path(request):
    return getattr(request, "path", "")[:240] if request is not None else ""


def _request_ip(request):
    if request is None:
        return None
    value = client_ip(request)
    return value or None
