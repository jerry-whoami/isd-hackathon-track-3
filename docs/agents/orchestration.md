# Orchestration runbook — one-run implementation of Faraday

**Audience**: the orchestrating agent (any harness) and the worker agents it launches.
**Goal**: implement tickets #2–#11 in one unattended run. The user reviews **one final PR** and does ticket #12 (the human run-through) themselves.
**Deadline**: 2026-09-11 08:00, Panama time (UTC-5).

After preflight (§2), do not ask the user anything unless the run genuinely cannot continue.

Paths used below:

```
REPO      = /home/jwhoami/Development/projects/personal/decentralized-ai-hackathon/tracks/track-3
WORKSPACE = /home/jwhoami/Development/projects/personal/decentralized-ai-hackathon
TREES     = /home/jwhoami/Development/projects/personal/decentralized-ai-hackathon/tracks/track-3-worktrees
MODELS    = $REPO/models            (gitignored; never copy weights into worktrees)
SPIKE     = $REPO/spike             (gitignored, read-only reference)
```

## 1. Sources of truth, in order

1. **Spec**: `gh issue view 1`. Where it differs from the handoff, the spec wins.
2. **Tickets**: `gh issue view <n>` for #2–#12. Each ticket's acceptance criteria are the definition of done.
3. **Glossary**: `$REPO/CONTEXT.md`. Name code after its terms (Reader, Validator, Planner, claim, anchor, span, finding, verification status, coverage pass, policy section, action ledger, naive path, contained path…).
4. **Architecture**: `$REPO/docs/adr/0001-*.md` and `0002-*.md`.
5. **QVAC facts and measured results**:
   - `$WORKSPACE/HANDOFF.md` §0, §6, §8;
   - `$SPIKE/lib.mjs`, working code for loading the model, grammar calls and tool calls;
   - `$SPIKE/REPORT*.md` and the `t6`–`t10` scripts, the exact prompts and schemas that scored 5/5;
   - `$SPIKE/qvac-docs.txt`, the full QVAC docs. Grep it; do not re-research.

## 2. Preflight (with the user present)

- [ ] `main` is clean and in sync with `origin/main`, apart from this runbook, which is untracked. Create a local `integration` branch from `main`, and commit this runbook as its first commit so every worktree has it.
- [ ] `cd $REPO && sha256sum -c models.sha256` passes for the Qwen3-8B and Qwen3-4B lines.
- [ ] `nvidia-smi` shows no other compute process on the GPU, and the user keeps it free during the run.
- [ ] The GPU works in Docker through CDI: `docker run --rm --device nvidia.com/gpu=all <image> nvidia-smi`. Do not use `--gpus all`, which fails on this host.
- [ ] The tools are present: Node ≥ 22.17, `pdftotext`, `google-chrome-stable`, `docker compose`, `flock`, and `gh` (authenticated).
- [ ] The **impeccable** design skills are installed in the harness that will run #8. If they are not, ask the user now: install them, or run #8 last. Never do #8 without them silently.
- [ ] The leftover branch `spec/faraday-design` (local and remote) is identical to `main`. Ignore it.

## 3. Dependency graph

| Ticket | Title | Blocked by | Real-model runs allowed |
|---|---|---|---|
| #2 | Tracer bullet: a bid's payment term, from PDF to outcome | — | 1 |
| #3 | Complete bid review: liability cap and the mandatory bid form | #2 | 1 |
| #4 | Source-of-funds letter: the Anexo A table and the declared beneficial owner | #2 | 0 |
| #5 | The thesis: high-risk jurisdiction with the confidential list | #4 | 1 |
| #6 | Conventional agent and the duel engine | #2 | 0 |
| #7 | Containment in Docker Compose | #2 | 0 (scripted model) |
| #8 | UI: bandeja, Documento and Expediente (impeccable) | #2 | 0 |
| #9 | UI: the Duelo | #6, #8 | 0 |
| #10 | Tu ataque: a person's own injection in a clean document | #8 | 0 |
| #11 | Submission README | #3, #5, #7 | 0 |
| #12 | Pre-recording run-through — **human, do not implement** | — | — |

```
#2 ─┬─ #3 ───────────────┐
    ├─ #4 ── #5 ─────────┼── #11
    ├─ #7 ───────────────┘
    ├─ #6 ──┐
    └─ #8 ──┼── #9
            └── #10
```

**Launch a ticket as soon as every one of its blockers is merged into `integration`.** Do not wait for a whole wave to finish. Run at most 5 workers at once. The critical path is #2 → #4 → #5 → #11.

**If time runs short**, cut in this order: first #10, then the Expediente polish in #8. **Never cut #5, #6 or #9.**

## 4. Orchestrator loop

1. **Frontier.** Take every ticket not yet merged or running whose blockers are all merged into `integration`.
2. **Launch.** For each ticket N on the frontier:
   - run `git -C $REPO worktree add $TREES/ticket-N -b ticket/N integration`;
   - start a worker with the brief in §5, filling in N and the base commit.
3. **On completion.**
   - Read the worker's report. **Check each acceptance criterion against the diff yourself**; do not trust the report alone.
   - Run the gate in the worktree: `npm test`, `npm run typecheck`, `node scripts/check-extraction.mjs`.
   - Merge into `integration` with `git merge --no-ff ticket/N`, and run the gate again there.
   - Resolve conflicts **by intent**, reading both tickets. Parallel tickets extend the same shared modules (schemas, the `finding_type → recipe` table, the review record), so the right resolution is usually to keep both additions.
4. **When the gate is red**, fix it or send the failure back to the worker. If a ticket fails twice, implement it yourself or cut its scope, and record that for the PR. Never stall the whole run on one ticket.
5. **Record.** Append one line per event (launched, merged, failed, cut) to `$TREES/PROGRESS.md`. This file lives outside the repo.
6. After a merge, remove that ticket's worktree (`git worktree remove`), keep its branch, and go back to step 1.

**Resume after a restart or compaction**: rebuild state from `$TREES/PROGRESS.md`, `git branch --merged integration` and `git worktree list`, then continue the loop.

## 5. Worker brief (send this, filling in N)

Before sending, expand `$REPO`, `$TREES`, `$SPIKE` and `$MODELS` to their absolute paths; workers do not know them.

> You are implementing **ticket #N** of Faraday, in the worktree `$TREES/ticket-N` on branch `ticket/N`, created from `integration` at `<sha>`.
>
> 1. **Read** `gh issue view N`, the spec (`gh issue view 1`), `CONTEXT.md` and `docs/adr/`. For QVAC usage, read `$SPIKE/lib.mjs` and §7 of `docs/agents/orchestration.md`, which is in your worktree. Those files are outside git; do not copy them into the repo.
> 2. **Build test-first in thin vertical slices**:
>    - write one failing test through the highest seam: the **review entry point** with the **scripted model adapter**, which records every request;
>    - make it pass, then repeat;
>    - test external behaviour, never internals;
>    - write module-level tests only where the ticket says so (the attack generator).
> 3. **Meet every acceptance criterion, and add nothing beyond the ticket.** Reuse what already exists on `integration`, and extend shared modules (schemas, recipe table, review record) additively so merges stay easy.
> 4. **Real-model runs**: only if an acceptance criterion requires one, and exactly one, under the GPU lock:
>    `FARADAY_MODEL=$MODELS/Qwen3-8B-Q4_K_M.gguf flock /tmp/faraday-gpu.lock <command>`.
>    Afterwards, confirm with `nvidia-smi` that no QVAC worker process you started is still holding VRAM, and kill only your own.
> 5. **Before finishing**, run `npm test`, `npm run typecheck` and `node scripts/check-extraction.mjs`. Review your own diff against the ticket's criteria and the spec, checking three things in particular:
>    - names come from `CONTEXT.md`;
>    - no Planner request contains any document text;
>    - Reader calls carry a grammar and never tools.
>
>    Fix what you find.
> 6. **Commit** on `ticket/N`, with messages that reference #N. Do not push, merge, or touch GitHub.
> 7. **Your final message is your report**, under about 40 lines. Include:
>    - each acceptance criterion as done or partial, with the reason;
>    - the deviations and decisions you made;
>    - the real-model run result, with numbers;
>    - the commands that run the tests;
>    - known gaps.

**Extra instructions for specific tickets**:
- **#2**: this ticket sets up the project layout and `package.json` scripts named `test` and `typecheck`. Every later ticket and the gate use exactly those.
- **#8**: use the impeccable design skills for the visual design. Develop against a scripted or recorded review record, never the real model.
- **#7**: test the containment check with the scripted model inside the inference service. `nvidia-container-toolkit` 1.20 is installed and its CDI spec is generated.
  - In the GPU override, request the GPU **through CDI**: `deploy.resources.reservations.devices` with `driver: cdi` and `device_ids: [nvidia.com/gpu=all]`, or `devices: [nvidia.com/gpu=all]`.
  - `--gpus all` and `driver: nvidia` fail on this Docker 29 host with "AMD CDI spec not found".
  - Verify, **without loading the model**, that the inference container sees the GPU (`nvidia-smi`) and the Vulkan ICD at `/etc/vulkan/icd.d/nvidia_icd.json`. The real model on the GPU under Compose is exercised in #12.

## 6. Rules for everyone

- **Git and GitHub**: no push, no PR, and no issue edits, comments or closes until §8. Never touch issue #1 or #12.
- **npm**: never run `npm install -g`; install locally only. `@qvac/sdk` is about 4.9 GB, and the npm cache makes installs in later worktrees faster.
- **Inference is local only.** Routing inference to a cloud API disqualifies the submission.
- **GPU**: one real-model run at a time, always under `/tmp/faraday-gpu.lock`. The whole run is allowed **3 real-model runs in total** (#2, #3 and #5). Do not add sweeps or repeats; cite the spike's measurements instead.
- **Off limits**: do not modify `spike/` or `models/`, and do not touch any other project or process on the machine.
- **Documents and corpus**: never add "ficticio" or "fictitious" markings inside them. The README declares them fictitious (spike T10 showed a banner changes model behaviour). `scripts/check-extraction.mjs` must stay at 26/26.
- **Language**: code and repository docs in English; UI, corpus and documents in Spanish.
- **Ambiguity**: choose what is most consistent with spec #1, `CONTEXT.md` and the ADRs, record it as a deviation, and keep going.

## 7. QVAC facts (verified in the spike; see `$SPIKE/lib.mjs`)

- **Package and runtime**: `@qvac/sdk` 0.19.0 (Apache-2.0), on Node ≥ 22.17.
- **Loading by path**:
  - `loadModel({ modelSrc: <absolute .gguf path>, modelType: 'llamacpp-completion', modelConfig: { ctx_size: 8192, tools: true } })` returns a `modelId`. Unload with `unloadModel({ modelId, clearStorage: false })`.
  - Loading by path never starts P2P. A cold load takes about 50–60 s on the GPU.
- **Grammar call**:
  - `completion({ modelId, history, stream: true, responseFormat: { type: 'json_schema', json_schema: { name, schema } }, generationParams: { reasoning_budget: 0 } })`.
  - Drain `run.events`, then read `(await run.final).contentText` and `await run.stats`.
- **Tool call**:
  - The same call with `tools` and no `responseFormat`; then read `await run.toolCalls` and `await run.text`.
  - It needs `tools: true` in the model config at load time.
- **One model instance serves both kinds of call**; T8–T10 did exactly this.
- **`responseFormat` plus `tools` in one call** is rejected client-side with `REQUEST_VALIDATION_FAILED`, code **50010**. This is the containment proof #7 records.
- **Grammar details**:
  - `responseFormat` is compiled to GBNF.
  - `strict` does **not** add `additionalProperties: false`; set it yourself.
  - Integer bounds survive in the grammar, but the model can still fabricate an in-range value, so the Validator checks every value against its anchored text.
- **Ignored or unsupported**: logprobs and `logit_bias` are ignored. There is no PDF support; extraction with `pdftotext -layout` is ours. Use the raw text with no normalisation (T9: 5/5).
- **Thinking**: Qwen3 thinks by default; `reasoning_budget: 0` turns it off.
- **Docker**:
  - `node:22-bookworm-slim` needs `libatomic1 libssl3 libvulkan1` (see `$SPIKE/t5/Dockerfile`).
  - `network_mode: none` was verified end to end: DNS and HTTP fail inside the container, and there were no P2P attempts.
- **GPU**:
  - QVAC uses Vulkan on the host by default.
  - The 8B Q4_K_M at context 8192 takes 5.4 of 6.1 GB of VRAM and runs at about 36 tok/s.
  - A second QVAC process on the GPU halves throughput and does not fit alongside a second 8B instance.
- **Reader formats that scored 5/5 on the real documents**: `$SPIKE/REPORT-T9.md` and `$SPIKE/t9.mjs`. Match claims by row position, not by value (T6).

## 8. Finish

1. All of #2–#11 are merged into `integration` (or cut, with the reason written down), and the gate is green there.
2. Push **only** the `integration` branch. Open a PR from `integration` to `main` whose body includes:
   - a summary of what was built;
   - for each ticket, the status of every acceptance criterion and its deviations;
   - the three real-model run results, with numbers;
   - what is still untested (the real model on the GPU under Compose, which is exercised in #12);
   - open items (#12 and anything cut);
   - the line `Closes #2, #3, #4, #5, #6, #7, #8, #9, #10, #11` (never #1 or #12).
3. **Do not merge.** Give the user the PR URL.
