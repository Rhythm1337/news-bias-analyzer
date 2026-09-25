# Documentation

These files exist so the owner of this codebase (and anyone else cloning
it) can actually understand what it does and how each piece fits. The
audience for the deep dives is someone with **basic Python** who wants
to learn by reading working code.

## Read in this order

| # | File | What you'll get | Length |
|---|------|----------------|--------|
| 1 | [architecture.md](./architecture.md) | The 30,000-foot view: what the app does, the request flow end to end, what lives where, every env var. | ~420 lines |
| 2 | [python.md](./python.md) | A Python pattern guide. Each language feature used in the codebase explained with a tiny example, then a real call site. Read this before backend.md if Python feels new. | ~1,400 lines |
| 3 | [backend.md](./backend.md) | Module-by-module deep dive of the Python backend. Annotated code listings, "why we wrote it this way", and Python-concepts callouts. The longest doc; the meat. | ~1,900 lines |
| 4 | [security.md](./security.md) | Curriculum-style walkthrough of every security defense in the project (SSRF, prompt injection, rate limiting, bot fingerprinting). Useful for the course writeup. | ~775 lines |
| 5 | [ai-provider.md](./ai-provider.md) | The pluggable AI seam. How the `AIProvider` abstraction works and how to add a new model backend. | ~250 lines |
| 6 | [openshift-integration.md](./openshift-integration.md) | Hands-on plan for deploying a custom CPU-only model on `sandbox.redhat.com` and wiring it as a new provider. | ~440 lines |
| 7 | [frontend.md](./frontend.md) | Light overview of the Next.js frontend. Stack, routes, components, state, theming. Skim this. | ~150 lines |

## If you're here for one specific thing

- **"How does a request flow through the app?"** → [architecture.md](./architecture.md), section 3.
- **"How is the Python code structured? Why does it use `@decorators` and Pydantic and ABCs?"** → [backend.md](./backend.md), preamble + the relevant module's section. Cross-reference with [python.md](./python.md) for any pattern that's unfamiliar.
- **"What attacks does this defend against, and where in the code?"** → [security.md](./security.md), the section per attack class. Use the TL;DR table at the bottom for the writeup.
- **"How do I plug in a new AI model?"** → [ai-provider.md](./ai-provider.md). Skim the contract, then read [openshift-integration.md](./openshift-integration.md) for a concrete walkthrough.
- **"How do I get a model running on Red Hat sandbox and connect it here?"** → [openshift-integration.md](./openshift-integration.md). The provider stub at [`backend/app/ai/openshift_ai.py`](../backend/app/ai/openshift_ai.py) is the seam; the doc walks the deployment side.

## What's intentionally NOT in here

- **Frontend deep dive.** The owner asked for a basic-level frontend overview only; [frontend.md](./frontend.md) is the whole thing.
- **An auto-generated API reference.** FastAPI exposes `/docs` (Swagger UI) at runtime. That's the live reference.
- **A getting-started / installation guide.** That belongs in the top-level [`README.md`](../README.md). These docs assume you can already run the app locally.

## Maintaining these docs

Every claim in here is annotated with a `file:line` reference back to the
source. If you change the code, update the corresponding section in the
relevant doc (or grep for the file path you changed and update every hit).

Don't let a doc rot silently. A confidently wrong reference is worse than
no doc.
