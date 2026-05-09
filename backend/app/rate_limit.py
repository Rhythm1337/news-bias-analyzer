"""Per-IP rate limiting.

Uses slowapi (a FastAPI port of Flask-Limiter) with an in-memory backend.
That's fine for a single-instance dev/MVP deploy. If/when we scale to
multiple workers or instances, swap the storage_uri to Redis.

Behind a reverse proxy (e.g. Render), the immediate peer address is the
proxy itself, so every visitor would otherwise share one bucket. When
`settings.trust_x_forwarded_for` is True we instead key on a value from
the X-Forwarded-For header.

Picking the right index matters: the left-most XFF value is whatever the
client sent and is fully attacker-controlled; only the right-most N
values (where N is the number of trusted proxies between the public
internet and the app) can be trusted. We take the entry N from the right,
where N = settings.trusted_proxy_hops.
"""

import logging
import time

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

logger = logging.getLogger(__name__)

# Throttle the misconfig warning so we don't spam logs once per request, but
# re-arm hourly so a re-introduced misconfig is still surfaced (a permanent
# latch would silence a fixed-then-broken-again proxy chain forever).
_XFF_WARN_INTERVAL_SECONDS = 3600.0
_xff_last_warned_at: float = 0.0


def _real_ip(request: Request) -> str:
    """Return the client IP, optionally honoring X-Forwarded-For.

    With `trust_x_forwarded_for` enabled, we read the entry that is
    `trusted_proxy_hops` positions from the right of the XFF list. With
    hops=1 (the default, suitable for a single trusted proxy like Render),
    that's the right-most value, which the proxy appended itself and the
    client cannot spoof. With hops=2 (e.g. Render behind Cloudflare), it's
    the second-from-right entry.

    If the chain is SHORTER than `trusted_proxy_hops` (a direct request
    that bypassed a proxy, or a misconfigured hop count), we deliberately
    do NOT fall back to the left-most XFF value because that's whatever the
    client sent and is fully attacker-controlled. Instead we fall back to
    `get_remote_address`, which returns the immediate TCP peer address.
    Behind a proxy this collapses every visitor to one bucket (the LB IP),
    which is conservative but spoof-proof. We log a warning so an operator
    notices the misconfig.
    """
    global _xff_last_warned_at

    if settings.trust_x_forwarded_for:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            parts = [p.strip() for p in xff.split(",") if p.strip()]
            hops = max(1, settings.trusted_proxy_hops)
            if len(parts) >= hops:
                candidate = parts[-hops]
                if candidate:
                    return candidate
            else:
                # Chain shorter than expected. Don't trust parts[0]; the
                # client could have set the entire header. Warn at most once
                # per hour so a transiently fixed-then-broken proxy chain
                # still gets reported.
                now = time.monotonic()
                if now - _xff_last_warned_at >= _XFF_WARN_INTERVAL_SECONDS:
                    _xff_last_warned_at = now
                    logger.warning(
                        "X-Forwarded-For chain has %d entries but "
                        "trusted_proxy_hops=%d. Falling back to peer address. "
                        "Check your proxy chain or lower TRUSTED_PROXY_HOPS.",
                        len(parts),
                        hops,
                    )
    return get_remote_address(request)


limiter = Limiter(
    key_func=_real_ip,
    default_limits=["60/minute"],
)
