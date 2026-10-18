"""Database-backed demo request limits and retention, shared by HTML and JSON."""

from datetime import timedelta
from math import ceil
from uuid import uuid4

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.utils.crypto import salted_hmac

from .models import CakeOrder, OrderSubmissionBudget


class SubmissionLimit(Exception):
    def __init__(self, retry_after):
        self.retry_after = max(1, retry_after)
        super().__init__("Zu viele Demo-Anfragen. Bitte später erneut versuchen.")


def retention_days():
    return max(1, int(getattr(settings, "SHOP_GUEST_RETENTION_DAYS", 30)))


def cleanup_demo_data(*, days=None, dry_run=False):
    """Expire anonymous demonstration requests; keep account order history."""
    now = timezone.now()
    cutoff = now - timedelta(days=retention_days() if days is None else days)
    orders = CakeOrder.objects.filter(owner__isnull=True, created_at__lt=cutoff)
    window = max(1, int(getattr(settings, "SHOP_SUBMISSION_WINDOW_SECONDS", 3600)))
    budgets = OrderSubmissionBudget.objects.filter(window_started_at__lt=now - timedelta(seconds=window))
    counts = {"orders": orders.count(), "budgets": budgets.count()}
    if not dry_run:
        orders.delete()
        budgets.delete()
    return counts


def reserve_submission(request):
    # A quiet demo can also be cleaned using the management command below.
    cleanup_demo_data()
    session_id = request.session.get("shop_budget_id")
    if not session_id:
        session_id = request.session["shop_budget_id"] = str(uuid4())
    now = timezone.now()
    window = max(1, int(getattr(settings, "SHOP_SUBMISSION_WINDOW_SECONDS", 3600)))
    scopes = (
        ("session", session_id, max(1, int(getattr(settings, "SHOP_SESSION_SUBMISSION_LIMIT", 5)))),
        # Do not trust client-provided forwarding headers.
        ("ip", request.META.get("REMOTE_ADDR", "unknown"), max(1, int(getattr(settings, "SHOP_IP_SUBMISSION_LIMIT", 20)))),
    )
    with transaction.atomic():
        for scope, value, limit in scopes:
            key = salted_hmac("shop.demo.submissions", f"{scope}:{value}", algorithm="sha256").hexdigest()
            OrderSubmissionBudget.objects.get_or_create(key=key, defaults={"window_started_at": now})
            OrderSubmissionBudget.objects.filter(key=key, window_started_at__lte=now - timedelta(seconds=window)).update(
                window_started_at=now, submissions=0,
            )
            if not OrderSubmissionBudget.objects.filter(key=key, submissions__lt=limit).update(submissions=F("submissions") + 1):
                budget = OrderSubmissionBudget.objects.get(key=key)
                raise SubmissionLimit(ceil((budget.window_started_at + timedelta(seconds=window) - now).total_seconds()))
