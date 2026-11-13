from django.test import TestCase, override_settings
from django.contrib.auth.models import User


class RetiredBusinessFeaturesTests(TestCase):
    @override_settings(PAYPAL_ENABLED=True, CODEX_DB_EXPORT_ENABLED=True, USER_UPLOADS_ENABLED=True)
    def test_removed_business_apis_stay_unavailable_even_with_old_settings(self):
        self.client.force_login(User.objects.create_user("demo@example.com"))
        for path in ("/api/payments/paypal/config/", "/api/payments/paypal/create-order/", "/api/upload/", "/api/events/", "/codex-db-export/", "/dolmetscher/dashboard/", "/dolmetscher/bewerbung/"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 404)
                self.assertEqual(self.client.post(path).status_code, 404)

    def test_account_keeps_editing_without_client_workspace(self):
        self.client.force_login(User.objects.create_user("demo@example.com"))
        response = self.client.get("/profil/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "account-email")
        for label in ("Dokumentenablage", "Rückrufwünsche", "Postfach", "dolmetscher/dashboard"):
            self.assertNotContains(response, label)
