from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import ApplicantProfile, ContactLog, Listing, ListingStatus, Notification, Provider, SearchProfile
from .services.application import generate_cover_letter
from .services.matcher import listing_matches
from .services.notifier import send_new_listing_email
from .services.providers.fake_provider import FakeHousingProvider
from .services.repository import store_listing_for_user


User = get_user_model()


class HousingSearchTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="anna", email="anna@example.com", password="secret")
        self.other_user = User.objects.create_user(username="bert", email="bert@example.com", password="secret")

    def login(self):
        self.client.force_login(self.user)

    def create_profile(self, user=None, **kwargs):
        defaults = {
            "user": user or self.user,
            "name": "Bodensee Suche",
            "region": "Bodensee",
            "cities": "Friedrichshafen,Konstanz,Ravensburg",
            "max_rent": Decimal("1000.00"),
            "min_rooms": Decimal("1.0"),
            "max_rooms": Decimal("3.0"),
            "min_size": 35,
            "max_size": 80,
            "is_active": True,
        }
        defaults.update(kwargs)
        return SearchProfile.objects.create(**defaults)

    def listing_data(self, **kwargs):
        data = {
            "title": "Testwohnung",
            "description": "Eine helle Wohnung mit Balkon in guter Lage.",
            "warm_rent": Decimal("850.00"),
            "cold_rent": Decimal("700.00"),
            "additional_costs": Decimal("150.00"),
            "deposit": Decimal("2100.00"),
            "rooms": Decimal("2.0"),
            "size": 55,
            "city": "Friedrichshafen",
            "source_name": "Fake",
            "source_url": "https://example.com/listing/1",
            "external_id": "listing-1",
            "property_type": "apartment",
            "pets_allowed": True,
            "balcony": True,
            "garden": False,
            "elevator": False,
            "barrier_free": False,
        }
        data.update(kwargs)
        return data

    def test_user_can_create_search_profile(self):
        self.login()
        response = self.client.post(
            reverse("housing_search:search_profile_create"),
            {
                "name": "Meine Suche",
                "region": "Bodensee",
                "cities": ["Friedrichshafen", "Konstanz"],
                "max_rent": "950.00",
                "min_rooms": "1.0",
                "max_rooms": "3.0",
                "min_size": "35",
                "max_size": "80",
                "property_type": "apartment",
                "max_distance_km": "10",
                "is_active": "on",
            },
        )
        self.assertRedirects(response, reverse("housing_search:search_profile_list"))
        profile = SearchProfile.objects.get(name="Meine Suche")
        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.city_list(), ["Friedrichshafen", "Konstanz"])

    def test_user_only_sees_own_profiles(self):
        own = self.create_profile(name="Eigene Suche")
        other = self.create_profile(user=self.other_user, name="Fremde Suche")
        self.login()
        response = self.client.get(reverse("housing_search:search_profile_list"))
        self.assertContains(response, own.name)
        self.assertNotContains(response, other.name)

    def test_fake_provider_returns_data(self):
        profile = self.create_profile()
        results = FakeHousingProvider().search(profile)
        self.assertGreaterEqual(len(results), 4)
        self.assertIn("city", results[0])

    def test_matching_accepts_and_rejects_listings(self):
        profile = self.create_profile(max_rent=Decimal("900.00"), balcony=True)
        self.assertTrue(listing_matches(profile, self.listing_data()))
        self.assertFalse(listing_matches(profile, self.listing_data(warm_rent=Decimal("1200.00"))))
        self.assertFalse(listing_matches(profile, self.listing_data(balcony=False)))

    def test_duplicate_listings_are_prevented(self):
        data = self.listing_data()
        first, first_created, first_status, first_status_created = store_listing_for_user(self.user, data)
        second, second_created, second_status, second_status_created = store_listing_for_user(self.user, data)
        self.assertEqual(first.pk, second.pk)
        self.assertTrue(first_created)
        self.assertFalse(second_created)
        self.assertEqual(Listing.objects.count(), 1)
        self.assertEqual(ListingStatus.objects.count(), 1)
        self.assertEqual(first_status.pk, second_status.pk)
        self.assertTrue(first_status_created)
        self.assertFalse(second_status_created)

    def test_management_command_creates_status_once(self):
        self.create_profile(max_rent=Decimal("1000.00"), balcony=False)
        call_command("run_housing_search")
        first_count = ListingStatus.objects.filter(user=self.user).count()
        self.assertGreater(first_count, 0)
        call_command("run_housing_search")
        self.assertEqual(ListingStatus.objects.filter(user=self.user).count(), first_count)

    def test_dashboard_loads(self):
        self.login()
        response = self.client.get(reverse("housing_search:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Dashboard")

    def test_status_can_be_changed(self):
        listing, _, status, _ = store_listing_for_user(self.user, self.listing_data())
        self.login()
        response = self.client.post(
            reverse("housing_search:listing_quick_status", kwargs={"pk": status.pk, "status": "documents_sent"})
        )
        self.assertRedirects(response, reverse("housing_search:listing_list"), fetch_redirect_response=False)
        status.refresh_from_db()
        self.assertEqual(status.status, ListingStatus.STATUS_DOCUMENTS_SENT)

    def test_provider_compliance_can_be_documented(self):
        provider = Provider.objects.create(
            name="E-Mail Suchauftrag",
            provider_type=Provider.TYPE_EMAIL,
            data_source="Suchauftrag-E-Mail",
            email_import_available=True,
            status=Provider.STATUS_REVIEW,
            notes="Automatisierte Anbieterabfrage vor Aktivierung pruefen.",
        )
        self.assertFalse(provider.active)
        self.assertEqual(provider.status, Provider.STATUS_REVIEW)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_email_notification_is_not_sent_twice(self):
        listing, _, _, _ = store_listing_for_user(self.user, self.listing_data())
        self.assertTrue(send_new_listing_email(self.user, listing))
        self.assertFalse(send_new_listing_email(self.user, listing))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(Notification.objects.count(), 1)

    def test_applicant_profile_can_be_saved(self):
        self.login()
        response = self.client.post(
            reverse("housing_search:applicant_profile_update"),
            {
                "full_name": "Anna Beispiel",
                "phone": "07541 12345",
                "email": "anna@example.com",
                "current_city": "Friedrichshafen",
                "occupation": "Angestellte",
                "income": "2600.00",
                "persons_count": "1",
                "pets": "",
                "short_intro": "Ich suche eine ruhige Wohnung am Bodensee.",
                "schufa_available": "on",
                "documents_available": "on",
            },
        )
        self.assertRedirects(response, reverse("housing_search:dashboard"))
        profile = ApplicantProfile.objects.get(user=self.user)
        self.assertEqual(profile.full_name, "Anna Beispiel")
        self.assertTrue(profile.documents_available)

    def test_contact_log_is_scoped_to_listing_owner_status(self):
        _, _, status, _ = store_listing_for_user(self.user, self.listing_data())
        self.login()
        response = self.client.post(
            reverse("housing_search:contact_log_create", kwargs={"pk": status.pk}),
            {
                "contact_name": "Hausverwaltung",
                "email": "kontakt@example.com",
                "message": "Telefonat gefuehrt, Unterlagen angefragt.",
                "next_follow_up": "2026-10-02",
            },
        )
        self.assertRedirects(response, reverse("housing_search:listing_detail", kwargs={"pk": status.pk}))
        contact_log = ContactLog.objects.get(user=self.user)
        self.assertEqual(contact_log.listing, status.listing)
        self.assertEqual(contact_log.contact_name, "Hausverwaltung")

    def test_cover_letter_preview_uses_applicant_profile(self):
        listing, _, status, _ = store_listing_for_user(self.user, self.listing_data())
        ApplicantProfile.objects.create(
            user=self.user,
            full_name="Anna Beispiel",
            email="anna@example.com",
            phone="07541 12345",
            occupation="Angestellte",
            persons_count=1,
            short_intro="Ich bin langfristig auf Wohnungssuche.",
        )
        paragraphs = generate_cover_letter(self.user.applicant_profile, listing)
        self.assertTrue(any("Anna Beispiel" in paragraph for paragraph in paragraphs))

        self.login()
        response = self.client.get(reverse("housing_search:cover_letter_preview", kwargs={"pk": status.pk}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Ich bin langfristig auf Wohnungssuche.")

# Create your tests here.
