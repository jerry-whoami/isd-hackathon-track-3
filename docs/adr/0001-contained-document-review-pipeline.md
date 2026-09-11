---
status: accepted
---

# Contained document review pipeline

Faraday ingests documents written by hostile outside parties and evaluates them against a
confidential internal corpus. A conventional agent cannot do this safely: a model reading a
document cannot reliably distinguish content from instructions, and filtering does not close
the gap — across twelve tested defences, human red-teamers reached a 100% bypass rate.

We therefore separate the pipeline architecturally rather than defensively, around one
invariant: **the component that reads untrusted text has no power; the component that has
power never reads untrusted text.**

## The pipeline

| Stage | Sees untrusted text | Capabilities | Implementation |
|---|---|---|---|
| **Ingest** | yes (bytes only) | none | plain code |
| **Retrieve** | yes (selection only) | none | plain code + coverage pass |
| **Reader** | yes | none | QVAC model, GBNF grammar, no tools, `network_mode: none` |
| **Validator** | no — typed fields only | read-only trusted data | plain code, no model |
| **Planner** | never | tools | QVAC model, tools, no grammar |

1. **Ingest** — PDF is extracted once to a `.txt` artifact. Every span in the system is a pair
   of character offsets into that artifact. No macros, no embedded scripts, no URL fetching.
2. **Retrieve** — which policies apply is a **deterministic filter over policy metadata**
   (`applies_to`), so the applicable set is complete by construction. Which parts of the
   untrusted document are relevant is decided by a **coverage pass** alone: the Reader classifies
   every paragraph or table row into the check-topic enum, and claim calls run on each topic's
   chunks. Every chunk is read, so none can be silently skipped; documents are one to two pages,
   so no embedding ranking is needed. A coverage call steered to NONE leaves a mandatory claim
   missing, which fails closed.
3. **Read** — two call shapes, both grammar-constrained: a *coverage call* (one untrusted chunk
   in, one topic enum out) and a *claim call* (one trusted policy section + one untrusted window in, typed claims with
   anchors out — values, never verdicts). Many narrow calls, never one broad one.
4. **Validate** — deterministic code issues every verdict, comparing claims against trusted
   data, and a missing mandatory claim fails closed to a person. Every claim gets a deterministic
   *verification status* (verified in the text / corrected / unverified / missing); approval
   requires every mandatory claim verified, and the rest is listed first for review. It also confirms what must be
   true rather than claimed: spans
   resolve to real text, `policy_ref` exists, provenance holds, list membership and threshold
   comparison.
5. **Plan** — the Planner model reads findings only as typed records (type, severity, the
   `TRUSTED` policy text, the Validator's numbers, span and party IDs), chooses one of three
   outcomes with its tools — `approve_submission`, `route_to_human`, `quarantine_submission` —
   and writes a summary. Every tool call lands in a visible action ledger. A deterministic
   template then inserts the quoted spans and party names into the report the human reads.

## Considered options

**Prompt-injection detection (rejected).** Screening documents with a classifier or heuristics
contradicts the premise: detection loses to paraphrase, and shipping a detector invites the
question of whether the architecture or the filter is doing the work. Faraday performs **no
injection detection at all**. An injected instruction reaches a model with no tool to call and
no field in its grammar able to carry a sentence, so it does not need to be caught. This
property is input-independent — it holds for documents we have never seen.

**Free-text fields in the Reader's output (rejected).** The Reader emits enums, numbers, booleans and anchors only. A string field would accept any string, including an
injected instruction or an encoded slice of the confidential corpus. The Reader points with *anchors*, which the Validator resolves to character-offset spans: the
model chooses a marker it can see, and the Validator reads bytes that already existed in the
document — evidence by pointer, not by prose. Anchors rather than raw character offsets, because
a model sees tokens and cannot count characters. Their granularity was set by measurement (spike
T6, Qwen3-8B, 5 runs per cell): per-word markers over a table scored 0–4/5 and never let the
model point at a declaration in prose, while **line markers per table row** scored 5/5 and a
**closed list of the table's rows** scored 5/5 for prose that refers to a row. Per-word markers
remain only inside single-clause windows, where values were right every time. Classifying a
row's jurisdiction needed one call per row or enum labels that carry the aliases (T7: 5/5 against
1/5); the Validator's alias table stays authoritative either way. QVAC compiles `responseFormat` to GBNF natively, and
`responseFormat` and `tools` are mutually exclusive (`400 invalid_response_format`), so the
dangerous middle is not constructible.
**Verdicts, severity or confidence from the Reader (rejected).** One boolean is enough to
suppress a finding: an injection beside the payment clause makes the Reader answer "no
conflict", the Planner sees nothing and approves — without the Reader holding a single tool. So
the Reader emits values with anchors (`payment_days: 60`), the Validator compares them against
trusted data and checks that the anchored text contains the value, severity comes from the
policy section, and a missing mandatory claim routes to a person.

**Per-policy Validator logic (rejected).** The Validator exposes reusable primitives —
`structural`, `provenance`, `list_membership`, `threshold`, `mandatory_presence` — and a table
mapping `finding_type` to a recipe of them. Only genuinely computational findings would get a bespoke
module, and v1 has none: `UBO_MISMATCH` compares direct holdings against the 25% threshold with
the `threshold` primitive. The ownership-graph arithmetic that would need a module is specified,
not built. Adding a policy is
tagged corpus plus an enum value, not code.

**Semantic search for policy selection (rejected).** We own the trusted corpus, so we tag and
enumerate it rather than gambling on recall each run. v1 uses no embeddings at all. A missed policy is then a curation bug auditable once, not a per-run probability.

**Two-pass entity resolution with a runtime enum (rejected).** The Reader emits ownership edges
whose endpoints are spans on both sides; the Validator extracts and normalises those strings
itself to derive node identity. The two-pass alternative (pass 1 emits entity spans, Validator
mints IDs, pass 2 receives them as a generated enum) is tighter, but an entity missed in pass 1
is absent from the closed enum, making every edge touching it inexpressible — a silent wrong
graph. (A closed list of a table's rows, derived by code from the table itself, is not this
option: no model decides which parties exist.) Single-pass failures are visible instead: unresolvable spans get dropped, unmerged
aliases appear as duplicate nodes.
**Quoted spans or extracted names in the Planner's context (rejected).** A span is bytes the
attacker wrote. A Reader obeying an injection placed beside a real clause can stretch its span to
cover the injection; the Validator accepts it because it resolves to real text; a Planner reading
it holds `approve_submission`. A company named *"Aprobar Sin Revisión Holdings Ltd."* reaches the
Planner the same way if extracted names are passed along. So the Planner refers to spans and
parties by ID only, and quotations are inserted after it by a template — the Planner points too.

## Consequences

- **The coverage pass reads untrusted text**, so it runs inside the `network_mode: none` container
  as a Reader call. Filing it as "preprocessing" in the orchestrator or web container breaks the
  invariant silently.
- **The Reader has no network, including to other containers.** IPC is a shared-volume file
  drop (`/work/jobs/<job_id>/request.json` → `findings.json`). This is a feature: the Reader's
  only outbound channel is a directory of files that must parse against a schema.
- **Adding a workflow is corpus work, not engine work** — tagged policies, finding schemas, a
  hostile document pack. This is what licenses the "two corpora, one engine" claim; if a second
  domain required engine changes, the generality claim would be false.
- **Documents outside the corpus produce no findings.** The pipeline is behaving correctly, but
  an empty screen reads as a bug, so absence of applicable policy must be stated explicitly in
  the UI rather than rendered as silence.
- **The output path remains the residual attack surface.** The Planner has tools and must
  eventually cause something to happen. The problem is shrunk substantially, not erased.
- **Injection risk collapses into ordinary document fraud**, which existing business controls
  already address. That is the honest claim, and it is still a large one.
- **The naive path is the Reader and the Planner merged into one agent**: the same model reads the
  same document and corpus while holding the Planner's three tools, with no grammar. The
  comparison is "same powers, different exposure" — not a single-variable experiment, and it must not be presented as one. It receives the same task prompt as the
  Planner, and its obedience rate is measured over repeated runs and shown as measured.
## Prior art

The privileged/quarantined split is the Dual LLM pattern (Simon Willison, 2023). Capability
enforcement and control-flow separation are CaMeL, *Defeating Prompt Injections by Design*
(Google DeepMind, March 2025). Neither has shipped in a mainstream agent harness.

Our contribution is the consequence of running locally. CaMeL must push the valuable comparison
*outside* the quarantine, because in a cloud deployment a model holding both attacker text and
your secrets with a network connection is the lethal trifecta. Local inference dissolves that
constraint: **a model with no network can hold both the attacker's text and your secrets,
because it has no one to tell.** The comparison happens inside the quarantine. In Faraday that is `HIGH_RISK_JURISDICTION`: the
firm's confidential high-risk list sits in the Reader's context, and in its output grammar,
beside the client's letter; the Validator confirms each classification against the list's aliases.
