"""Use a single proxy-owned client address only from explicitly trusted peers."""

from ipaddress import ip_address, ip_network
from django.conf import settings


def client_ip(request):
    try:
        peer = ip_address(request.META.get("REMOTE_ADDR", ""))
    except ValueError:
        return "unknown"
    if getattr(peer, "ipv4_mapped", None):
        peer = peer.ipv4_mapped
    header = getattr(settings, "CLIENT_IP_HEADER", "")
    trusted = getattr(settings, "TRUSTED_PROXY_CIDRS", [])
    try:
        is_trusted = any(peer in ip_network(cidr) for cidr in trusted)
    except ValueError:
        is_trusted = False
    if header in {"HTTP_FLY_CLIENT_IP", "HTTP_X_REAL_IP"} and is_trusted:
        try:
            forwarded = ip_address(request.META.get(header, ""))
            return str(getattr(forwarded, "ipv4_mapped", None) or forwarded)
        except ValueError:
            pass
    return str(peer)
