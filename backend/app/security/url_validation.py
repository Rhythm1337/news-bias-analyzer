"""SSRF defense for user-supplied URLs.

A user can hand us any URL via /analyze. Without validation, we'd happily
fetch internal services (cloud metadata endpoints, the host's Postgres,
loopback admin panels) on the attacker's behalf.

We defend by:
1. Restricting schemes to http/https.
2. Resolving the hostname and rejecting if ANY returned address is private,
   loopback, link-local, multicast, reserved, or unspecified, including
   IPv6 forms. Iterating over every resolved address (not just the first)
   defeats the trivial DNS attack where the attacker returns one public IP
   and one internal IP and hopes the validator only checks one.
3. Forcing the caller to revalidate every redirect hop (see scraping.extract).

Residual TOCTOU window:
This validator does its own DNS lookup, then httpx (and the kernel) does
another lookup at connect time. A malicious authoritative DNS server can
return safe addresses on the first query and an internal address on the
second, slipping past us. Closing that window fully would require a custom
httpx transport that connects to a pinned IP we just validated, with
manual SNI / Host headers for TLS. That is deferred; the all-addresses
check above narrows the gap to the small fraction of attackers who can
also win that race.
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
        raise UnsafeURLError(f"Only http and https URLs are allowed (you sent '{parsed.scheme}').")
    if not parsed.hostname:
        raise UnsafeURLError("This URL is missing a website name. Please paste a full URL like https://example.com/article.")

    host = parsed.hostname
    port = parsed.port  # may be None; passed to getaddrinfo for accuracy.

    # If the hostname is a literal IP, check it directly.
    try:
        ip = ipaddress.ip_address(host)
        if _is_blocked_ip(ip):
            raise UnsafeURLError(f"This IP address ({host}) is private or reserved. We can only fetch public websites.")
        return url
    except ValueError:
        pass  # Not a literal IP, fall through to DNS resolution.

    # Resolve the hostname and reject if ANY returned address is internal.
    # Checking every address (not just the first) defeats DNS responses that
    # mix a public IP with an internal one to slip past a single-IP check.
    try:
        infos = socket.getaddrinfo(host, port)
    except socket.gaierror as exc:
        # Don't echo the raw gaierror text/number back to the user. It can
        # vary between platforms and can leak resolver internals; the user
        # only needs to know we couldn't resolve the host.
        raise UnsafeURLError(
            f"Could not resolve hostname '{host}'. Please check that the URL is correct."
        ) from exc

    if not infos:
        raise UnsafeURLError(f"We could not find any address for the website '{host}'. Please check the URL.")

    for info in infos:
        addr = info[4][0]
        # IPv6 sockaddrs can carry a scope id like "fe80::1%eth0"; strip it
        # before parsing so ipaddress does not reject scoped link-local addrs
        # (which we want to block anyway).
        if "%" in addr:
            addr = addr.split("%", 1)[0]
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            # Unparseable address: be safe and refuse rather than skip.
            raise UnsafeURLError(
                f"We got back an address we could not read for '{host}'. We cannot fetch this URL safely."
            )
        if _is_blocked_ip(ip):
            raise UnsafeURLError(
                f"The website '{host}' points to a private or reserved address ({addr}). We can only fetch public websites."
            )

    return url
