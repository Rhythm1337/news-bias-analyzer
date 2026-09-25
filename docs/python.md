# Python patterns used in this codebase

This document is for someone with basic Python who wants to actually
understand what they are reading in this project. It walks the patterns we
use, easiest to most advanced. Each section follows the same shape:

1. What the pattern is, in plain English.
2. A tiny standalone example.
3. Where we use it in this codebase, with a `file:line` pointer.

You do not have to read this in order; the table of contents below is
linear-friendly but each section stands on its own.

Conventions:

- `file:line` references are relative to the repo root. Open the file at the
  given line to see the pattern in context.
- Code examples in this doc are deliberately tiny so you can run them in a
  REPL and see what happens.

---

## Contents

1. Type hints
2. f-strings
3. Custom exceptions
4. Context managers (the `with` statement)
5. Decorators
6. Pydantic `BaseModel`
7. Abstract Base Classes (ABCs)
8. Module-level state
9. List comprehensions and generator expressions
10. Iteration with `enumerate`, `zip`, and `.items()`
11. `try` / `except` / `finally` and the `from exc` pattern
12. Standard library highlights we use
13. A note on `async`
14. A note on imports

---

## 1. Type hints

### What it is

Python is a dynamically typed language: you can put any value in any variable
at any time. Type hints are an OPTIONAL annotation that says "I expect this
variable to hold values of this type". Python itself does not enforce them at
runtime; they are documentation that tools (type checkers like mypy or
pyright, IDE autocompletion, FastAPI, Pydantic) can use.

Common shapes:

| Hint | Means |
| --- | --- |
| `x: int` | x is an integer |
| `name: str` | name is a string |
| `tags: list[str]` | tags is a list of strings |
| `counts: dict[str, int]` | counts maps string keys to int values |
| `pair: tuple[int, int]` | pair is a 2-tuple of ints |
| `value: str \| None` | value is either a string or None |
| `mode: Literal["a", "b"]` | mode is one of those two exact strings |

The `\|` form (`str | None`) is the modern Python 3.10+ way of writing an
optional value. The older `Optional[str]` from `typing` means the same thing.

### Tiny example

```python
from typing import Literal

def greet(name: str, times: int = 1) -> str:
    return ("Hello, " + name + "! ") * times

def axis() -> Literal["x", "y", "z"]:
    return "x"
```

The `-> str` is the return type. `times: int = 1` says "an int with default 1".

### Where in our code

`backend/app/ai/base.py:40-93` defines the analysis result models. Every field
has a type hint, and Pydantic uses those hints to validate JSON coming back
from Gemini. Notice the heavy use of `Literal`:

```python
class PoliticalBias(BaseModel):
    label: Literal["left", "center-left", "center", "center-right", "right", "unclear"]
    score: float
```

(`backend/app/ai/base.py:40-45`)

`Literal[...]` says "the label must be EXACTLY one of these strings". If
Gemini returns `"libertarian"`, Pydantic raises a validation error and we
catch it.

Other examples in our code:

- `def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool`
  (`backend/app/security/url_validation.py:38`): the parameter is one of two
  IP types and the return is a bool.
- `def _decode_with_cap(content: bytes, encoding: str | None) -> str`
  (`backend/app/scraping/extract.py:107`): an optional string parameter.
- `def fetch_and_extract(url: str) -> tuple[str, str | None]`
  (`backend/app/scraping/extract.py:409`): returns a 2-tuple where the first
  element is always a string and the second is either a string or None.
- `_robots_cache: dict[str, tuple[float, RobotFileParser]] = {}`
  (`backend/app/scraping/extract.py:72`): a dict mapping strings to
  `(float, RobotFileParser)` tuples, starts empty.

Why bother? Two payoffs:

1. The IDE catches mistakes before you run the code. `validate_url(123)` will
   light up red because 123 is not a string.
2. Pydantic and FastAPI use the hints to auto-generate JSON validation and
   API docs. We get those for free just by writing the hint.

---

## 2. f-strings

### What it is

f-strings are Python's modern string formatting. You prefix a string with
`f` and put expressions inside `{}`:

```python
name = "Isaac"
age = 21
print(f"Hello, {name}, age {age}.")
# Hello, Isaac, age 21.
```

Anything inside the braces is a real Python expression: `f"{x + 1}"`,
`f"{user.name}"`, `f"{sorted(items)}"`.

There are also format specifiers after a colon:

| Spec | Means | Example |
| --- | --- | --- |
| `{x:,}` | thousands separator | `f"{1234567:,}"` -> `"1,234,567"` |
| `{x:.2f}` | float, 2 decimals | `f"{3.14159:.2f}"` -> `"3.14"` |
| `{x!r}` | repr (with quotes) | `f"{'hi'!r}"` -> `"'hi'"` |
| `{x!s}` | str (default) | same as `f"{x}"` |

### Tiny example

```python
items = 7
size = 1234567
print(f"Got {items} items, total {size:,} bytes.")
# Got 7 items, total 1,234,567 bytes.
```

### Where in our code

User-facing error messages use f-strings to embed context safely:

```python
raise UnsafeURLError(
    f"Only http and https URLs are allowed (you sent '{parsed.scheme}')."
)
```

(`backend/app/security/url_validation.py:54`)

```python
raise HTTPException(
    status_code=422,
    detail=f"Article text must be {MAX_TEXT_CHARS:,} characters or less. Please trim the text.",
)
```

(`backend/app/routes/analyze.py:67-70`)

The `:,` formats `20000` as `"20,000"`, which reads better in an error.

Another (`backend/app/routes/analyze.py:75-79`):

```python
detail=(
    f"Deep analysis only works with articles up to {MAX_DEEP_CHARS:,} characters "
    f"(about 1,500 words). Your article is {len(article_text):,} characters. "
    "Please turn off deep mode or shorten the text."
)
```

Notice you can chain f-strings and plain strings in the same parenthesized
expression. Python concatenates adjacent string literals at compile time.

The `{!r}` form is useful when you want quotes around a value to disambiguate
empty / whitespace strings, although we lean on plain `'{x}'` quoting in this
codebase. Both work.

---

## 3. Custom exceptions

### What it is

Python's `Exception` is a regular class. To make your own, just subclass it:

```python
class MyError(Exception):
    pass
```

You can raise it like any built-in: `raise MyError("something broke")`. You
can catch it specifically: `except MyError: ...`. And you can subclass YOUR
exception to make a more specific child:

```python
class NetworkError(MyError):
    pass
```

`except MyError` will catch BOTH `MyError` and `NetworkError`. `except
NetworkError` will only catch the network kind. This lets callers be as
specific or as broad as they need.

### Tiny example

```python
class NotFound(Exception):
    pass

class TooBig(Exception):
    pass

def fetch(name):
    if name == "missing":
        raise NotFound(f"no record for {name}")
    if name == "huge":
        raise TooBig(f"{name} is too large")
    return name

try:
    fetch("missing")
except NotFound as e:
    print("specific:", e)
except Exception as e:
    print("generic:", e)
```

### Where in our code

We have a small two-tier hierarchy in the scraper:

```python
class ScrapeError(Exception):
    pass


class _SSRFRefused(ScrapeError):
    """Raised when a fetch attempt was aborted because the URL ... failed
    SSRF validation. Callers must NOT retry the same URL through a
    different fetcher ..."""
    is_ssrf = True
```

(`backend/app/scraping/extract.py:81-92`)

`_SSRFRefused` IS a `ScrapeError`, so `except ScrapeError` catches it. But
the orchestrator deliberately catches `_SSRFRefused` FIRST so it can react
differently:

```python
except _SSRFRefused as exc:
    direct_error = exc
    html = None
    ssrf_refused = True
except ScrapeError as exc:
    direct_error = exc
    html = None
```

(`backend/app/scraping/extract.py:437-445`)

The order matters. `_SSRFRefused` is more specific, so it goes first; if you
flip them, the broader `except ScrapeError` would scoop up the SSRF refusal
and the `ssrf_refused` flag would never get set, allowing the URL to be
forwarded to ScrapingBee. That would defeat the SSRF gate. The exception
hierarchy lets us write the SAFE behavior cleanly.

`UnsafeURLError` (`backend/app/security/url_validation.py:34`) subclasses
`ValueError`, not `Exception` directly. Subclassing the most accurate stdlib
parent is conventional: `ValueError` already means "the value you gave me is
not acceptable", which fits.

---

## 4. Context managers (the `with` statement)

### What it is

A context manager is a thing you can use with `with`. The block inside `with`
runs, and the manager guarantees cleanup happens at the end, EVEN IF an
exception is raised:

```python
with open("file.txt") as f:
    data = f.read()
# f is closed here, automatically, even if read() raised.
```

Without `with`, you would write:

```python
f = open("file.txt")
try:
    data = f.read()
finally:
    f.close()
```

The `with` form is shorter and harder to get wrong. Anything that "needs
cleanup" usually supports it: files, network sockets, database connections,
HTTP clients, locks.

### Tiny example

```python
import contextlib

@contextlib.contextmanager
def loud():
    print("opening")
    try:
        yield "the value"
    finally:
        print("closing")

with loud() as v:
    print("inside, got", v)
# opening
# inside, got the value
# closing
```

### Where in our code

The robots.txt fetcher uses `with httpx.Client(...) as client` to make sure
the client gets closed:

```python
with httpx.Client(
    headers=DEFAULT_HEADERS,
    timeout=ROBOTS_TIMEOUT,
    follow_redirects=False,
) as client:
    for _ in range(ROBOTS_MAX_REDIRECTS + 1):
        ...
        with client.stream("GET", url) as response:
            ...
```

(`backend/app/scraping/extract.py:302-324`)

Two nested `with` blocks: the outer one owns the connection pool, the inner
one owns a single streamed response. Both close cleanly even if the request
loop raises midway.

Why it matters: HTTP clients hold open TCP sockets. Leaking them eventually
exhausts file descriptors, which manifests as cryptic "too many open files"
crashes long after the original mistake. `with` blocks make the leak
impossible.

We also use a try/finally explicitly in `_direct_fetch` because the
`curl_cffi.Session` is created with arguments and we want fine-grained
control over when the response closes:

```python
session = ccurl.Session(...)
try:
    for _ in range(MAX_REDIRECTS + 1):
        ...
        response = session.get(url, allow_redirects=False, stream=True)
        try:
            ...
        finally:
            response.close()
    ...
finally:
    session.close()
```

(`backend/app/scraping/extract.py:157-215`)

Same idea, just spelled out by hand because the API does not expose a context
manager directly.

---

## 5. Decorators

### What it is, mechanically

A decorator is a function that takes a function and returns a (usually
modified) function. The `@` syntax is sugar:

```python
@my_decorator
def foo():
    pass
```

is the same as:

```python
def foo():
    pass

foo = my_decorator(foo)
```

So `@my_decorator` runs once, at definition time, and the name `foo` ends up
bound to whatever `my_decorator` returned.

Decorators can do anything: log calls, enforce permissions, register the
function in a routing table, cache results, validate input.

### Tiny example

```python
def shouty(fn):
    def wrapper(*args, **kwargs):
        result = fn(*args, **kwargs)
        return result.upper()
    return wrapper

@shouty
def greet(name):
    return f"hi {name}"

print(greet("isaac"))  # HI ISAAC
```

`shouty` returns `wrapper`, so `greet` IS `wrapper`. Calling `greet("isaac")`
calls `wrapper`, which calls the original function and modifies the result.

Decorators with arguments (like `@app.get("/path")`) are one level deeper:
the thing after `@` is `app.get("/path")`, which is itself a function that
takes a function. So `app.get("/path")` returns a decorator that returns a
modified function.

### Where in our code

We use four kinds of decorators:

#### 5a. FastAPI route decorators

```python
@router.post("/analyze", response_model=AnalyzeResponse)
@limiter.limit("20/minute")
def analyze(request: Request, req: AnalyzeRequest) -> AnalyzeResponse:
    ...
```

(`backend/app/routes/analyze.py:49-51`)

`@router.post("/analyze", ...)` registers `analyze` as the handler for
`POST /analyze` and tells FastAPI to validate the response against
`AnalyzeResponse`. `@limiter.limit("20/minute")` (from slowapi) adds rate
limiting on top.

Note the order: decorators apply bottom-up, so `limiter.limit` wraps `analyze`
first, then `router.post` registers the wrapped function. This means the
rate limit runs BEFORE the route handler executes, which is what we want.

#### 5b. Pydantic `model_validator`

```python
class AnalyzeRequest(BaseModel):
    url: str | None = None
    text: str | None = None
    deep: bool = False

    @model_validator(mode="after")
    def exactly_one(self) -> "AnalyzeRequest":
        url = (self.url or "").strip()
        text = self.text or ""
        if bool(url) == bool(text):
            raise ValueError("Please send either a URL or article text, not both.")
        self.url = url or None
        return self
```

(`backend/app/routes/analyze.py:22-34`)

`mode="after"` means "run after Pydantic has validated each field
individually". The method gets the fully-built model and can do cross-field
checks. Here we enforce "exactly one of url and text". If both are set, or
neither, we raise.

A second example, on the analysis result:

```python
@model_validator(mode="after")
def _post_validate(self) -> "AnalysisResult":
    self.fake_likelihood = max(0.0, min(1.0, self.fake_likelihood))
    ...
```

(`backend/app/ai/base.py:115-119`)

This one clamps the AI's numeric outputs into valid ranges and fixes up
sub-metric ordering.

#### 5c. `@abstractmethod`

Inside an abstract base class (see section 7), `@abstractmethod` marks a
method that subclasses MUST override:

```python
class AIProvider(ABC):
    @abstractmethod
    def analyze(
        self, article_text: str, deep: bool = False
    ) -> tuple[AnalysisResult, str]:
        ...
```

(`backend/app/ai/base.py:305-318`)

If a subclass forgets to implement `analyze`, Python refuses to instantiate
the subclass at all.

#### 5d. `@lru_cache(maxsize=1)`

`functools.lru_cache` caches a function's return value. With `maxsize=1` and
no arguments to vary on, it effectively turns the function into a singleton:

```python
@lru_cache(maxsize=1)
def get_provider() -> AIProvider:
    name = settings.ai_provider.lower()
    if name == "gemini":
        from app.ai.gemini import GeminiProvider
        return GeminiProvider()
    raise ValueError(f"Unknown AI_PROVIDER: {settings.ai_provider}")
```

(`backend/app/ai/__init__.py:7-14`)

The first call constructs `GeminiProvider()`. Every subsequent call returns
the cached instance. This avoids re-creating the Gemini client (which holds
HTTP state) on every request.

---

## 6. Pydantic `BaseModel`

### What it is

Pydantic is a library for "declarative data classes". You write a class with
type-annotated fields, and Pydantic gives you:

- JSON parsing (`Model.model_validate_json('{"x": 1}')`).
- Validation (raises `ValidationError` if the JSON does not fit).
- Default values, including factory defaults.
- Custom validators.
- A nice `.model_dump()` to serialize back to dict / JSON.

### Tiny example

```python
from pydantic import BaseModel, Field

class User(BaseModel):
    name: str
    age: int = 0
    tags: list[str] = Field(default_factory=list)

u = User.model_validate_json('{"name": "Isaac", "age": 21}')
print(u.tags)        # []
u.tags.append("dev")
print(u.model_dump()) # {"name": "Isaac", "age": 21, "tags": ["dev"]}
```

`Field(default_factory=list)` is the right way to default a mutable value
(list, dict, set) in a class. Writing `tags: list[str] = []` would
historically share ONE list across all instances (a classic Python gotcha).
Pydantic actually prevents that, but the factory form is the convention
across both Pydantic and dataclasses, so use it.

### Where in our code

The whole API request / response surface is Pydantic models.

#### Request and response

```python
class AnalyzeRequest(BaseModel):
    url: str | None = None
    text: str | None = None
    deep: bool = False
    ...
```

(`backend/app/routes/analyze.py:22-34`)

```python
class AnalyzeResponse(BaseModel):
    source_url: str | None = None
    title: str | None = None
    article_chars: int = Field(description="Length of the analyzed article text")
    article_text: str | None = Field(
        default=None,
        description="Echoed article body, populated only when deep mode is on.",
    )
    deep: bool = False
    analysis: AnalysisResult
```

(`backend/app/routes/analyze.py:37-46`)

`Field(description=...)` adds metadata that shows up in the auto-generated
OpenAPI docs. `default=None` sets the default; the field is therefore
optional in JSON.

#### Nested models

`AnalysisResult` (`backend/app/ai/base.py:95-113`) contains nested models
(`PoliticalBias`, `EmotionalTone`, `Highlight`, etc.). When you parse JSON
into `AnalysisResult`, Pydantic recursively parses each nested object.

```python
analysis: AnalysisResult
```

inside `AnalyzeResponse` means the response includes the full nested tree.

#### `default_factory` for lists

```python
red_flags: list[str] = Field(default_factory=list)
sub_bias: list[SubMetric] = Field(default_factory=list)
```

(`backend/app/ai/base.py:102-113`)

If Gemini omits these arrays, Pydantic gives us empty lists instead of
`None`. The downstream code can always do `for flag in result.red_flags`
without worrying about `None`.

#### Why we lean on it

Pydantic gives us BOTH the request validation (you cannot post garbage at
`/analyze`) AND the response validation (Gemini cannot return garbage; the
schema enforcement combined with `_post_validate` catches and clamps every
weirdness).

The Pydantic model also doubles as the structured-output schema we hand to
Gemini:

```python
config=types.GenerateContentConfig(
    ...
    response_schema=AnalysisResult,
)
```

(`backend/app/ai/gemini.py:35-38`)

So one declaration drives validation, schema, AND OpenAPI docs.

---

## 7. Abstract Base Classes (ABCs)

### What it is

An "interface" in the Java sense: a class that does not implement anything
itself, but specifies methods that subclasses MUST implement. Python's
`abc` module provides:

```python
from abc import ABC, abstractmethod

class Animal(ABC):
    @abstractmethod
    def speak(self) -> str:
        ...
```

Trying to do `Animal()` raises `TypeError: Can't instantiate abstract class`.
A subclass must override `speak`:

```python
class Dog(Animal):
    def speak(self) -> str:
        return "woof"

Dog().speak()  # works
```

### Why use ABCs

Two reasons:

1. **Forced contracts**: if you extend the base, you cannot forget to
   implement a method. Forgetting fails LOUDLY at instantiation, not in
   production when the missing method gets called.
2. **Pluggable backends**: define the interface once, write multiple
   implementations, swap them via config.

### Where in our code

`AIProvider` is the abstract base; `GeminiProvider` is the implementation:

```python
class AIProvider(ABC):
    @abstractmethod
    def analyze(
        self, article_text: str, deep: bool = False
    ) -> tuple[AnalysisResult, str]:
        ...
```

(`backend/app/ai/base.py:305-318`)

```python
class GeminiProvider(AIProvider):
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise RuntimeError("The Gemini API key is not set on the server.")
        self._client = genai.Client(...)

    def analyze(
        self, article_text: str, deep: bool = False
    ) -> tuple[AnalysisResult, str]:
        ...
```

(`backend/app/ai/gemini.py:18-112`)

The factory function picks an implementation by name:

```python
@lru_cache(maxsize=1)
def get_provider() -> AIProvider:
    name = settings.ai_provider.lower()
    if name == "gemini":
        from app.ai.gemini import GeminiProvider
        return GeminiProvider()
    raise ValueError(f"Unknown AI_PROVIDER: {settings.ai_provider}")
```

(`backend/app/ai/__init__.py:7-14`)

The route code (`backend/app/routes/analyze.py:83-84`) only knows about
`AIProvider`:

```python
provider = get_provider()
analysis, sanitized = provider.analyze(article_text, deep=req.deep)
```

If we ever add `OpenAIProvider`, the route does not change. That is the win.

---

## 8. Module-level state

### What it is

Variables defined at the top level of a module live as long as the module is
imported. They are effectively process-global. You can use them as caches,
counters, registries, or singletons.

```python
# my_module.py
_counter = 0

def increment():
    global _counter  # without `global`, the assignment makes a local
    _counter += 1
    return _counter
```

The `global` keyword tells Python "the name `_counter` refers to the
module-level binding, not a new local variable". You only need `global` when
you ASSIGN; pure reads work without it.

### Where in our code

#### A cache

```python
# Cache: key is "scheme://host", value is (expires_at_unix, parser).
_robots_cache: dict[str, tuple[float, RobotFileParser]] = {}
```

(`backend/app/scraping/extract.py:69-72`)

This dict starts empty when the process boots. `_robots_allows`
(`backend/app/scraping/extract.py:346-385`) fills it as it learns robots.txt
policies, with a one-hour TTL embedded in the value.

#### A flag

```python
_xff_short_chain_warned = False
```

(`backend/app/rate_limit.py:30`)

Used inside `_real_ip` (`backend/app/rate_limit.py:33-75`) to log a warning
exactly once instead of once per request:

```python
global _xff_short_chain_warned
...
if not _xff_short_chain_warned:
    _xff_short_chain_warned = True
    logger.warning(...)
```

(`backend/app/rate_limit.py:52-74`)

#### A singleton instance

```python
limiter = Limiter(
    key_func=_real_ip,
    default_limits=["60/minute"],
)
```

(`backend/app/rate_limit.py:78-81`)

`limiter` is constructed once when the module is first imported and reused
forever. Other modules import it (`from app.rate_limit import limiter`) and
get the same object.

### Caveats

Module-level state is per-process. If you run multiple worker processes (as
many production deployments do), each has its own copy. That is fine for the
robots cache (each worker pays a one-fetch cost on first encounter, then
caches), but it is the reason the rate limiter would degrade with multiple
instances: each instance has its own counter, so the effective limit is N
times larger.

If you ever need shared state across processes, you graduate to Redis,
Postgres, or memcached. The module-level dict is for the same-process case.

---

## 9. List comprehensions and generator expressions

### What it is

A list comprehension is a one-line way to build a list:

```python
squares = [x * x for x in range(5)]
# [0, 1, 4, 9, 16]

evens = [x for x in range(10) if x % 2 == 0]
# [0, 2, 4, 6, 8]
```

Same shape as a `for` loop, but inside `[...]`. Faster than `append`-in-a-loop
and easier to read once you are used to it.

A generator expression looks the same but with `(...)` instead of `[...]`,
and produces values lazily one at a time instead of materializing a list:

```python
total = sum(x * x for x in range(5))  # generator inside sum()
```

There are also dict comprehensions and set comprehensions:

```python
{k: v for k, v in pairs}      # dict
{x for x in items if x > 0}   # set
```

### Where in our code

The XFF parser is a list comprehension:

```python
parts = [p.strip() for p in xff.split(",") if p.strip()]
```

(`backend/app/rate_limit.py:57`)

Reads as: take each comma-separated chunk, strip whitespace, and keep it only
if it is non-empty. Three operations in one line; the equivalent loop would
be 5 lines.

The CORS origin parser is similar:

```python
return [o.strip() for o in self.cors_origin.split(",") if o.strip()]
```

(`backend/app/config.py:41`)

The sentiment-series clamping uses one too:

```python
clamped = [max(-1.0, min(1.0, v)) for v in self.sentiment_series]
```

(`backend/app/ai/base.py:219`)

For each value `v`, force it into `[-1.0, 1.0]`. Build a new list.

Entity rebuilding (`backend/app/ai/base.py:233-236`):

```python
self.entities = [
    Entity(name=e.name, type=e.type, mentions=max(1, e.mentions))
    for e in self.entities
]
```

Rewrite each entity with `mentions` floored at 1.

When you DON'T want a list (you just need to iterate or aggregate), use a
generator. We do not lean on this much in this codebase, but `sum(len(p) for
p in parts)` is a common shape elsewhere.

---

## 10. Iteration with `enumerate`, `zip`, and `.items()`

### What they are

- `for i, x in enumerate(lst):` gives you index AND value.
- `for a, b in zip(xs, ys):` walks two iterables in lockstep.
- `for k, v in d.items():` walks a dict's key-value pairs.

```python
for i, fruit in enumerate(["apple", "pear"]):
    print(i, fruit)
# 0 apple
# 1 pear

for letter, num in zip("abc", [1, 2, 3]):
    print(letter, num)
# a 1
# b 2
# c 3

for k, v in {"x": 1, "y": 2}.items():
    print(k, v)
```

### Where in our code

`for k, v in d.items()` in the post-validator:

```python
for field_name, expected in EXPECTED_KEYS.items():
    current: list[SubMetric] = getattr(self, field_name) or []
    ...
```

(`backend/app/ai/base.py:125-126`)

`EXPECTED_KEYS` is a dict mapping a field name to its expected sub-metric
keys. We iterate the pairs to enforce ordering on each field.

We do not use `enumerate` heavily in the current code (most of our loops do
not need an index). When we DO need a discard-loop counter (the redirect
counter, for instance), we use `for _ in range(MAX_REDIRECTS + 1):`
(`backend/app/scraping/extract.py:163`). The underscore says "I am not
using this value", which is a Python convention.

`zip` is similarly rare here; the typical use case is lining up two parallel
arrays, and our data is mostly already shaped as a list of objects.

The dict-iteration pattern is the load-bearing one in this codebase, and it
shows up wherever we have a config-mapping shape.

---

## 11. `try` / `except` / `finally` and the `from exc` pattern

### What they are

- `try` wraps code that might raise.
- `except` catches a class of exception.
- `finally` runs no matter what (success, exception caught, exception
  re-raised). Use it for cleanup that `with` does not handle for you.
- `raise NewError(...) from exc` chains the new exception to the original
  one.

The `from exc` part matters. Without it:

```python
try:
    do_thing()
except KeyError as e:
    raise RuntimeError("config missing")  # original KeyError lost
```

The traceback shows `RuntimeError`, but the underlying `KeyError` (which
told you WHICH key was missing) is suppressed in some contexts.

With `from exc`:

```python
try:
    do_thing()
except KeyError as e:
    raise RuntimeError("config missing") from e
```

The traceback shows BOTH:

```
KeyError: 'GEMINI_API_KEY'

The above exception was the direct cause of the following exception:

RuntimeError: config missing
```

You preserve debugging information while presenting a friendlier error to
the layer above.

### Where in our code

The SSRF validator chains the DNS error to a friendly message:

```python
try:
    infos = socket.getaddrinfo(host, port)
except socket.gaierror as exc:
    raise UnsafeURLError(
        f"Could not resolve hostname '{host}'. Please check that the URL is correct."
    ) from exc
```

(`backend/app/security/url_validation.py:73-81`)

The user sees "Could not resolve hostname". The developer reading logs sees
the underlying `gaierror` chained beneath.

The Gemini provider does it for invalid JSON:

```python
try:
    result = AnalysisResult.model_validate_json(text)
except ValidationError as exc:
    log.warning("Gemini response failed JSON validation: %s", exc)
    raise RuntimeError(
        "The AI returned invalid JSON. Please try again."
    ) from exc
```

(`backend/app/ai/gemini.py:80-86`)

The route layer does the inverse: it catches `RuntimeError` from the provider
and translates to an `HTTPException`:

```python
try:
    provider = get_provider()
    analysis, sanitized = provider.analyze(article_text, deep=req.deep)
except RuntimeError as exc:
    log.warning("AI provider rejected request: %s", exc)
    raise HTTPException(status_code=502, detail=str(exc)) from exc
```

(`backend/app/routes/analyze.py:82-88`)

`finally` for cleanup:

```python
session = ccurl.Session(...)
try:
    for _ in range(MAX_REDIRECTS + 1):
        ...
finally:
    session.close()
```

(`backend/app/scraping/extract.py:157-215`)

If anything inside the loop raises, `session.close()` still runs.

---

## 12. Standard library highlights we use

These are all part of Python with no `pip install` needed.

### `urllib.parse.urlparse`

Splits a URL into its parts: scheme, netloc (host:port), path, params,
query, fragment. Plus convenience attributes `hostname` and `port`.

```python
parsed = urlparse(url)
parsed.scheme    # "https"
parsed.hostname  # "example.com"
parsed.port      # None or an int
```

We use it everywhere we touch URLs:

- `backend/app/security/url_validation.py:51`
- `backend/app/scraping/extract.py:186`, `backend/app/scraping/extract.py:322`,
  `backend/app/scraping/extract.py:352`

### `urllib.parse.urljoin`

Resolves a relative URL against a base, the way browsers do:

```python
urljoin("https://example.com/path/", "../other")
# "https://example.com/other"
```

Used to resolve `Location:` redirect headers:

- `backend/app/scraping/extract.py:183`,
  `backend/app/scraping/extract.py:321`

### `urllib.robotparser.RobotFileParser`

Standard-library robots.txt parser. We use `parser.parse(lines)` to feed it
text and `parser.can_fetch(user_agent, url)` to ask "are we allowed?".

- `backend/app/scraping/extract.py:5`,
  `backend/app/scraping/extract.py:378-385`

### `socket.getaddrinfo`

Resolves a hostname to one or more (family, type, proto, canonname, sockaddr)
tuples. Returns ALL addresses for a host, which is the property we rely on
for SSRF defense.

- `backend/app/security/url_validation.py:74`

### `ipaddress`

Parses and classifies IP addresses. `ipaddress.ip_address("10.0.0.1")`
returns an `IPv4Address`; `ipaddress.ip_address("::1")` returns an
`IPv6Address`. Both have boolean properties (`is_private`, `is_loopback`,
etc.) that handle every edge case correctly.

- `backend/app/security/url_validation.py:38-46`,
  `backend/app/security/url_validation.py:62-94`

### `unicodedata.normalize`

Normalizes Unicode strings. We use NFKC ("compatibility decomposition then
composition") to fold lookalike characters into a canonical form.

- `backend/app/security/prompt_defense.py:157`

### `re` (regular expressions)

Standard regex library. We use `re.sub` to redact API keys before logging:

```python
return re.sub(r"api_key=[^&\s]+", "api_key=REDACTED", text)
```

(`backend/app/scraping/extract.py:99`)

`r"..."` is a raw string literal: backslashes are not interpreted as escapes.
Useful in regex because regex itself uses backslashes.

### `difflib.SequenceMatcher`

Computes the similarity between two strings on a 0..1 scale.
`SequenceMatcher(None, "hello", "hallo").ratio()` returns about 0.8. We use
it to fuzzy-match Gemini's substituted sub-metric keys against our expected
ones:

```python
char_ratio = SequenceMatcher(None, item_key, exp_lower).ratio()
```

(`backend/app/ai/base.py:177`)

### `functools.lru_cache`

Memoizes a function's return value, with an optional `maxsize`. For the
no-arg singleton case, `maxsize=1` is the idiom:

- `backend/app/ai/__init__.py:7`

### `time.time`

Returns the current Unix timestamp as a float. We use it for the robots
cache TTL:

```python
now = time.time()
cached = _robots_cache.get(host_key)
if cached and cached[0] > now:
    ...
```

(`backend/app/scraping/extract.py:359-362`)

Each cached entry stores `(expires_at, parser)`; we keep it only while
`expires_at > now`.

### `logging`

Module-level loggers, named after the module:

```python
logger = logging.getLogger(__name__)
```

(`backend/app/scraping/extract.py:18`)

`__name__` is automatically `"app.scraping.extract"` here. The convention
makes it trivial to tune log levels per module from a single config.

We use `logger.warning(...)` for things that look wrong but are not fatal,
and `log.exception(...)` (`backend/app/routes/analyze.py:99`) when we want
the traceback included.

---

## 13. A note on `async`

FastAPI supports both synchronous (`def`) and asynchronous (`async def`)
endpoint handlers. Our handlers are sync:

```python
@router.post("/analyze", response_model=AnalyzeResponse)
@limiter.limit("20/minute")
def analyze(request: Request, req: AnalyzeRequest) -> AnalyzeResponse:
    ...
```

(`backend/app/routes/analyze.py:49-51`)

Note `def`, not `async def`.

### Why sync is fine here

Async is useful when you have many concurrent I/O operations and you want to
overlap their wait time. A typical async win: a request that fetches three
upstream APIs in parallel using `asyncio.gather`.

Our `/analyze` handler does I/O (one HTTP fetch, one Gemini call) but they
are SEQUENTIAL: we cannot call Gemini until we have the article text. There
is nothing to overlap.

FastAPI runs sync handlers in a thread pool, which means concurrent requests
still process in parallel; only each individual request is sequential
internally. This is exactly what we want.

### When you would use async

Imagine if `/analyze` had to:

- Fetch the article from one URL.
- Fetch a fact-check API for the same URL.
- Fetch reading-level metadata.

All three could happen at once. With `async def`, you could `await
asyncio.gather(fetch_a(), fetch_b(), fetch_c())` and your handler would not
block on any single one. With `def`, you would either do them serially or
manage threads by hand.

If you ever introduce that kind of parallelism here, the migration is
mostly: switch the libraries to async-aware ones (e.g. `httpx.AsyncClient`),
mark the handler `async def`, and `await` the calls.

---

## 14. A note on imports

### The package layout

We use absolute imports rooted at `app.*`:

```python
from app.config import settings
from app.security.url_validation import (
    ALLOWED_SCHEMES,
    UnsafeURLError,
    validate_url,
)
```

(`backend/app/scraping/extract.py:11-16`)

The `app/` directory is a Python package (it has an `__init__.py`); each
subdirectory under it is also a package. Python finds `app` because the
project runs from `backend/`, which contains `app/`.

`from X import Y` says "load module X, then bind the name Y in the local
namespace to the attribute Y of X". You can rename on import (`from X import
Y as Z`), import multiple things at once (`from X import (Y, Z)`), or import
the module itself (`import X`, then refer to `X.Y`).

### The circular-import gotcha

Two modules cannot import each other if both run import-time code that needs
the other already loaded. Python's import machinery will give you a partially
loaded module and you will get `AttributeError` or `ImportError` at the
worst possible moment.

We have one place where this would happen, and we resolve it with a comment
and a duplicated constant:

```python
# Must match analyze.MIN_TEXT_CHARS. Importing from app.routes.analyze would
# create a circular import (analyze imports this module), so the constant is
# duplicated here. Update both together.
MIN_EXTRACTED_CHARS = 200
```

(`backend/app/scraping/extract.py:59-62`)

`backend/app/routes/analyze.py:14` defines `MIN_TEXT_CHARS = 200`. Both
constants must agree, and the comment is the contract that keeps them in
sync.

The cleaner alternatives:

- Put the constant in a third module that both import.
- Pass it in as a parameter.

We picked "duplicate with a comment" because the value is genuinely small
and we did not want a third file just for one number. That is a judgment
call; if the list of shared constants grows, refactor.

### Late imports inside functions

Sometimes you import inside a function instead of at the top of the file:

```python
@lru_cache(maxsize=1)
def get_provider() -> AIProvider:
    name = settings.ai_provider.lower()
    if name == "gemini":
        from app.ai.gemini import GeminiProvider
        return GeminiProvider()
    raise ValueError(f"Unknown AI_PROVIDER: {settings.ai_provider}")
```

(`backend/app/ai/__init__.py:8-14`)

Why: importing `GeminiProvider` at the top would force `google-genai` to load
even when the operator picked a different provider. Late import means we
only pay the import cost when we actually need the implementation. This
also helps avoid circular imports in some shapes.

Use late imports sparingly. Top-of-file imports are conventional for a
reason: they make it obvious what a module depends on. The late form is for
specific cases like the one above.

---

## Final word

Reading other people's code is the fastest way to learn a language. Skim the
files we cited, then come back here for the explanation when something looks
weird. Most of the patterns above are the SAME patterns you will see in any
mature Python codebase: f-strings for messages, Pydantic for data, ABCs for
swappable backends, decorators for routing and policy, comprehensions for
small transforms. Once you have seen them in action a few times, you start
writing them without thinking.
