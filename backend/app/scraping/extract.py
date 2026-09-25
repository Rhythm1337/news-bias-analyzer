import logging
import re
import time
from urllib.parse import urlparse, urljoin
from urllib.robotparser import RobotFileParser

import httpx
import trafilatura
from curl_cffi import requests as ccurl

from app.config import settings
from app.security.url_validation import (
    ALLOWED_SCHEMES,
    UnsafeURLError,
    validate_url,
)

logger = logging.getLogger(__name__)

# We identify as a real browser to avoid blanket bot blocks. This is an
# educational project that fetches a single article on demand at the user's
# request, not a crawler.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
# Short bot identifier used for robots.txt user-agent matching. The full UA
# string above is what we send in actual HTTP request headers; only the bot
# name is matched against the User-agent directives in robots.txt.
USER_AGENT_NAME = "NewsBiasAnalyzer"

# Headers used by the article fetch (curl_cffi adds the Chrome-like Sec-Fetch
# and TLS handshake itself when impersonating). Brotli is intentionally NOT
# advertised because httpx (used for the robots.txt fetch) does not decode
# br without the optional brotli package; gzip and deflate are decoded
# natively. curl_cffi handles all common encodings transparently.
DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
}

# curl_cffi version of the same headers, with Brotli enabled because curl_cffi
# does decode br. This is sent on article fetches.
ARTICLE_HEADERS = {
    **DEFAULT_HEADERS,
    "Accept-Encoding": "gzip, deflate, br",
}

# Chrome impersonation profile for curl_cffi (TLS fingerprint + header order
# that match real Chrome 124). This is what defeats the simpler ja3-based
# bot detection used by Cloudflare and similar.
IMPERSONATE = "chrome124"

FETCH_TIMEOUT = 15.0
MAX_REDIRECTS = 5
MAX_RESPONSE_BYTES = 5_000_000
# Must match analyze.MIN_TEXT_CHARS. Importing from app.routes.analyze would
# create a circular import (analyze imports this module), so the constant is
# duplicated here. Update both together.
MIN_EXTRACTED_CHARS = 200

ROBOTS_TIMEOUT = 5.0
ROBOTS_MAX_BYTES = 100_000
ROBOTS_MAX_REDIRECTS = 3
ROBOTS_CACHE_TTL_SECONDS = 3600.0

# Cache: key is "scheme://host", value is (expires_at_unix, parser).
# A permissive parser (one that allows everything) is cached when robots.txt
# is missing, returns an error, or cannot be reached, so we do not hammer.
_robots_cache: dict[str, tuple[float, RobotFileParser]] = {}

# ScrapingBee fallback config. The endpoint accepts the target URL plus an
# api_key as query params. We keep render_js off (cheaper credits) for the
# first attempt; if that still fails, we retry with render_js=true.
SCRAPINGBEE_ENDPOINT = "https://app.scrapingbee.com/api/v1/"
SCRAPINGBEE_TIMEOUT = 30.0


class ScrapeError(Exception):
    pass


class _SSRFRefused(ScrapeError):
    """Raised when a fetch attempt was aborted because the URL (or a redirect
    hop) failed SSRF validation. Callers must NOT retry the same URL through a
    different fetcher (e.g. ScrapingBee), since that would defeat the
    validator and turn the third-party fetcher into an SSRF proxy.
    """

    is_ssrf = True


def _redact_api_key(text: str) -> str:
    """Strip our ScrapingBee api_key value from any text before logging."""
    if not text:
        return text
    return re.sub(r"api_key=[^&\s]+", "api_key=REDACTED", text)


def _is_html_content_type(ctype: str) -> bool:
    ctype = (ctype or "").lower()
    return "html" in ctype or "xml" in ctype or ctype == ""


def _decode_with_cap(content: bytes, encoding: str | None) -> str:
    if len(content) > MAX_RESPONSE_BYTES:
        raise ScrapeError("This page is too large for us to read. Try a different link.")
    return content.decode(encoding or "utf-8", errors="replace")


def _read_capped_body(response, max_bytes: int) -> bytes:
    """Read a streaming response body, raising ScrapeError if it exceeds max_bytes.

    Works with curl_cffi's streamed Response (iter_content). The caller is
    responsible for opening the response with stream=True and for closing it.
    """
    chunks: list[bytes] = []
    total = 0
    for chunk in response.iter_content(chunk_size=8192):
        if not chunk:
            continue
        total += len(chunk)
        if total > max_bytes:
            raise ScrapeError(
                "This page is too large for us to read. Try a different link."
            )
        chunks.append(chunk)
    return b"".join(chunks)


def _raise_for_status_friendly(status_code: int) -> None:
    """Translate common HTTP error codes into user-friendly ScrapeError messages."""
    if status_code == 403:
        raise ScrapeError(
            "This site blocks our reader (403). Copy the article text and paste it here instead."
        )
    if status_code == 404:
        raise ScrapeError(
            "We could not find an article at that URL (404). Please check the link."
        )
    if status_code >= 400:
        raise ScrapeError(
            f"This site returned an error ({status_code}). Try again or paste the text."
        )


def _direct_fetch(url: str) -> str:
    """Fetch a URL with curl_cffi (Chrome TLS fingerprint), validating each redirect.

    Returns the decoded HTML body. Raises ScrapeError on failure. Raises
    _SSRFRefused (a ScrapeError subclass) when the URL or any redirect hop
    fails SSRF validation. The caller MUST treat that as terminal and not
    retry the same URL through any other fetcher.
    """
    session = ccurl.Session(
        impersonate=IMPERSONATE,
        headers=ARTICLE_HEADERS,
        timeout=FETCH_TIMEOUT,
    )
    try:
        for _ in range(MAX_REDIRECTS + 1):
            try:
                validate_url(url)
            except UnsafeURLError as exc:
                # Distinct exception so fetch_and_extract knows to skip the
                # ScrapingBee fallback (forwarding an SSRF target to a third
                # party fetcher would defeat the validator).
                raise _SSRFRefused(str(exc)) from exc

            response = session.get(url, allow_redirects=False, stream=True)
            try:
                status = response.status_code

                # Redirect: validate the next hop ourselves.
                if 300 <= status < 400 and status != 304:
                    next_url = response.headers.get("Location")
                    if not next_url:
                        raise ScrapeError(
                            "This site sent a broken redirect. Try a different link."
                        )
                    candidate = urljoin(url, next_url)
                    # Reject non-http(s) schemes early so we never resolve or
                    # connect to e.g. file://, gopher://, ftp:// targets.
                    next_scheme = urlparse(candidate).scheme.lower()
                    if next_scheme not in ALLOWED_SCHEMES:
                        raise _SSRFRefused(
                            f"This site tried to redirect us to a non-web URL "
                            f"(scheme '{next_scheme}'). We can only follow "
                            "http and https links."
                        )
                    url = candidate
                    continue

                _raise_for_status_friendly(status)

                ctype = response.headers.get("content-type", "")
                if not _is_html_content_type(ctype):
                    raise ScrapeError(
                        f"This URL is not a web page (we got {ctype} back). "
                        "Try a regular article link."
                    )

                content = _read_capped_body(response, MAX_RESPONSE_BYTES)
                return content.decode(response.encoding or "utf-8", errors="replace")
            finally:
                response.close()

        raise ScrapeError(
            f"This site keeps redirecting (more than {MAX_REDIRECTS} times). "
            "Try a different link."
        )
    finally:
        session.close()


def _scrapingbee_fetch(url: str, render_js: bool = False) -> str | None:
    """Try the ScrapingBee fallback. Returns HTML on success, None when not configured.

    Raises ScrapeError on a configured-but-failed call.
    """
    api_key = settings.scrapingbee_api_key
    if not api_key:
        return None

    # Belt and braces: even though fetch_and_extract is supposed to gate this
    # on a successful validate_url, re-check here so this helper is safe to
    # call directly. If validation fails, refuse outright; do NOT proxy an
    # SSRF target through a third party fetcher.
    try:
        validate_url(url)
    except UnsafeURLError as exc:
        raise _SSRFRefused(str(exc)) from exc

    params = {
        "api_key": api_key,
        "url": url,
        "render_js": "true" if render_js else "false",
        "premium_proxy": "false",
    }
    try:
        response = httpx.get(
            SCRAPINGBEE_ENDPOINT,
            params=params,
            timeout=SCRAPINGBEE_TIMEOUT,
        )
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        raise ScrapeError(
            "Could not reach the fallback fetcher. Please try again or paste the text."
        ) from exc
    except httpx.HTTPError as exc:
        # httpx.HTTPError messages frequently echo the full request URL,
        # which carries our ScrapingBee api_key as a query parameter. The
        # FastAPI route surfaces str(exc) directly to the client, so we
        # MUST scrub the key before constructing the user-facing message.
        raise ScrapeError(
            f"Fallback fetcher error: {_redact_api_key(str(exc))}"
        ) from exc

    if response.status_code == 401:
        # Bad API key. Treat as not configured so we do not surface the key publicly.
        logger.warning("ScrapingBee returned 401 (bad API key).")
        return None
    if response.status_code == 429:
        raise ScrapeError(
            "We hit our fallback fetcher's rate limit. Try again later "
            "or paste the article text."
        )
    if response.status_code >= 400:
        # Don't expose ScrapingBee internals. Surface a generic block message.
        # Redact our api_key from anything we log: ScrapingBee error bodies
        # sometimes echo back the request URL (which carries api_key=...).
        logger.warning(
            "ScrapingBee returned %s for %s: %s",
            response.status_code,
            _redact_api_key(url),
            _redact_api_key(response.text[:200]),
        )
        raise ScrapeError(
            "We could not load this site even with the fallback fetcher. "
            "Please paste the article text directly."
        )

    body = response.content or b""
    if len(body) > MAX_RESPONSE_BYTES:
        raise ScrapeError("This page is too large for us to read. Try a different link.")
    return body.decode(response.encoding or "utf-8", errors="replace")


def _permissive_parser() -> RobotFileParser:
    """Build a RobotFileParser that allows everything (used as a default)."""
    parser = RobotFileParser()
    parser.parse([])
    return parser


def _fetch_robots_body(robots_url: str) -> str | None:
    """Fetch robots.txt with httpx (no need to mimic a browser for this).

    Returns the body text on a 200 response, or None on any other status /
    error. Manually follows up to ROBOTS_MAX_REDIRECTS hops, re-running
    validate_url on every hop so a redirect cannot point us at an internal
    address. Also enforces the byte cap during streaming.
    """
    url = robots_url
    try:
        with httpx.Client(
            headers=DEFAULT_HEADERS,
            timeout=ROBOTS_TIMEOUT,
            follow_redirects=False,
        ) as client:
            for _ in range(ROBOTS_MAX_REDIRECTS + 1):
                try:
                    validate_url(url)
                except UnsafeURLError:
                    # A redirect into private space; stop and fall back to
                    # default-permissive (caller treats None as "allow").
                    return None

                with client.stream("GET", url) as response:
                    status = response.status_code
                    if 300 <= status < 400 and status != 304:
                        next_url = response.headers.get("location")
                        if not next_url:
                            return None
                        candidate = urljoin(url, next_url)
                        if urlparse(candidate).scheme.lower() not in ALLOWED_SCHEMES:
                            return None
                        url = candidate
                        continue

                    if status != 200:
                        return None

                    chunks: list[bytes] = []
                    total = 0
                    for chunk in response.iter_bytes():
                        total += len(chunk)
                        if total > ROBOTS_MAX_BYTES:
                            # A giant robots.txt is suspect; truncate rather than fail.
                            break
                        chunks.append(chunk)
                    body = b"".join(chunks)
                    return body.decode(response.encoding or "utf-8", errors="replace")
            return None
    except Exception as exc:  # noqa: BLE001 - any failure here is non-fatal
        logger.warning("Failed to fetch robots.txt at %s: %s", robots_url, exc)
        return None


def _robots_allows(url: str) -> bool:
    """Return True if the target site's robots.txt allows our bot to fetch url.

    Default-permissive: if robots.txt is missing, blocked, or unreachable, we
    allow the fetch. Results are cached per scheme+host for one hour.
    """
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.hostname:
        # Malformed URLs will be rejected later by validate_url; do not block here.
        return True

    scheme = parsed.scheme if parsed.scheme in ("http", "https") else "https"
    host_key = f"{scheme}://{parsed.netloc}"
    now = time.time()

    cached = _robots_cache.get(host_key)
    if cached and cached[0] > now:
        return cached[1].can_fetch(USER_AGENT_NAME, url)

    robots_url = f"{host_key}/robots.txt"

    # Run robots.txt URL through the same SSRF check as article URLs. If the
    # host fails validation, treat it as allow here; the article fetch itself
    # will reject the URL with a clear message.
    try:
        validate_url(robots_url)
    except UnsafeURLError:
        parser = _permissive_parser()
        _robots_cache[host_key] = (now + ROBOTS_CACHE_TTL_SECONDS, parser)
        return True

    body = _fetch_robots_body(robots_url)
    parser = RobotFileParser()
    if body is None:
        parser.parse([])
    else:
        parser.parse(body.splitlines())

    _robots_cache[host_key] = (now + ROBOTS_CACHE_TTL_SECONDS, parser)
    return parser.can_fetch(USER_AGENT_NAME, url)


def _is_block_signal(html: str) -> bool:
    """Heuristic: does this look like a Cloudflare / WAF block page?

    Cloudflare and other WAFs put their challenge markup at the very top
    of the response (in the ``<title>`` and the first few KB of body), so
    we only scan the first 4 KB. This avoids false positives from real
    article pages that legitimately contain phrases like "access denied"
    or "attention required" in the body text (e.g. a news story about an
    access-denied court ruling, or a how-to with a section titled
    "attention required").

    The strong Cloudflare-specific phrases ("just a moment",
    "checking your browser", "cf-error") are extremely unlikely to appear
    in real prose, so even within the 4 KB window they are safe signals.
    The broader phrases ("attention required", "access denied") only fire
    inside the same window. False positives are still cheap (we retry
    through ScrapingBee or surface a friendly error).
    """
    if not html:
        return False
    snippet = html[:4000].lower()
    return (
        "just a moment" in snippet
        or "checking your browser" in snippet
        or "cf-error" in snippet
        or "attention required" in snippet
        or "access denied" in snippet
    )


def fetch_and_extract(url: str) -> tuple[str, str | None]:
    """Fetch a URL and return (article_text, title).

    Attempt 1: direct fetch with curl_cffi (Chrome TLS fingerprint).
    Attempt 2: if direct fetch is blocked AND ScrapingBee is configured, retry
               through ScrapingBee without JS rendering.
    Attempt 3: if that still does not yield a readable article AND ScrapingBee
               is configured, retry once more with render_js=true (more credits
               but defeats JS challenges).
    """
    if not _robots_allows(url):
        raise ScrapeError(
            "This site's robots.txt does not allow our reader. "
            "Copy the article text and paste it here instead."
        )

    html: str | None = None
    direct_error: ScrapeError | None = None
    ssrf_refused = False

    # Attempt 1: direct fetch.
    try:
        html = _direct_fetch(url)
        if _is_block_signal(html):
            html = None
            direct_error = ScrapeError(
                "This site is showing us a bot-check page instead of the article."
            )
    except _SSRFRefused as exc:
        # Hard refusal. Do NOT forward this URL to any other fetcher; that
        # would defeat the SSRF validator. Surface the refusal and stop.
        direct_error = exc
        html = None
        ssrf_refused = True
    except ScrapeError as exc:
        direct_error = exc
        html = None

    # Attempt 2: ScrapingBee without JS rendering. Skipped on SSRF refusal.
    if html is None and not ssrf_refused:
        try:
            html = _scrapingbee_fetch(url, render_js=False)
            if html and _is_block_signal(html):
                html = None
        except _SSRFRefused as exc:
            # Belt-and-braces refusal from the ScrapingBee helper itself.
            direct_error = exc
            html = None
            ssrf_refused = True
        except ScrapeError as exc:
            # Preserve the most informative error. Only overwrite when
            # attempt 2 produced a different message; otherwise keep what we
            # already had from attempt 1.
            if direct_error is None or str(exc) != str(direct_error):
                # Prefer the new error only if attempt 1 hadn't given us one.
                if direct_error is None:
                    direct_error = exc
            html = None

    # Attempt 3: ScrapingBee with JS rendering. Skipped on SSRF refusal.
    if (
        html is None
        and not ssrf_refused
        and settings.scrapingbee_api_key
    ):
        try:
            html = _scrapingbee_fetch(url, render_js=True)
            if html and _is_block_signal(html):
                html = None
        except _SSRFRefused as exc:
            direct_error = exc
            html = None
            ssrf_refused = True
        except ScrapeError as exc:
            if direct_error is None or str(exc) != str(direct_error):
                if direct_error is None:
                    direct_error = exc
            html = None

    if html is None:
        # Surface the most informative error we collected.
        raise direct_error or ScrapeError(
            "We could not load this article. Please paste the text directly."
        )

    # Single-pass extract + metadata. trafilatura.bare_extraction parses the
    # HTML once and returns both, instead of calling .extract and
    # .extract_metadata back to back which would parse twice.
    bare = trafilatura.bare_extraction(
        html,
        include_comments=False,
        include_tables=False,
        favor_recall=True,
        with_metadata=True,
    )
    extracted = ""
    title: str | None = None
    if bare is not None:
        # trafilatura returns either a Document object (newer versions)
        # with `.text` / `.title` attrs, or a dict (older). Handle both.
        if hasattr(bare, "text"):
            extracted = (getattr(bare, "text", None) or "").strip()
            title = getattr(bare, "title", None)
        elif isinstance(bare, dict):
            extracted = (bare.get("text") or "").strip()
            title = bare.get("title")

    if not extracted or len(extracted) < MIN_EXTRACTED_CHARS:
        raise ScrapeError(
            "Could not pull readable article text from this page. "
            "It may be too short or behind a paywall."
        )

    return extracted, title
