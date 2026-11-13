"""Regression checks for publishing only fictional .env files."""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from check_portfolio_data import sample_env_findings


class PublicEnvSampleTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / ".env"

    def write_samples(self, text):
        self.path.write_text(text)
        self.path.with_name(".env.example").write_text(text)

    def test_matching_fake_samples_are_allowed(self):
        text = "SECRET_KEY=fake-local-secret\nPAYPAL_CLIENT_SECRET=\nCONTACT_EMAIL=demo@example.invalid\n"
        self.write_samples(text)
        self.assertEqual(sample_env_findings(self.path, text), [])

    def test_missing_template_is_rejected(self):
        text = "SECRET_KEY=fake-local-secret\n"
        self.path.write_text(text)
        self.assertTrue(sample_env_findings(self.path, text))

    def test_changed_env_is_rejected_even_with_fake_values(self):
        self.write_samples("SECRET_KEY=fake-original\n")
        text = "SECRET_KEY=fake-changed\n"
        self.path.write_text(text)
        self.assertTrue(sample_env_findings(self.path, text))

    def test_credential_is_rejected_when_both_files_match(self):
        text = "PAYPAL_CLIENT_SECRET=unmarked-private-value\n"
        self.write_samples(text)
        for path in (self.path, self.path.with_name(".env.example")):
            with self.subTest(path=path.name):
                self.assertTrue(sample_env_findings(path, text))

    def test_non_example_contact_is_rejected(self):
        text = "CONTACT_EMAIL=someone@company.invalid\n"
        self.write_samples(text)
        self.assertTrue(sample_env_findings(self.path, text))


if __name__ == "__main__":
    unittest.main()
