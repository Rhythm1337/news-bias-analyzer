# OpenShift AI integration plan

This document explains how to plug a self-hosted model running on Red Hat's
OpenShift AI into the news-bias-analyzer backend. It is written for someone
who knows basic Python and has never touched Kubernetes before.

The goal is not "match Gemini quality on a free CPU sandbox" (you cannot).
The goal is to learn the integration pattern that real companies use:
container-based model serving, an inference URL, a typed provider class.

---

## A. What OpenShift AI is, in plain English

### OpenShift

OpenShift is Red Hat's distribution of Kubernetes. Kubernetes is the system
that schedules containers across a fleet of servers, restarts them when they
crash, gives them DNS names, and routes traffic to them. OpenShift adds a
web console, opinionated defaults, an integrated container registry, and a
proper user/auth story (OpenShift OAuth) on top. If you can deploy on
Kubernetes you can deploy on OpenShift; OpenShift just bundles the
sharp-edges-removed version.

### OpenShift AI

OpenShift AI is an add-on product (formerly called Red Hat OpenShift Data
Science, or RHODS) that ships pre-built tools for the data-science workflow:
JupyterLab notebooks ("workbenches"), pipelines, model registries, and
model serving. You do not have to install any of it manually; on the
Developer Sandbox it is already enabled. From your point of view it is the
"AI tab" of the OpenShift web console.

### KServe and model-serving

KServe is the open-source model-serving layer used by OpenShift AI. It runs
on Kubernetes and gives you one job: take a trained model from S3 (or
HuggingFace, or a local PVC), wrap it in a container that exposes a standard
HTTP inference API, and route traffic to it. You do not write that
container yourself. KServe ships ready-made "runtimes" (vLLM for LLMs, OVMS
for OpenVINO/CPU, Caikit for HuggingFace transformers, TGIS for
text-generation) and you just point one at your model files.

### ServingRuntime vs InferenceService

These are two Kubernetes objects you create. A `ServingRuntime` is a
template: "here is the container image and the protocol it speaks". An
`InferenceService` is the deployment: "use this runtime, load the model at
this S3 path, expose it at this URL". One ServingRuntime can back many
InferenceServices. In the OpenShift AI dashboard the runtime is a dropdown
and the InferenceService is the row in the "Models" table; you do not
usually edit the YAML by hand.

---

## B. What sandbox.redhat.com gives you

The Red Hat Developer Sandbox is a free OpenShift cluster shared between
many users, intended for learning. The relevant facts:

- **Free**, no credit card. Sign in with a Red Hat developer account.
- **30-day rolling lifetime.** Your namespace is wiped after 30 days. You
  can sign back up, but the URLs change. Plan re-deployments.
- **Resource caps.** Roughly 7 GB of RAM and a couple of CPU cores. No
  GPU. Pods that idle are scaled to zero, so the next request after a
  quiet period does a cold-start (30 to 60 seconds).
- **OpenShift AI enabled.** You get the AI dashboard, JupyterLab
  workbenches, and model-serving. Whether single-model serving (KServe
  standalone) or multi-model serving (ModelMesh) is enabled depends on
  the sandbox tier; check the "Model serving" page in the AI dashboard
  and use whichever you see.
- **No persistent storage beyond the sandbox lifetime.** PVCs vanish when
  the sandbox expires, and so do any models you uploaded to the in-cluster
  MinIO. Either re-upload from HuggingFace each time or keep an external
  S3 bucket.
- **No production traffic.** Sandbox routes are reachable from the public
  internet, but they are not designed to serve real users. Treat them as
  "demo URLs".
- **No real secret management.** You can store env vars and OpenShift
  Secrets, but rotate them aggressively. Anything you put in a sandbox is
  effectively public.

---

## C. Choosing a model that actually fits CPU-only

Be ruthless about size. The sandbox has roughly 7 GB of RAM total, and the
serving runtime itself eats some of it. Aim for a model that fits in 2 GB
of weights so the runtime has room to actually run.

| Model                            | RAM   | Latency (CPU) | Quality        | Notes                                                               |
|----------------------------------|-------|---------------|----------------|---------------------------------------------------------------------|
| DistilBERT bias classifier       | 0.3 GB | 0.5 to 2 s    | Decent on one axis | Single label out (e.g. left/center/right). No emotion or factuality. |
| Four small specialized BERTs     | 1 to 2 GB | 2 to 8 s      | Decent on each axis | Mimics our 4-axis output. Each one only knows its axis.              |
| FLAN-T5-small (60-80M)           | 0.3 GB | 1 to 3 s      | Low            | Instruction-tuned, can produce text. Output is short and rough.      |
| FLAN-T5-base (250M)              | 1 GB  | 3 to 8 s      | Low to medium  | Better completions, still well below Gemini.                         |
| TinyLlama 1.1B                   | 2.5 GB | 8 to 30 s     | Medium-low     | Real instruction-tuned LLM, slow. Risky on the sandbox RAM cap.      |
| Phi-3-mini, Llama 3.2 1B         | 3 to 5 GB | 15 to 60 s | Medium         | Aspirational. May OOM the sandbox; mention as a "later, on a paid cluster" target. |

### Recommendation

Start with **one DistilBERT-based classifier on the political axis only** as
a proof-of-concept. Specifically, models like
`bucketresearch/politicalBiasBERT` or any DistilBERT fine-tuned on bias
labels. Get the end-to-end pipeline working with a single label, ship it,
then expand.

The provider stub already handles partial output gracefully: if you only
fill in `political`, the post-validator backfills neutral values for
`emotional`, `factual`, the four sub_metric arrays, and so on. You can
ship a working integration with one model and expand later.

A sandbox CPU model will be measurably worse than Gemini Flash. That is
fine. The point is the integration pattern.

---

## D. End-to-end deployment workflow

These steps are written so you can mostly read along and click. When the
exact wording of a button is something the docs phrase several ways, the
step says "find the X menu" instead of inventing a path.

### 1. Sign up for the sandbox

Go to https://developers.redhat.com/developer-sandbox and click "Start
your no-cost trial". Sign in with a Red Hat developer account (free).
Accept the OpenShift Developer Sandbox provisioning. After a minute or
two, you have a personal namespace such as `your-handle-dev`.

### 2. Open the OpenShift AI dashboard

From the OpenShift web console (the URL the sandbox emails you), find
the application launcher in the top right (a 3-by-3 grid icon) and
choose "Red Hat OpenShift AI". This opens a separate dashboard at a URL
like `https://rhods-dashboard-redhat-ods-applications.apps.<sandbox>...`.

### 3. Create a Data Science Project

In the OpenShift AI dashboard, find "Data Science Projects" in the left
nav and click "Create project". Give it a name like `bias-analyzer`.
A Data Science Project is just a Kubernetes namespace with the
data-science add-ons turned on for it.

### 4. (Optional) Create a workbench

A workbench is a JupyterLab pod. Useful for experimenting with the model
locally before serving it. Inside your project, find the "Workbenches"
tab, click "Create workbench", pick the smallest CPU image (Standard
Data Science is fine), and a tiny container size. You can skip this if
you only want to deploy a pre-trained HuggingFace model directly.

### 5. Pick a serving runtime

Inside your project, find the "Models" or "Model serving" tab. The
sandbox has either single-model serving (KServe standalone) or
multi-model serving (ModelMesh) enabled. You will see a "Deploy model"
button.

When the runtime dropdown appears, pick:
- **OpenVINO Model Server (OVMS)** if you compiled your model to
  OpenVINO IR. CPU-friendly, very fast.
- **Caikit Standalone** if you have a HuggingFace transformers model
  and want minimum hassle.
- **vLLM** only if you have a GPU. Skip this on the sandbox.

For a HuggingFace classifier, Caikit Standalone is the easiest path.

### 6. Upload model artifacts

Two paths.

**Path A: pull from HuggingFace.** If your runtime supports it (Caikit
does, with the right config), you can put `hf://<org>/<model>` as the
model location and KServe will download it on pod startup. Easiest, but
the cold-start is longer because of the download.

**Path B: stage in S3.** Upload the model files to an S3-compatible
bucket. The sandbox usually has an in-cluster MinIO (look for "Data
connections" in your project) or you can use an external bucket like
Backblaze B2 (free 10 GB) or Cloudflare R2. Add a "Data connection" to
your project that points at the bucket, then in "Deploy model" pick
that data connection and put the path to the model folder.

### 7. Deploy as an InferenceService

Click "Deploy model" with the runtime, model location, and a name
filled in. Set "Model server size" as small as possible (1 CPU, 4 Gi
RAM if your model fits). Submit.

Behind the scenes, OpenShift AI created an `InferenceService` object.
Wait until the status flips green ("Loaded" or "Ready"). On the sandbox
CPU, expect 2 to 5 minutes for the model image to download and the
weights to load.

### 8. Get the inference URL

Once Ready, the model row shows an "Inference endpoint" link. The full
URL has the shape:

```
https://<service>-<project>.apps.<sandbox-cluster>/v2/models/<model-name>/infer
```

If the row only shows an internal URL, you also need to expose it. Open
the OpenShift web console, navigate to your project, find "Networking >
Routes", and create a Route that points at the InferenceService's
predictor service. The route gives you the public HTTPS URL.

### 9. Auth model

Sandbox routes can be:
- **Unauthenticated** (no header needed). Easiest for early testing,
  but anyone who guesses your URL can hit your model.
- **OAuth-protected** (require an `Authorization: Bearer <token>`
  header). You generate a token from a service account in OpenShift
  ("User Management > ServiceAccounts > Add token"), or grab your own
  user token by running `oc whoami -t` after `oc login` in a terminal.

The provider supports both: leave `OPENSHIFT_AI_TOKEN` blank for
unauthenticated, or set it to the token string for OAuth. OpenShift
service-account tokens look like `sha256~abc123...`.

### 10. Test with curl from your laptop

Before wiring up the backend, sanity-check the model:

```bash
curl -X POST "$OPENSHIFT_AI_INFERENCE_URL" \
  -H "Authorization: Bearer $OPENSHIFT_AI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs":[{"name":"article_text","shape":[1],"datatype":"BYTES","data":["Test sentence."]}]}'
```

Expect a JSON object back. Note its exact shape; you will paste a small
extract into the next step.

---

## E. The data contract: what the model returns vs. what AnalysisResult expects

`AnalysisResult` is a heavy schema. It expects four headline scores, four
sub-metric arrays, a sentiment series, entities, topics, optional
highlights, and free-text fields like `summary` and `reasoning`. Gemini
returns all of that in one call because Gemini is a general LLM with
structured-output mode.

A small CPU model returns one of three things:

1. **A class label.** "left" or "center" or "right". One axis only.
2. **A probability distribution.** `[0.12, 0.71, 0.17]` over those classes.
3. **A short text completion.** "This article is moderate-left because..."

To produce a full AnalysisResult you have two options:

### Option 1: chain several small classifiers

Train or pick four DistilBERT models, one per axis (political,
emotional, factual, fake_likelihood). Run them in parallel from the
provider, then assemble the result. Pseudocode:

```python
political_logits = call("political", text)
tone_logits     = call("tone",     text)
fact_logits     = call("fact",     text)
fake_logits     = call("fake",     text)

return {
    "political": logits_to_political(political_logits),
    "emotional": logits_to_tone(tone_logits),
    "factual":   logits_to_factual(fact_logits),
    "fake_likelihood": logits_to_fake(fake_logits),
    "sentiment": "neutral",
    "summary":   "(no model handles summaries yet)",
    "reasoning": "(produced by four CPU classifiers; see /docs)",
}
```

Pass that dict to `AnalysisResult.model_validate(...)`. The
post-validator (in `backend/app/ai/base.py`) will:

- Clamp every numeric to its allowed range.
- Generate the four `SubMetric` arrays with neutral 0.0 entries and the
  expected key names.
- Pad `sentiment_series` to four points.
- Default `topics` to `["uncategorized"]`.
- Trim `red_flags`, `entities`, `highlights` if they are too long.

Result: a complete, frontend-safe object even though your model only
produced four numbers and a label.

### Option 2: one bigger generative model

Run FLAN-T5-base or TinyLlama with a prompt that asks for JSON
matching the AnalysisResult schema. Parse `json.loads(output)` and pass
the dict to `model_validate`.

This is closer to what Gemini does, but the small model will frequently
return invalid JSON. Wrap the parse in `try/except`, and if it fails,
fall back to the Option 1 chain or to a templated stub.

### How `_post_validate` saves you

Read the `_post_validate` method in `base.py`. The relevant guarantees:

- `political.score` is clamped to `-1..1`.
- `emotional.score`, `factual.score`, `fake_likelihood` are clamped to `0..1`.
- Each `sub_*` array gets the expected key set, in order, with notes
  trimmed to 240 chars.
- Missing entries become `SubMetric(key=expected, value=0.0, note="")`.
- `sentiment_series` is padded to at least 4 points.
- `topics` defaults to `["uncategorized"]`.
- `entities` mentions are bumped to >= 1.

Translation: your provider only has to fill the seven required fields
(`political`, `emotional`, `factual`, `fake_likelihood`, `sentiment`,
`summary`, `reasoning`). Everything else can be left out and the UI
still renders.

---

## F. Connecting from our backend

The repo already has a pluggable provider interface. The integration
points are:

1. `backend/app/ai/base.py` defines `AIProvider` (an ABC) and
   `AnalysisResult` (the response schema).
2. `backend/app/ai/__init__.py` has a `get_provider()` factory that
   reads `settings.ai_provider` and returns the right class.
3. `backend/app/ai/gemini.py` is the existing Gemini implementation,
   used as a reference.
4. `backend/app/ai/openshift_ai.py` is the new stub (created by this
   plan).

To switch providers:

```dotenv
# .env
AI_PROVIDER=openshift
OPENSHIFT_AI_INFERENCE_URL=https://<svc>-<proj>.apps.<sandbox>/v2/models/<name>/infer
OPENSHIFT_AI_TOKEN=sha256~...        # leave blank if route is unauthenticated
```

The factory in `__init__.py` already dispatches `openshift` to
`OpenShiftAIProvider`. The route handler in `analyze.py` is provider-
agnostic; it just calls `provider.analyze(text, deep=...)` and writes
the tuple result to the response.

Restart the backend after editing `.env`. Hit the analyze endpoint and
watch the logs. The first request will hit a `NotImplementedError` from
`_parse_inference_response`. That is the marker for "fill me in next".

---

## G. Local development workflow

You do not want to redeploy a model on the sandbox every time you tweak
the parser. Two tricks.

### Mock the inference endpoint locally

Run a tiny FastAPI server that returns a canned response on the same
shape your real model will. Save this as `scripts/mock_inference.py`:

```python
import uvicorn
from fastapi import FastAPI

app = FastAPI()

@app.post("/v2/models/mock/infer")
def infer(payload: dict):
    return {
        "outputs": [
            {
                "name": "logits",
                "shape": [1, 3],
                "datatype": "FP32",
                "data": [0.12, 0.71, 0.17],   # left / center / right
            }
        ]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9000)
```

Run it with `python scripts/mock_inference.py`, then point the backend
at it:

```dotenv
AI_PROVIDER=openshift
OPENSHIFT_AI_INFERENCE_URL=http://127.0.0.1:9000/v2/models/mock/infer
OPENSHIFT_AI_TOKEN=
```

Now you can iterate on `_parse_inference_response` in seconds and only
deploy to the real sandbox once the parser is solid.

### Switch back to Gemini

Change `AI_PROVIDER=gemini` (or remove the line; gemini is the default)
and restart. The factory caches the provider for one process, so a full
restart is required, not a hot reload of the env.

---

## H. Operational concerns (be honest)

### Cold-start

KServe scales pods to zero when idle. The first request after a quiet
period waits for the pod to come up, the model to load from S3, and the
runtime to warm. On a sandbox CPU this is 30 to 60 seconds. The provider
already sets a 60-second timeout. The frontend already has cold-start
loading copy from the Render backend work; reuse it.

### 30-day expiry

The sandbox namespace is wiped on day 30. Your InferenceService URL
disappears. Plan: every 28 days, re-deploy the model and update
`OPENSHIFT_AI_INFERENCE_URL` in the backend `.env`. If you want
permanent hosting, you eventually need a paid OpenShift cluster or a
serverless equivalent (Modal, Replicate, RunPod).

### Quality ceiling

A single DistilBERT classifier is a 67 MB model trained on probably
under 100k examples. Gemini Flash has hundreds of billions of
parameters. On long opinion essays the gap is dramatic. Set user
expectations: the OpenShift mode is "fast, free, and learns the
pattern", not "matches the cloud".

### Latency

Realistic per-request latency on the sandbox CPU is 5 to 30 seconds for
a single classifier, longer if you chain four. Gemini Flash typically
returns in 2 to 6 seconds. Update the loading message in the frontend
when the OpenShift provider is active.

### Cost (zero, until it is not)

The sandbox is free. If you outgrow it, the next step on Red Hat's
ladder is "OpenShift AI on AWS/Azure/GCP" or a self-managed cluster,
both of which cost real money (hundreds of dollars per month minimum,
mostly for the cluster itself, not the model). Open-source alternatives
worth knowing: KServe runs on any Kubernetes (e.g. minikube, kind,
EKS, GKE) without OpenShift.

---

## I. Resources

- Red Hat Developer Sandbox sign-up:
  https://developers.redhat.com/developer-sandbox
- Red Hat OpenShift AI product docs:
  https://docs.redhat.com/documentation/en-us/red_hat_openshift_ai_self-managed
- KServe official docs:
  https://kserve.github.io/website/
- KServe inference protocol v2 (the `/v2/models/.../infer` shape):
  https://kserve.github.io/website/latest/modelserving/data_plane/v2_protocol/
- HuggingFace text-classification models (CPU-friendly filter, sort by
  downloads):
  https://huggingface.co/models?pipeline_tag=text-classification&sort=downloads
- OpenVINO Model Server (CPU-friendly KServe runtime):
  https://github.com/openvinotoolkit/model_server
- Caikit Standalone runtime (HuggingFace transformers on KServe):
  https://github.com/opendatahub-io/caikit-tgis-serving
- Project files referenced in this doc:
  - `backend/app/ai/base.py` (the AnalysisResult schema and post-validator)
  - `backend/app/ai/openshift_ai.py` (the provider stub)
  - `backend/app/ai/__init__.py` (the get_provider factory)
  - `backend/app/security/prompt_defense.py` (build_prompt and sanitization)
  - `backend/app/config.py` (settings, including the two new OpenShift vars)
  - `backend/.env.example` (variable names you copy into `.env`)
