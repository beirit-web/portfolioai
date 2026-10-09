from django.core.mail import send_mail
from django.utils import timezone

from housing_search.models import Notification


def send_new_listing_email(user, listing):
    notification, created = Notification.objects.get_or_create(
        user=user,
        listing=listing,
        notification_type=Notification.TYPE_EMAIL,
        defaults={"status": Notification.STATUS_PREPARED},
    )
    if not created and notification.status == Notification.STATUS_SENT:
        return False

    subject = f"Neue passende Wohnung: {listing.title}"
    lines = [
        listing.title,
        f"Stadt: {listing.city}",
        f"Warmmiete: {listing.warm_rent} EUR",
        f"Zimmer: {listing.rooms}",
        f"Wohnflaeche: {listing.size} m2",
        f"Quelle: {listing.source_name}",
        f"Link: {listing.source_url}",
    ]
    try:
        send_mail(subject, "\n".join(lines), None, [user.email], fail_silently=False)
    except Exception:
        notification.status = Notification.STATUS_FAILED
        notification.save(update_fields=["status"])
        raise

    notification.status = Notification.STATUS_SENT
    notification.sent_at = timezone.now()
    notification.save(update_fields=["status", "sent_at"])
    return True
