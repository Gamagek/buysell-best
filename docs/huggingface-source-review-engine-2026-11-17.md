# Hugging Face source-grounded AI review draft engine

This is a **working, intentionally draft-only** open-weight LLM stage for the existing BuySell.Best Admitad/AliExpress pipeline.

## Verified runtimes

- Oracle Ubuntu (~1 GB physical RAM): official `llama.cpp` CPU binary b12477 and Hugging Face `ggml-org/Qwen3-0.6B-GGUF` Q4_0 have been downloaded and CLI inference executed. CPU-only test is possible but slow (observed ~3–5 generated tokens/s) and initial output made unsupported product-quality claims. The low-RAM machine is **not recommended as a persistent model API server**.
- GitHub Actions (public repository): `.github/workflows/hf-source-review.yml` provisions a temporary Ubuntu CPU runner; installs pinned `llama.cpp` release b12477; downloads the 1.7B Q4_K_M Hugging Face model from a pinned model revision; starts localhost-only `llama-server`; creates and validates a draft; saves a seven-day Actions artifact. Requires no Gemini, OpenAI or paid inference API.
- The workflow can be started from GitHub **Actions → Hugging Face Qwen3 Grounded Review Draft (Manual Test) → Run workflow**. A first run is also triggered when the workflow file is initially merged into `main`.

## Source and quality boundaries

The script `scripts/hf-source-review.mjs` fetches a public canonical `/flash-sale/product/<slug>/` HTML page and parses its server-rendered Product JSON-LD. It verifies:
- exact `https://buysell.best` product URL and canonical;
- source product title, USD price, cached first-party seller image;
- offer destination has the approved `https://rzekl.com/g/...` Admitad link format and its `ulp` destination points at a specific AliExpress product item;
- no secrets or signed feed URLs are passed to the model.

A fallback **sanitized existing D1 snapshot** in `test/fixtures/hf-review-source-snapshot.json` is allowed for a demonstration only if the public page cannot be reached. It is visibly labelled as an offline example, not a live or independent verification.

Output is **always** `DRAFT_REQUIRES_HUMAN_SOURCE_REVIEW`, `auto_publish: false`. This is not a mechanism to send AI output directly to live pages. A basic rule-based gate flags unsupported ratings, quality claims, invented tests and insufficient verification language; passing that gate **does not mean the draft is fact-checked**. A model may hallucinate even when prompted otherwise.

The feed provides product name, image and price but often lacks official specifications, verified seller reviews, independent product tests and dimensions. Thus a genuine *deep source-verified* review cannot be created automatically for every offer solely from this input. Extra trusted documents or source links must be collected and checked before any LLM-generated claims are published. Only approved seller links remain in bulk product listings.

## Safety, economics and operations

- No credentials are stored in the public repository.
- The model runner is ephemeral and does not stay up 24/7. The original Cloudflare hourly affiliate feed ingestion remains independent and unchanged.
- Inference is CPU-only and may be too slow to generate thousands of detailed drafts daily. Do not use GitHub Actions as unlimited model hosting; adhere to GitHub Actions usage and acceptable-use policies.
- Model: [ggml-org/Qwen3-1.7B-GGUF](https://huggingface.co/ggml-org/Qwen3-1.7B-GGUF), quantized Q4_K_M.
- No automatic GitHub commit of AI reviews and no change to Adsterra configuration.
