"""SSRF defense for user-supplied URLs.

A user can hand us any URL via /analyze. Without validation, we'd happily
fetch internal services (cloud metadata endpoints, the host's Postgres,
loopback admin panels) on the attacker's behalf.

We defend by:
1. Restricting schemes to http/https.
2. Resolving the hostname and rejecting any address that's private,
   loopback, link-local, multicast, reserved, or unspecified - including
   IPv6 forms.
3. Forcing the caller to revalidate every redirect hop (see scraping.extract).
"""

import ipaddress
import socket
from urllib.parse import urlparse

ALLOWED_SCHEMES = {"http", "https"}


class UnsafeURLError(ValueError):
    """Raised when a URL fails SSRF validation."""


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def validate_url(url: str) -> str:
    """Validate a URL for safe outbound fetching. Returns the URL on success."""
    parsed = urlparse(url)

    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        raise UnsafeURLError(f"Only http(s) URLs are allowed (got '{parsed.scheme}').")
    if not parsed.hostname:
        raise UnsafeURLError("URL is missing a hostname.")

    host = parsed.hostname

    # If the hostname is a literal IP, check it directly.
    try:
        ip = ipaddress.ip_address(host)
        if _is_blocked_ip(ip):
            raise UnsafeURLError(f"Refusing to fetch from internal/reserved IP: {host}.")
        return url
    except ValueError:
        pass  # Not a literal IP - fall through to DNS resolution.

    # Resolve the hostname; reject if any returned address is internal.
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise UnsafeURLError(f"Could not resolve hostname '{host}': {exc}") from exc

    for info in infos:
        addr = info[4][0]
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            continue
        if _is_blocked_ip(ip):
            raise UnsafeURLError(
                f"Hostname '{host}' resolves to internal/reserved address {addr}; refusing to fetch."
            )

    return url
