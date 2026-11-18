from django.test import RequestFactory, SimpleTestCase, override_settings
from config.client_ip import client_ip


class ProxyAddressTests(SimpleTestCase):
    def request(self, peer="192.0.2.10", **headers):
        return RequestFactory().get("/", REMOTE_ADDR=peer, **headers)

    def test_default_ignores_all_forwarded_addresses(self):
        with override_settings(TRUSTED_PROXY_CIDRS=[], CLIENT_IP_HEADER=""):
            self.assertEqual(client_ip(self.request(HTTP_FLY_CLIENT_IP="198.51.100.2", HTTP_X_FORWARDED_FOR="198.51.100.3")), "192.0.2.10")

    @override_settings(TRUSTED_PROXY_CIDRS=["192.0.2.10/32"], CLIENT_IP_HEADER="HTTP_FLY_CLIENT_IP")
    def test_only_allowed_peer_can_assert_one_valid_client_address(self):
        self.assertEqual(client_ip(self.request(HTTP_FLY_CLIENT_IP="198.51.100.2")), "198.51.100.2")
        self.assertEqual(client_ip(self.request("192.0.2.11", HTTP_FLY_CLIENT_IP="198.51.100.2")), "192.0.2.11")
        for value in ("", "bad", "198.51.100.2, 198.51.100.3"):
            self.assertEqual(client_ip(self.request(HTTP_FLY_CLIENT_IP=value)), "192.0.2.10")

    @override_settings(TRUSTED_PROXY_CIDRS=["192.0.2.10/32"], CLIENT_IP_HEADER="HTTP_X_REAL_IP")
    def test_ipv4_mapped_addresses_are_normalized(self):
        self.assertEqual(client_ip(self.request("::ffff:192.0.2.10", HTTP_X_REAL_IP="::ffff:198.51.100.2")), "198.51.100.2")
