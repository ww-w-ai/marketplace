# Sprint method — sizing, planning dialogue, cycle gates, status schema

> Detail for `cowork-sprint`. The SKILL.md is the thin orchestrator; this file holds the
> heuristics and the state schema. Self-contained — do not defer to global CLAUDE.md at runtime.

> Contents: 1 Sizing · 2 Dependency & execution mode · 3 Planning dialogue · 4 Execution patterns · 5 Cycle & gates · 5b Exit predicate · 5c Worktree isolation & auto-merge · 6 status.json schema · 7 Resume.

## 1. Sprint sizing (human-week unit)

A sprint = roughly **one human-week of work for a normal (non-AI) team** — the *unit of planning*, not of wall-clock. AI executes far faster, but sizing in human terms keeps scope legible and the roadmap honest.

**HARD RULE — 1 sprint = ~1 human-week.** This is a **MANDATORY item at the plan gap-review** (§5 / SKILL.md MODEL SPLIT): every sprint is checked against the ~1-week unit — one clearly larger than ~1 week must be **SPLIT**, a trivially-small one **MERGED**, before execution. Never wave through a mis-sized roadmap; mis-sizing is a plan defect, not a nitpick.

Heuristic:
- Estimate the whole goal in human-effort terms FIRST (≈ how many ~1-week deliverables it holds).
- **Derive the sprint count from that estimate — never default to a fixed 3–6 regardless of size** (the common failure: the count collapses to 3–6 no matter the scope). State the derivation, e.g. "5 deliverables × ~1wk → 5 sprints". A count picked without an effort estimate is mis-scoping.
- **Size-tier anchor** (a sanity band over the human-effort axis; 1 sprint ≈ 1 human-week):

| Tier | Human-effort | Sprints |
|---|---|---|
| **Single** | ~1 week | **1** (one cohesive feature with no multi-area split → `/pdca-wf` is lighter) |
| **Small** | ~2–4 weeks | **2–4** |
| **Medium** | ~5–8 weeks (≈1–2 months) | **5–8** |
| **Large** | ~9–12 weeks (≈2–3 months) | **9–12** |

> Beyond ~12 sprints (> ~3 months / cross-team) → don't cram one status.json; **split into multiple roadmaps/initiatives** and run them as separate cowork-sprint efforts.

- Each sprint must have a **clear deliverable + a QA/acceptance bar** (a sprint that can't be "done" is mis-scoped).
- Prefer vertical slices (end-to-end value) over horizontal layers when possible.
- **The count is provisional after the define step** (PHASE 0 step 3 = define each sprint = the PDCA *plan* role). During detailing (step 5 = per-sprint plan+design = the *design* role), **split an over-large sprint or merge trivially-small ones as the true size emerges — re-adjust the count and log the change + reason in status.json.** Re-adjusting during detailing is the DEFAULT, not an exception.

## 2. Dependency analysis & execution mode

Use `../scripts/schedule.py` as the mechanical authority. Give every sprint `deps` and `owns`.
The script produces durable `clusters` plus the global execution mode. Do not infer or hand-edit
cluster membership after planning.

For the sprint list, classify relationships (same rules apply across sprints and across phases inside a sprint):

- **Explicit dependency** — "after X", "requires X".
- **Implicit dependency** — references/modifies another sprint's artifacts.
- **Independent** — no relation → **eligible for concurrent dispatch**.
- **Circular** — resolve at planning time (split / merge / re-sequence).

The scheduler sets execution mode per cluster:
- **Independent + structured/bulk** → concurrent dispatch (parallel `Agent` calls ‖ one fan-out `Workflow`).
- **Ordered, high-risk, LIVE-production, or exploratory** → sequential.

★ Concurrency is achieved by the **Leader dispatching from main**, never by nesting sub-leaders.

## 3. Planning dialogue (PHASE 0, collaborative default)

Co-plan with the user; ask **one question at a time** when something is ambiguous. Cover:
- Purpose & success criteria (what "done" means for the whole roadmap).
- Scope boundaries (explicit non-goals — YAGNI).
- Constraints (stack, deadlines, LIVE systems, irreversible steps).
- Domain → which **roles/agents** are needed (see `references/agent-authoring.md`).

Each sprint plan also states an **anti-mission / out-of-scope** line — what this sprint will deliberately NOT do — so scope stays honest at the ~1-week boundary (don't silently expand).

Output of PHASE 0: a roadmap (sprint list + order + parallelism + assigned agents) and **one plan file per sprint** written into the repo `docs/` (durable single input to execution). Then the **approval gate**.

`--auto-plan`: skip the dialogue, choose sensible defaults, still write the plans and present the roadmap before executing.

## 4. Execution patterns (PHASE 1) — pick per work-chunk

| Pattern | Use when |
|---|---|
| **DELEGATE** — `Agent` swarm / parallel / council | exploratory, judgment-heavy, heterogeneous, few items |
| **DIRECT inline** — Leader does it step-by-step | small, quick, or needs the Leader's full context |
| **DIRECT Workflow** — Leader authors a deterministic JS script | structured, bulk, repetitive, wide parallel fan-out, needs reproducibility/barriers/loops |

- Workflow is a **direct-execution** method (not delegation); its spawned agents are flat workers — correct, not a downgrade.
- Hybrid: while delegating autonomously, if a "structured bulk parallel" chunk appears, the **Leader** designs a Workflow for just that chunk (no sub-leader improvises one).
- **An objective gate upgrades DIRECT → DELEGATE.** When a trustworthy objective gate (test / parity harness) exists, otherwise-DIRECT judgment-heavy work becomes safely delegatable — the gate externalizes the judgment, so a judgment-light worker can "iterate until green." **Build the gate first, then delegate against it.** sooji's S1 (1337-line LIVE Hono port) was DIRECT-inline territory until a 17/17 parity harness objectified correctness — then it delegated safely. ⚠️ Only as safe as the gate is *complete*: a happy-path-only gate (see `references/refactoring.md` → rare-branch false-green) + aggressive delegation = regressions slip through. Make the gate exercise rare branches before delegating against it.

## 5. Sprint cycle & gates

Each sprint runs a full cycle. The phase names are internal stages (never user sub-commands):

```
[worktree setup, ONCE — if source-mutating; §5c]
research → plan-detail → design → do → QA → fix → intent-audit → commit → deploy/deliver
                              (then ONCE after all sprints → doc-sync → [auto-merge, if worktree; §5c])
```

- **initiative intent** is captured ONCE after roadmap approval and before autonomous execution. It preserves the user's goal, constraints, decisions, and approved roadmap; every sprint provenance links to it.
- **commit** (per sprint, after its gate is green) is MANDATORY via `/cowork-commit` in sprint-provenance mode. Its WHY comes from the initiative link plus the sprint's reviewed Brief, Plan, Design, report, and verification evidence. Do not search for or invent per-sprint user dialogue during autonomous execution. Include a verbatim dialogue delta only when the user actually intervened after the previous checkpoint. The global git-safety gate still applies; never push without explicit permission.
- **doc-sync** runs ONCE after all sprints via `/cowork-doc-sync` — MANDATORY terminal step, not a "later" suggestion. Skipping it = the sprint is not done (docs left stale). Both are detailed in SKILL.md PHASE 1.

**Phase gate (sequential enforcement).** Phase N-1 must be **complete — its observable exit condition met (sign-off / exit predicate green)** — before phase N starts. No skipping ahead on an unfinished phase; an unmet exit condition pauses, it does not pass silently.

**Checklist → TodoWrite (mandatory).** Each cycle-phase checklist item becomes an actual `TodoWrite` item, not a passive prose list — no exceptions. Mark `in_progress` on entry, `completed` only when its exit condition is verified. This makes the phase gate above observable (a phase isn't "done" until its todos are all `completed`).

Gates fire at **different phases** (catch drift early, not just at the end):
- **Research sign-off** (before `plan-detail`): the facts THIS sprint depends on are gathered — codebase reality, external specs, constraints, prior art. Never enter `do` on assumptions (CLAUDE.md "Research-before-Do" — Research-less Do is an anti-pattern).
- **Design sign-off** (before `do`): the design/approach is coherent and matches the sprint plan. Don't build on an incoherent design.
- **QA gate** (before deploy/deliver): the phase's **exit predicate** (§5b) holds, verified by running the check. ★ **Mechanical baseline first — detect the project's stack and run *its* tools; never prescribe a fixed tool list.** The baseline is a *discipline* (format-check → lint → type/compile → test, all green), but the commands come from whatever **this** project uses — detect from `package.json` scripts / `Makefile` / `pyproject.toml` / `cargo` / `go.mod` / `bun` / etc. Examples (illustrative, **not** prescriptive — tooling differs by language): JS/TS → `prettier --check` + `eslint` + `tsc --noEmit` + `vitest`/`bun test`; Python → `ruff format --check` + `ruff` + `mypy` + `pytest`; Go → `gofmt -l` + `go vet` + `go test`; Rust → `cargo fmt --check` + `cargo clippy` + `cargo test`; a no-`package.json` Bun repo → `bun build` (typecheck) + `bun test`. **Run only the checks the project actually has configured** — a tool the project doesn't use is not a gate, and don't add one just to satisfy the gate. Then the predicate target `matchRate == 100%`. If no suitable test exists for the change, say so explicitly and add a minimal one — do not let "green" be a false signal (a test that doesn't exercise the change proves nothing). For data-flowing apps, also sanity-check the path end-to-end (input→store→output), not just unit-green. ★ **This baseline is Axis 1 ("does it work?") only — it does NOT by itself prove `matchRate`.** The `matchRate` target is measured by **Axis 2 — gap-analysis** (WorkList ↔ actual output; "did we build all we declared?"), run as part of this gate per `references/gap-analysis.md`. Both axes must pass for QA green. Without Axis 2, tests can be green while half the declared WorkList is unbuilt (the tests cover only the built half) — a green baseline back-filling a false `matchRate` is the exact failure this two-axis split prevents. Skip Axis 2 only when the local config (§6A knob #6) declares it advisory. ★ **Measure-then-advance:** an *unmeasured* Axis-2 (matchRate not yet computed) is `not_measured` — go measure it; do NOT treat it as a failure. Only measured-and-below-threshold triggers the fix loop. Conflating "unmeasured" with "failed" deadlocks the gate (the discipline adapted from bkit's measure-before-advance FSM).
- **Ship-hygiene mechanical scan** (before deploy/deliver — deterministic, no LLM): beyond the stack baseline above, run the **full mechanical pre-ship suite** — the cheap deterministic checks that catch "ships broken / leaks" classes the build/test baseline misses. The sprint gate runs the **proper full set** (the cheap subset — abs-paths + conflict markers + manifest validity — is the per-commit backstop in cowork-commit; sprint does NOT stop at that subset). Run all that apply to the repo:
  - **Secrets / private keys** — staged + working tree scanned for credentials/API keys/PEM blocks (gitleaks-class regex+entropy where available, else the cowork-commit secret regex).
  - **Merge-conflict markers** — `<<<<<<<` / `=======` / `>>>>>>>` shipped anywhere = broken file.
  - **Author-absolute / machine paths + hardcoded host·port** — `/Users/<you>/…`, `/home/<you>/…`, `localhost:PORT` leaking into shipped files (use `${CLAUDE_PLUGIN_ROOT}` / repo-relative / env).
  - **Manifest & config syntax validity** — every shipped `*.json`/`*.yaml`/`*.toml` (manifest, plugin.json, lockfile, CI workflow) parses; a malformed manifest breaks the consumer's install/load.
  - **Packaging hygiene** — no oversized/binary blob, scratch/build dir, or `.gitignore`d-but-referenced file accidentally staged; line-endings (CRLF in shell scripts), BOM, exec-bit/shebang on entry scripts, case/illegal-name conflicts for cross-OS clones.
  Off-the-shelf tooling exists for all of these (pre-commit-hooks, gitleaks/trufflehog, jq, shellcheck, actionlint) — use what the repo has; else a grep/parse backstop. All deterministic → flag mechanically; **ambiguous hits** (is this abs-path an intended doc example? is this a placeholder vs a live key?) escalate to the installer-POV LLM pass (irreversible gate), not silently dropped.
- **Intent-audit gate** (Tier-2 metacognition, before deploy/deliver): the QA gate above is Tier-1 (*does the output match the plan?* — literal compliance). This gate asks the harder question — *does the result serve the **intent** behind the plan/prompt, or did it satisfy the letter and miss the point?* ★ It must be run from a **reset perspective**: dispatch the `cowork-intent-auditor` agent (or a discovered equivalent reviewer) — a fresh context that did NOT do the work, fed the **intent (the PRD-lite §Success Metrics when present — the named yardstick; else the planning-dialogue intent)** + artifacts + the **gap-analysis result** (Tier-1 matchRate + gapItems). The executor cannot audit its own intent-fit (its context is full of its own rationalizations). **PASS required before deploy**; on REVISE, fix and re-audit. Catches intent-drift, invented-vs-intended behavior, self-deception, and false-completion that Tier-1 is blind to.
- **Irreversible/outward gate**: deploy, remote migration, push, mass delete → confirm even in autonomous mode; for high-stakes run an adversarial review first. ★ **Lenses are risk-selected, not a fixed count** (same principle as the baseline gate above — don't hardcode a list). Pick lenses **orthogonal** to *this* action's risk surface; minimum = `correctness` + ≥1 lens for the action's dominant risk. Each lens catches a failure mode the others are structurally blind to. Catalog (illustrative):
  - **correctness / data-integrity** — wrong results, data loss (e.g. concurrent-write drop).
  - **integration / concurrency / regression** — cross-module interaction, interleaved/parallel edits, stale assertions.
  - **consumer / installer environment** — ★ **mandatory for artifacts others install or run** (plugins, libraries, CLIs, templates, actions). Review as the installing user on a **fresh clone**, not the author on their machine — the consumer trusts your manifest/docs/interface, not your filesystem. Run it as **one structured LLM pass** (single call), emitting only **≥ high-confidence** findings, each with `file:line` + the concrete consumer-breakage + a one-line fix. Checklist (the heavy judgment the cheap mechanical commit-gate can't do):
    1. **Portability** — absolute/machine-specific paths (`/Users/<you>/…`; use `${CLAUDE_PLUGIN_ROOT}`/repo-relative), hardcoded host/port/URL, assumed `$HOME`/cwd, OS/shell assumptions.
    2. **Undeclared dependency / runtime** — a binary/lib/runtime/min-version used in code but **not declared** in the manifest/README install section → consumer install fails.
    3. **Undocumented env-var / config-key with no default** → silent break on fresh install.
    4. **Breaking change to the public interface** with no migration note — renamed/removed/redefaulted command, skill trigger, manifest field, hook contract, exported symbol, flag.
    5. **Docs ↔ behavior drift** — README/SKILL.md/CLAUDE.md/`--help` claims a behavior the code no longer delivers (or omits a new one); consumers trust docs over source.
    6. **Install → first-run integrity** — the documented happy path's referenced scripts/files/commands still resolve **after this diff** (adjacent-code reasoning: did the diff move/rename something an entry point calls?).
    7. **New required input with no fallback** → existing consumer configs/callers break.
    - **EXCLUSION (do NOT flag — noise control, per Anthropic `/code-review`):** style/naming/readability, nitpicks, anything a linter catches, theoretical/perf/DoS, diff-unrelated pre-existing issues. The v1.6.0 absolute-path bug shipped precisely because review was author-POV only — this checklist makes installer-POV systematic. *(The cheap mechanical subset — author-absolute paths, conflict markers, manifest validity — also runs per-commit as a backstop; see cowork-commit. This LLM pass is the heavy judgment layer above it.)*
    - **Provenance (public prior art — *approach* adapted, no proprietary text reproduced):** the `mechanical-first → LLM-judgment → confidence-gate + exclusion-list` shape and this checklist synthesize publicly-available prior art — **promptfoo** (MIT/OSS; assertion + CI pass-rate gating model, https://github.com/promptfoo/promptfoo), **Anthropic `/code-review` + `claude-code-security-review`** (public; the confidence threshold, the explicit exclusion list, and code-comment verification, https://github.com/anthropics/claude-code-security-review), and the **publicly-documented review capabilities** of **CodeRabbit** (undocumented-breaking-change check), **Greptile** (cross-layer env/deploy reasoning), and **Qodo/PR-Agent** (ticket/intent compliance). Only the *ideas/approach* were adapted (facts & methods, not copyrightable); **no vendor's proprietary prompt text is copied** — CodeRabbit/Greptile/Qodo internal prompts are not public. Mechanical-layer tooling is credited inline above (pre-commit-hooks, gitleaks/trufflehog, jq, shellcheck, actionlint — each its own OSS license).
  - **security / adversary** — malicious input, injection, secret/credential leakage, path traversal.
  - **portability / platform** — other OS·shell·runtime version·locale.
  - **failure / rollback** — error paths, partial failure, recoverability (esp. migrations → `references/migration.md`).

  *Intent-fit is NOT a review lens — it is the separate Tier-2 intent-audit gate (above). Keep "is the code right" (review) and "does it serve the intent" (audit) distinct.*

## 5b. Exit predicate — the DONE-WHEN contract for each phase

Borrowed from Claude Code `/goal` (a verified built-in, v2.1.139) and hardened past it. Every phase declares a machine-checkable **exit predicate** with three parts:

1. **One measurable end state** — e.g. `bun test exits 0`, build succeeds, queue empty, file count == N.
2. **The check, actually executed** — ★ the **Leader runs the check command and gates on the real exit code.** It does NOT judge completion by reading a claim in the transcript. (This is where cowork-sprint is strictly safer than `/goal`, whose evaluator only reads the conversation and can be fooled by "Claude said tests pass.") Reserve a model judgment only for genuinely subjective bars that have no exit code.
3. **Invariants that must not change** (reward-hack guard) — e.g. `no file outside src/auth/ modified`, `test count did not drop`, `coverage did not regress`. A verifiable-but-misspecified predicate ("tests pass," satisfied by deleting the tests) yields a provably-correct *useless* result; the invariant clause blocks it.

**Truthful completion (ralph rule):** declare a phase done ONLY when its predicate is genuinely, verifiably true. Never emit a false "done" to escape the loop — being stuck is a *pause*, not a finish.

**Iterate loop — convergence & stop:**
- Target = the predicate holds. **Engineering code sprints: `matchRate == 100%`** + the project's mechanical baseline green (§5 QA gate — type/compile + lint + tests in the stack's **own** tools, not a fixed `tsc`-only assumption) — do **NOT** settle for a 90% floor here. Non-code sprints: the sprint's own declared verifiable predicate.
- **Cap = 5** fix-and-recheck rounds. On each fail, **inject the failure reason** (which check failed, what the output was) into the next round's context — fix with the evidence, never re-run blind.
- If the cap is hit and the predicate still doesn't hold → do **NOT** claim "done." Pause (ITERATE_EXHAUSTED), record what's still off, and **carry** the remainder **only with an explicit written reason captured for the final report** — never a silent or unexplained deferral (CLAUDE.md "don't defer; if you must, state why").

After each sprint cluster: **free-perspective augmentation pass** — step outside the plan and look for improvements, risks, and out-of-plan impact the plan didn't anticipate (the open lens a plan-bound check misses). For code, invoke `Skill(/simplify)`.

## 5c. Worktree isolation & auto-merge (source-mutating roadmaps only)

Two layers of isolation, nested:
- **Within one session** — parallel subagents are de-conflicted by **file ownership** (one file = one role; shared files serialized to one writer per round). This is the existing `INTEGRATION` discipline (SKILL.md PHASE 1).
- **Between sessions** — a **dedicated git worktree + branch** isolates this whole sprint run from the user's working tree AND from any OTHER independent session touching the same repo concurrently. The worktree is the layer ABOVE file-ownership: file-ownership cannot prevent two separate sessions from clobbering each other's edits in one shared tree — a worktree does. This is the PRIMARY motive.

### Worktree setup (PHASE 1 entry — CONDITIONAL)

**Trigger = the roadmap mutates source/code** (edits repo files, implements, refactors). Pure research / planning / docs-only / no-source-mutation roadmaps **skip this** — the worktree overhead is not justified; work in place.

When triggered, the Leader runs ONCE at execution start, before the first cycle:

```
1. Detect the BASE BRANCH = the branch currently checked out (git rev-parse --abbrev-ref HEAD).
   The sprint branches off THIS — never silently off main.
2. slug = short kebab-case roadmap id (e.g. auth-billing-onboarding).
3. git worktree add ../<repo>-sprint-<slug> -b sprint/<slug>     # off the base branch
4. Run ALL source edits — inline AND every parallel subagent dispatch — with the worktree as cwd.
```

Caveat (already noted in SKILL.md *Dynamic local agents*): agents scaffolded **mid-session inside a worktree** may be missing from the session's agent registry — verify with one dispatch; on "Agent type not found" fall back to `subagent_type="general-purpose"` with "FIRST read .claude/agents/<role>.md" as the prompt's first step.

### Auto-merge (terminal — automatic on completion, NOT an approval gate)

A **local** merge is safe: full git history is retained and any merge is revertible (`git revert` / `reset`). So once verification passes, the Leader merges **automatically — no user-approval pause**. Verification is the precondition that gates it; user approval is not.

Run **only after every other terminal step is green**, in this fixed order:

```
ALL sprints completed
  → whole-roadmap verification GREEN (PRECONDITION — verification FAIL = no merge):
       Leader RE-RUNS build/typecheck + the FULL test suite on the INTEGRATED worktree
       (not per-slice trust — a slice's PASS can be stale once siblings merged in)
  → intent-audit PASS (Tier-2)
  → /cowork-doc-sync ran
  → AUTO-MERGE (no pause):
      a. Merge sprint/<slug> INTO THE BASE BRANCH IT FORKED FROM (main included — the merge is local).
      b. Auto-cleanup: git worktree remove ../<repo>-sprint-<slug>
                       + delete the merged sprint/<slug> branch (after the merge lands).
```

Hard safety rails (NEVER broken, even on the automatic path):
- **No hook-skipping** (`--no-verify`, `--no-gpg-sign`) and **no force** anywhere.
- **No auto-push.** The merge stays **LOCAL** — a remote `push` is always a separate, explicit user request, never automatic.
- **Verification FAIL → merge SKIPPED.** A red build/test or a failed intent-audit blocks the merge; fix or carry with a written reason, never merge around it.
- **Merge CONFLICT → STOP and report to the user.** Never auto-resolve, never force. (Auto-pause `MERGE_CONFLICT`.)

## 6. status.json schema

Path: `.ww-w-ai/cowork-sprint/status.json`

The minimal schema is authoritative in `status.schema.json`. New roadmaps include optional
`sprints[].owns` and top-level `clusters[]`; legacy state without them remains valid. Each cluster
stores `{id, mode, sprintIds, integrationOrder}`. The state helper enforces earlier-cluster
completion and commits before later starts.

```json
{
  "schemaVersion": 1,
  "revision": 0,
  "runId": "roadmap-id",
  "goal": "overall objective",
  "roadmapFile": "docs/02-planned/roadmap.md",
  "executionMode": "mixed",
  "git": {"baseBranch":"main","worktree":".worktrees/run","sprintBranch":"sprint/run","lastCommit":null},
  "sprints": [{
    "id":"S1","deps":[],"owns":["src/feature"],"planFile":"docs/02-planned/s1.md",
    "risk":{"impact":1,"recovery":1,"securityExternal":0,"contract":1,"verification":1,"total":4},
    "status":"pending","phase":"pending","commit":null
  }],
  "clusters": [{"id":"C1","mode":"sequential","sprintIds":["S1"],"integrationOrder":["S1"]}],
  "pause": null,
  "openDecisions": [],
  "updatedAt": "2026-08-25T00:00:00Z"
}
```

Only fields accepted by `status.schema.json` belong in state. QA tables, match rates, gap items,
resolved or deferred decisions, agent-evolution history, PRD detail, retry narratives, and timestamps
beyond `updatedAt` belong in Plan or Report artifacts. `openDecisions` contains only unresolved
decision resume facts. Use the state helper for all mutations; never hand-edit lifecycle state.

## 6A. Local project config (generic default + override)

cowork-sprint ships **generic defaults**. A repo MAY override them in a **local
sprint config** — `docs/CONVENTION.md` **or** a `## cowork-sprint scope`
(cowork-sprint scope) section in the repo's `CLAUDE.md`/`AGENTS.md`. The Leader
reads it **at PHASE 0 every run**; if absent, the defaults below apply (and the
Leader MAY note that project-specific knobs are undeclared). Declare only what
differs — omitted keys inherit the default. This mirrors the cowork-doc-sync §6
local-config contract exactly (same files, read-every-run, omit-inherits-default,
offer-to-scaffold).

| # | Knob | Default | Override example |
|---|------|---------|------------------|
| 1 | PRD-lite sections | Problem / Success Metrics / Out-of-scope / Pre-mortem | add Compliance; drop Pre-mortem |
| 2 | PRD-lite trigger | ≥2 features OR user-flagged uncertainty | always / never |
| 3 | matchRate threshold | 100 (code sprints) | 90 |
| 4 | matchRate method | flat (done/total) | priority-weighted |
| 5 | Gap-analysis lenses | generic item↔evidence | dev: + code/file map + e2e input→store→output |
| 6 | QA gate axes | both enforced (mechanical + gap) | gap advisory-only for non-code |
| 7 | WorkList required fields | id, description, acceptanceEvidence, priority | add owner |
| 8 | Intent-audit yardstick | PRD-lite §Success Metrics | + project KPI doc |
| 9 | profile | none (generic) | dev (→ richer dev verification; see below) |
| 10 | dev tier | standard (when profile=dev) | light / heavy |

If no local config exists, offer to scaffold one from this table (same behavior as
cowork-doc-sync). The generic *method* stays in the skill; the per-project
*what-differs* lives in the local config.

**Profiles (knob #9).** A profile is a named preset that flips a bundle of the
above knobs to dev-appropriate defaults. `profile: dev` activates the dev preset
(intent-anchor propagation, gap-analysis dev lens, plan scheduler, measure-then-
advance + auto-pause, plus tier-scaled extras) — full activation rules, the
complexity-tier table (knob #10: light/standard/heavy), the knob bundle, and the
bkit-persona→mechanism map live in **`references/dev-profile.md`**. Read it when a
sprint resolves to `profile: dev`. Auto-detection (dev markers in repo root) only
*suggests* the profile; it applies only after the PHASE 0 approval gate. Absorb the
mechanism, not the mandate — every dev knob is a default you can override or disable.

### WorkList item shape (knob #7)
Each WorkList item frozen in PHASE 0 carries, by default,
`{ id, description, acceptanceEvidence, priority }`. `acceptanceEvidence` = the
artifact/behavior that proves the item done — REQUIRED, because gap-analysis
(§5 QA Axis 2 / `references/gap-analysis.md`) compares each item against it; an
item with no evidence is unmeasurable. `priority` enables knob #4 weighting.
Promote to `templates/worklist.template.md` only if this shape recurs.

### Update timings (record on completion, not batched)

| When | Update |
|---|---|
| Roadmap planning done | initialize schema-valid sprints, clusters, git, and executionMode |
| Sprint starts | `start-sprint` records `in-progress/research` |
| Cycle phase completes | `set-phase` advances one canonical phase |
| Decision must survive resume | add one unresolved `openDecisions` entry |
| Sprint verification done | set phase `commit`, then record the real commit |
| Sprint delivery done | `complete-sprint` records `completed/done` and optional resultFile |
| Archived (optional) | `status=archived` |
| Failure or pause | use the matching helper command; detailed cause stays in the report |

## 7. Resume

Validate status.json and its revision, then resume the first unfinished cluster at its stored canonical phase. Skip completed and archived-done members. A failed or blocked member prevents later-cluster admission. Respect `clusters`, `integrationOrder`, and `deps`; transcript history is recovery evidence, not state authority.
