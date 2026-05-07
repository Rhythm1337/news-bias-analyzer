"""Per-IP rate limiting.

Uses slowapi (a FastAPI port of Flask-Limiter) with an in-memory backend.
That's fine for a single-instance dev/MVP deploy. If/when we scale to
multiple workers or instances, swap the storage_uri to Redis.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/minute"],
)
