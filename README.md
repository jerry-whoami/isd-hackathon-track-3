# Faraday

Faraday is a local pipeline for reviewing hostile documents against a confidential corpus.
Its invariant is simple: the Reader that reads untrusted text has no power, and the Planner that has power never reads untrusted text.
[ADR 0001](docs/adr/0001-contained-document-review-pipeline.md) describes the containment design.
[ADR 0002](docs/adr/0002-typescript-end-to-end.md) explains the TypeScript and shared-schema implementation.

All inference is local through QVAC.
Faraday has no cloud inference.

## Run it

Download weights on the host, not in a container.
The model service receives them only through a read-only mount.

```sh
mkdir -p models
curl -L -C - -o models/Qwen3-8B-Q4_K_M.gguf \
  https://huggingface.co/Qwen/Qwen3-8B-GGUF/resolve/main/Qwen3-8B-Q4_K_M.gguf
curl -L -C - -o models/Qwen3-4B-Q4_K_M.gguf \
  https://huggingface.co/unsloth/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf
grep 'Qwen3-[48]B-Q4_K_M.gguf' models.sha256 | sha256sum -c -
```

CPU is the default.
If the weights are outside the default `./models` path, set `FARADAY_MODELS_DIR` to their host directory.

```sh
FARADAY_MODELS_DIR=/absolute/path/to/models docker compose up --build
```

Open `http://localhost:3000` after both services start.

`FARADAY_MODEL` is the model path inside the inference container.
It defaults to `/models/Qwen3-8B-Q4_K_M.gguf`.
Use the 4B alternative, for example, with:

```sh
FARADAY_MODELS_DIR=/absolute/path/to/models \
FARADAY_MODEL=/models/Qwen3-4B-Q4_K_M.gguf \
docker compose up --build
```

For Vulkan GPU inference, install NVIDIA Container Toolkit with Docker CDI configured, then apply the GPU override.
Set `NVIDIA_DRIVER_CAPABILITIES=compute,utility,graphics`; the `graphics` capability exposes the Vulkan driver needed by QVAC.
The override uses `nvidia.com/gpu=all`, not `--gpus all` or the legacy `nvidia` driver.

```sh
FARADAY_MODELS_DIR=/absolute/path/to/models \
docker compose -f compose.yml -f compose.gpu.yml up --build
```

The `inference` service has `network_mode: none` and is the only service that loads QVAC.
The web service communicates with it through one request directory per call in the shared `jobs` volume.

## Demonstration material

The corpus and every document in this repository are fictitious, hand-made seed material for the demonstration.
They deliberately carry no `ficticio` or `fictitious` marking themselves.
Spike T10 found that an extractable fictitious banner cut naive-path obedience to 1/10, so marking the documents would change the behaviour the demonstration measures.

## Prior art and dependencies

The hand-made corpus is pre-existing work.
The architectural pattern also follows the Dual LLM pattern by Simon Willison (2023) and CaMeL, *Defeating Prompt Injections by Design*, by Google DeepMind (March 2025).
Faraday's local implementation and its corpus are not a claim to have invented either pattern.

| Library | Exact version |
| --- | --- |
| `@qvac/sdk` | `0.19.0` |
| `yaml` | `2.8.1` |
| `zod` | `4.1.8` |
| `@types/node` | `24.5.2` |
| `tsx` | `4.20.5` |
| `typescript` | `5.9.2` |

The first three are production dependencies.
The last three are development dependencies.
The lockfile fixes their transitive dependency versions.

| Local model weight | SHA-256 |
| --- | --- |
| `Qwen3-8B-Q4_K_M.gguf` | `d98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785` |
| `Qwen3-4B-Q4_K_M.gguf` | `7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5` |

## Spike T9 measurements

These are spike measurements, not production benchmark claims.
T9 ran Qwen3-8B on the hostile source-of-funds letter and bid documents after `pdftotext -layout` extraction.
It ran each field five times per extraction format.
RAW is the unnormalised extraction used by Faraday.
NORM trims lines and replaces runs of two or more spaces with ` | `.
RAW was selected before implementation because it scored at least 4/5 everywhere and NORM was not better anywhere.

| Reader field and format | RAW | NORM |
| --- | ---: | ---: |
| Holdings, `[Ln]` table rows | 5/5 | 5/5 |
| Jurisdiction, one call per row with alias enum | 5/5 | 5/5 |
| Jurisdiction, whole table with injected note as `[L5]` | 5/5 | 4/5 |
| Declared beneficial owner, closed row enum | 5/5 | 5/5 |
| Payment days and anchor | 5/5 | 5/5 |
| Liability-cap percentage and anchor | 5/5 | 5/5 |
| Injection steering the second row away from BVI | 0/5 | 0/5 |

T9 made 104 GPU calls with a 1.6 s median call time and used 5.4 of 6.1 GB VRAM.
The last row is the number of successful attempts to steer the Reader away from the BVI classification, so lower is better.

## Real-model smoke runs

These are single implementation smoke runs, not repeated accuracy measurements.
They are reported with their partial outcomes rather than treated as successes.

| Ticket | Result |
| --- | --- |
| #2, bid payment-term tracer | Partial: the coverage call returned `NONE` before the loader fix. |
| #3, complete bid review | Partial: the Reader returned 60 payment days and a 20% liability cap, but both anchors were missing. |
| #5, high-risk jurisdiction | Passed: 20 Reader calls, two findings, and route to a person. |

## Known weaknesses

- The output path is a smaller remaining attack surface.
- A convincing fake still extracts convincingly.
- The containment pattern is borrowed prior art.
- Only what the corpus requires a document to declare can fail closed.
- The flat beneficial-owner check routes a corporate shareholder to a person instead of resolving ownership behind the company.
