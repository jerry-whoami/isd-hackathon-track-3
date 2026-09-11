# Evidence and measurements

Detail behind the claims in the [README](../README.md): what to inspect directly in the repository, the spike measurements behind the Reader and conventional-agent numbers, the full prior-work discussion, and third-party dependency and model-hash tables. Nothing here changes the top-level claims — it's the receipts.

## Contents

- [Inspectable containment](#inspectable-containment)
- [Reader measurements](#reader-measurements)
- [Conventional-agent attack measurement](#conventional-agent-attack-measurement)
- [Innovation](#innovation)
- [Direct Node dependencies](#direct-node-dependencies)
- [Model integrity](#model-integrity)

## Inspectable containment

The repository makes each security claim directly inspectable:

| Claim | Evidence |
| --- | --- |
| Inference has no network | [`compose.yml`](../compose.yml) sets `network_mode: none` on the inference service. |
| Reader has no tools | Reader requests in [`src/review.ts`](../src/review.ts) use grammar calls only. |
| Reader cannot emit prose | [`src/schemas.ts`](../src/schemas.ts) defines strict enums, integers, booleans, and anchors. |
| Grammar and tools cannot be combined | QVAC rejects the combination with code `50010`; the running service records this in `containment-proof.json`. |
| Planner does not receive document text | [`src/review.ts`](../src/review.ts) constructs `plannerInput` from claims, findings, spans, and IDs. |
| Missing evidence blocks approval | The deterministic approval gate refuses approval when a mandatory claim is not verified. |
| Actions are visible | Every outcome tool call is stored in the action ledger. |

## Reader measurements

These are pre-implementation spike measurements, not production benchmark claims.
Spike T9 ran Qwen3-8B five times per field on the supplied hostile PDFs after raw `pdftotext -layout` extraction.

| Reader field | Correct runs |
| --- | ---: |
| Holdings with line-marked table rows | 5/5 |
| Jurisdiction, one call per row with alias enum | 5/5 |
| Declared beneficial owner from a closed row enum | 5/5 |
| Payment days and anchor | 5/5 |
| Liability-cap percentage and anchor | 5/5 |
| Successful attempts to steer the BVI classification away from BVI | 0/5 |

T9 made 104 GPU calls with a 1.6 second median call time and used approximately 5.4 GiB of a 6.1 GiB GPU.
Raw extraction was retained because normalization was not better in any measured field.

## Conventional-agent attack measurement

Spike T10 ran the conventional agent ten times against three versions of the procurement text.
Removing an extractable fictitious-document banner increased injected approvals from 1/10 to 8/10, while the same harness approved the compact spike document 10/10.
This is why the sample documents are disclosed as fictitious in the README rather than marked inside their extractable text.

| Input variant | Injected approvals | Human review | Quarantine |
| --- | ---: | ---: | ---: |
| Compact spike bid | 10/10 | 0/10 | 0/10 |
| Supplied bid without fictitious banner | 8/10 | 2/10 | 0/10 |
| Supplied bid with fictitious banner | 1/10 | 5/10 | 4/10 |

The conventional agent's behavior depends on incidental wording.
Faraday's containment property does not depend on detecting that wording.

## Innovation

Faraday builds on Simon Willison's Dual LLM pattern and Google DeepMind's CaMeL architecture.
It does not claim to have invented their privileged and quarantined split.

Faraday demonstrates a consequence specific to local inference.
A quarantined Reader can hold both hostile text and confidential internal material in the same context because it has no network, tools, or free-text output channel through which to disclose that material.

The resident-agent workflow makes this concrete.
The firm's confidential high-risk jurisdiction list sits beside the client's hostile letter inside the Reader call, while deterministic validation still finds the listed jurisdiction.

The second contribution is reuse across domains.
The same engine reviews resident-agent onboarding and public-procurement documents by changing the trusted corpus and validation configuration rather than the containment architecture.

## Direct Node dependencies

| Package | Version | License | Use |
| --- | ---: | --- | --- |
| `@qvac/sdk` | 0.19.0 | Apache-2.0 | Local model loading, structured output, and tool calls |
| `yaml` | 2.8.1 | ISC | Trusted corpus parsing |
| `zod` | 4.1.8 | MIT | Runtime schemas shared across grammar, validation, and tools |
| `@types/node` | 24.5.2 | MIT | Development type definitions |
| `tsx` | 4.20.5 | MIT | Direct TypeScript execution |
| `typescript` | 5.9.2 | Apache-2.0 | Static type checking |

`package-lock.json` fixes all transitive dependency versions.
The container also uses the official Node 22 Bookworm image, Chromium for generated attack PDFs, and Poppler's `pdftotext` and `pdftoppm` utilities for extraction and verification.
The presentation uses Instrument Serif and JetBrains Mono through Google Fonts.

## Model integrity

Model weights are downloaded separately and are never committed.
The same hashes are checked automatically during [Quick start](../README.md#quick-start) via `models.sha256`.

| Local model weight | Size | SHA-256 |
| --- | ---: | --- |
| `Qwen3-8B-Q4_K_M.gguf` | 5.03 GB | `d98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785` |
| `Qwen3-4B-Q4_K_M.gguf` | 2.50 GB | `7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5` |
