from django.core.management.base import BaseCommand
from django.utils import timezone

from housing_search.models import SearchProfile
from housing_search.services.matcher import listing_matches
from housing_search.services.notifier import send_new_listing_email
from housing_search.services.providers.fake_provider import FakeHousingProvider
from housing_search.services.repository import store_listing_for_user
from housing_search.services.scoring import calculate_score


class Command(BaseCommand):
    help = "Fuehrt aktive Wohnungssuchprofile mit dem Fake-Provider aus."

    def add_arguments(self, parser):
        parser.add_argument("--send-email", action="store_true", help="E-Mail fuer neue Treffer senden.")

    def handle(self, *args, **options):
        providers = [FakeHousingProvider()]
        created_count = 0
        matched_count = 0

        for profile in SearchProfile.objects.filter(is_active=True).select_related("user"):
            for provider in providers:
                for listing_data in provider.search(profile):
                    if not listing_matches(profile, listing_data):
                        continue

                    matched_count += 1
                    listing_data["score"] = calculate_score(profile, listing_data)
                    listing, created, status, status_created = store_listing_for_user(profile.user, listing_data)
                    if created or status_created:
                        created_count += 1
                        if options["send_email"] and profile.user.email:
                            send_new_listing_email(profile.user, listing)

            profile.last_run_at = timezone.now()
            profile.save(update_fields=["last_run_at"])

        self.stdout.write(self.style.SUCCESS(f"{matched_count} Treffer passend, {created_count} neu vorbereitet."))
