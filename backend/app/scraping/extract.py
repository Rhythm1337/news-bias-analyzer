import httpx
import trafilatura

from app.security.url_validation import UnsafeURLError, validate_url

USER_AGENT = "Mozilla/5.0 (compatible; NewsBiasAnalyzer/0.1; +https://github.com/)"
FETCH_TIMEOUT = 15.0
MAX_REDIRECTS = 5
MAX_RESPONSE_BYTES = 5_000_000
MIN_EXTRACTED_CHARS = 200


class ScrapeError(Exception):
    pass


def _is_html_response(response: httpx.Response) -> bool:
    ctype = response.headers.get("content-type", "").lower()
    return "html" in ctype or "xml" in ctype or ctype == ""


def _read_bounded(response: httpx.Response) -> str:
    chunks: list[bytes] = []
    total = 0
    for chunk in response.iter_bytes():
        total += len(chunk)
        if total > MAX_RESPONSE_BYTES:
            raise ScrapeError("Response too large.")
        chunks.append(chunk)
    body = b"".join(chunks)
    return body.decode(response.encoding or "utf-8", errors="replace")


def _fetch_with_safe_redirects(url: str) -> str:
    """Fetch a URL, validating each redirect hop against SSRF rules."""
    with httpx.Client(
        headers={"User-Agent": USER_AGENT},
        timeout=FETCH_TIMEOUT,
        follow_redirects=False,
    ) as client:
        for _ in range(MAX_REDIRECTS + 1):
            try:
                validate_url(url)
            except UnsafeURLError as exc:
                raise ScrapeError(str(exc)) from exc

            with client.stream("GET", url) as response:
                if response.is_redirect:
                    next_url = response.headers.get("Location")
                    if not next_url:
                        raise ScrapeError("Redirect response missing Location header.")
                    url = str(httpx.URL(url).join(next_url))
                    continue

                response.raise_for_status()
                if not _is_html_response(response):
                    raise ScrapeError(
                        f"Refusing to parse non-HTML response (Content-Type: {response.headers.get('content-type')})."
                    )
                return _read_bounded(response)

    raise ScrapeError(f"Too many redirects (>{MAX_REDIRECTS}).")


def fetch_and_extract(url: str) -> tuple[str, str | None]:
    """Fetch a URL and return (article_text, title)."""
    try:
        html = _fetch_with_safe_redirects(url)
    except httpx.HTTPError as exc:
        raise ScrapeError(f"Failed to fetch URL: {exc}") from exc

    extracted = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=False,
        favor_recall=True,
    )
    if not extracted or len(extracted.strip()) < MIN_EXTRACTED_CHARS:
        raise ScrapeError("Could not extract a readable article from the page (too short or paywalled).")

    metadata = trafilatura.extract_metadata(html)
    title = metadata.title if metadata else None
    return extracted, title
