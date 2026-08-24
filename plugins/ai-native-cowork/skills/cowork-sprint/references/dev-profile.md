# Dev Profile — richer dev verification, flexibly (a §6A preset)

> The dev profile is ONE named preset in the §6A local-config system
> (sprint-method.md §6A). It turns on richer dev-delivery verification when the
> work is software dev, and stays out of the way otherwise. Read this when a
> sprint's profile resolves to `dev`.
>
> Governing principle: **absorb the mechanism, not the mandate.** Every item here
> is a *default behind a knob* — change it or turn it off in the local config.
> Nothing here adds an enforced phase. Design source:
> docs/02-planned/dev-profile.design.md. Mechanisms adapted from bkit (Apache-2.0)
> — methods/ideas only, no source copied (see Provenance).

## 1. Activation (dev-only, never forced)

- **Auto-detect (advisory)**: dev markers in repo root — `package.json`, `go.mod`,
  `Cargo.toml`, `pyproject.toml`, `pom.xml`, `build.gradle`, etc. Presence →
  *suggest* the dev profile at PHASE 0. Detection only suggests.
- **Explicit**: the local config (`docs/CONVENTION.md` or `## cowork-sprint scope`
  in `CLAUDE.md`/`AGENTS.md`) sets `profile: dev` (or `none`, or a future
  `marketing`/`research`).
- **Override always wins.** The user/config decides; auto-detect never auto-applies
  without the PHASE 0 approval gate.
- Non-dev sprints are untouched — the generic defaults (prd-to-gap chain) apply.

## 2. Complexity tier (suggested defaults, not gates)

Within dev, an optional tier scales ceremony. Tiers are *defaults* — any knob can
be flipped regardless of tier.

| tier | marker (default, overridable) | dev knobs on by default |
|------|-------------------------------|-------------------------|
| `light` | static site / single package | gap-analysis + mechanical baseline |
| `standard` | app with deps | + bounded-iterate, code+test pairing, intent anchor |
| `heavy` | k8s / terraform / multi-service | + plan scheduler, dataflow sub-lens, design-alternatives |

Detect → suggest → apply only after the PHASE 0 approval gate (consistent with the
existing approval gate; never silent auto-apply).

## 3. The knob bundle (what `profile: dev` switches on)

All are defaults. `profile` (#9) and `tier` (#10) are the §6A knobs that switch this
bundle on/scale it; the individual sub-defaults below (safetyMargin, plateau-K,
iterate cap, test depth, design-alternatives) are tunable via free-form local-config
keys — they are NOT each a numbered §6A knob. (§6A exposes #1–#10; only #9/#10 are
dev-specific.)

### 3.1 Intent Anchor propagation (Tier S)
The PRD-lite IS the anchor. Propagate its Problem + Success Metrics forward as the
intent contract every cycle phase and the intent-audit reference. Default suggested
fields = WHY / WHO / RISK / SUCCESS / SCOPE (PRD-lite knob #1) — add/drop freely.
No separate presence gate; the anchor is just the PRD-lite step carried forward.

### 3.2 Gap-analysis dev lens (Tier S)
Adds dev signals to the QA Axis-2 gap-analysis (references/gap-analysis.md § Dev
lens): placeholder/stub detection (→ classify `partial`, not `done`), 3-way
contract agreement (spec ↔ server ↔ client) when an interface surface exists — kept at
full 3-way (not silently degraded to 2-way) by the §7 contract-surface spec gate,
"evidence must be real depth, not a file that exists" (anti-gaming). On top of these signals, a dev
sprint scores each item across the applicable **multi-axis reference** (Structural/
Functional/Contract/Intent/Behavioral/UX/Runtime — gap-analysis.md § Multi-axis
scoring): applying the multi-axis discipline is the dev default (NOT opt-in), while
WHICH axes apply adapts to the environment (drop UX with no UI, Runtime only when a
run is possible, redistribute — never silently zero). The matchRate aggregation
method stays knob #4 (flat vs priority-weighted); the axis SET is adapted per work,
never blindly hardcoded.

### 3.3 Plan scheduler (Tier S, generic)
OFFERS (does not force) a deterministic scheduler in PHASE 0: given the feature
list + dependency graph →
1. **topological sort** (Kahn) by dependency edges; detect cycles and report them.
2. **greedy bin-packing** into sprints under a budget:
   `effectiveBudget = maxPerSprint × (1 − safetyMargin)` (default margin 0.25).
3. a single feature exceeding the budget → its own sprint, flagged `oversized`.
4. compute cross-sprint `dependsOn` edges from the original graph.

Estimator is **pluggable** — default coarse size buckets (S/M/L → rough token
weight), NOT LOC-locked; a repo may swap in a token-guess estimator (decision §6.1).
The Leader may accept, tweak, or ignore the suggested grouping — it is an aid, not a
verdict. Keep synthesis vs side-effects separate: the grouping math is deterministic
Leader work, not an LLM guess.

### 3.4 Cycle safety: measure-then-advance + auto-pause (Tier S)
Two disciplines, both as principles + overridable defaults:
- **Measure before you advance** — never treat an *unmeasured* gate as failed.
  Applies to the two-axis QA gate: if Axis-2 matchRate is not yet measured, that is
  `not_measured` (go measure it), distinct from `measured-and-below-threshold`
  (fail → fix loop). Conflating the two deadlocks the sprint.
- **Auto-pause conditions** (cowork already arms these in SKILL.md Gates):
  quality regressed / iterate cap hit / budget blown / phase hung. The dev profile
  supplies default **thresholds** (e.g. budget/time bounds), which are tunable — but
  the trigger SET itself is fixed safety (SKILL.md Gates lists the canonical fixed
  set). You tune the thresholds, not which safety triggers are armed.

### 3.5 Tier A (default-on for standard+; all optional)
- **Bounded iterate**: cap N (default 5) + **plateau detection** (stop after 2
  rounds of no matchRate improvement) + anti-gaming guard ("don't add
  comments/stubs to inflate the score").
- **L1-L5 test vocabulary** for the Axis-1 baseline (unit / api / e2e / ux /
  dataflow) with **graceful degradation** (skip levels the stack can't run, note
  the skip). Guidance, not a required matrix.
- **code+test pairing**: an impl WorkList item with no test → gap-analysis classes
  it `partial`. Default-on standard+; off-able.
- **Design alternatives**: when a design doc is produced, *suggest* ≥2 considered
  approaches + rationale. A nudge in the design step, never a gate.

### 3.6 Sub-lenses / opt-in (respecting openness)
- **7-layer dataFlow** (web-fullstack only): offered under the dataflow knob as
  "trace one end-to-end write path", with the hops UI→Client→API→Validation→DB→
  Response→UI as an *example* checklist. Not a default.
- **Layer-purity lint** (e.g. a `lib/domain/` no-IO check): optional dev lint a
  repo can enable; never an imposed source structure.
- **bkend.ai skills**: only behind an explicit "uses bkend.ai" sub-flag.

## 4. Dev agent legion (vendored) + persona mechanisms

Under `profile: dev` the Leader has a **vendored dev-agent legion** in `agents/`
(Apache-2.0 from bkit, vendored — no bkit install needed; see THIRD-PARTY-NOTICES.md).
They join cowork's normal discovery pool; profile:dev just means the Leader reaches
for them at the right moment ("you don't have to know — the right expert is dispatched").

**Verification (read-only review) — dispatch in the cycle's review/QA/gate steps:**
- `gap-detector` — QA **Axis-2 fresh-perspective reviewer**: classify each WorkList
  item done/partial/missing/divergent → matchRate (the §3.2 dev lens executor).
- `code-analyzer` — code quality / security / perf, **confidence ≥80 gating** + severity.
- `design-validator` — pre-`do` design completeness gate (don't build on an incomplete spec).
- `security-architect` — OWASP / security lens, esp. at the irreversible/deploy gate.

**Test (Tier A L1-L5) — dispatch in QA Axis-1 when tests are in scope:**
- `qa-test-planner` → `qa-test-generator` — design → L1-L5 plan (JSON) → runnable tests
  (framework auto-detected), with graceful degradation.
- `qa-debug-analyst` — when a runtime failure needs to be made observable: designs
  structured logging + traces the failing path to a cited root cause. Runtime-agnostic
  (no docker assumption); use the log surfaces the stack actually has.

**Builders — dispatch by the work's domain (heavy tier mostly):**
- `frontend-architect` (UI / components / design-system) · `infra-architect`
  (cloud / K8s / Terraform / CI-CD) · `enterprise-expert` (architecture strategy,
  go/no-go, 3-prerequisite self-gate).
- `bkend-expert` — **OPTIONAL, only when the project uses bkend.ai BaaS** (gated; do not
  dispatch otherwise).

**Sprint personas absorbed as MECHANISM (not shipped agents):**
| bkit persona | absorbed as |
|--------------|-------------|
| sprint-master-planner | §3.3 plan scheduler (PHASE 0 + sprint-method.md) |
| sprint-orchestrator | §3.4 cycle-safety (measure-then-advance + auto-pause) |
| sprint-qa-flow | §3.6 dataflow sub-lens (gap-analysis dev lens) |
| sprint-report-writer | carry-item rule (matchRate<100 → carry) — already in cowork report |

Principle kept from bkit: **pure-synthesis isolation** — a vendored agent returns
content; deterministic work (scheduling math, state writes, gate evaluation) stays
with the Leader/procedure. This already matches cowork's "Leader coordinates, work is
delegated." The vendored agents are also self-evolvable per cowork's normal rules
(they are owned project-local scaffolds once vendored).

## 5. What this profile deliberately does NOT bring
Fixed 9-phase enum, M1-M10 numeric SSoT, `.bkit/` checkpoint store, CI invariants,
token-ledger, enforced Clean-Architecture source layout — all against the
lightweight/open stance. Absorbed as principles where useful, never as mandates.

## 6. Dev methodology (absorbed principles — all defaults, not mandates)

bkit codifies a dev philosophy; cowork absorbs the *principles*, expressed cowork-style
(knob + default, never a hard process):

- **Context Engineering** — give each cycle phase exactly the context it needs, when it
  needs it (not the whole history). cowork already does research-before-do + intent
  anchor; under dev: feed `do` the design doc + the WorkList slice it touches, feed
  review the gap result, feed intent-audit the PRD Success Metrics — not everything
  everywhere. (This is also why the vendored agents are read-only/scoped.)
- **Docs=Code (design-first, enforced by gap)** — the design doc is the contract;
  `gap-detector` (vendored) enforces design↔implementation agreement at QA Axis-2.
  Code that diverges from the design without updating it is a gap (`divergent`), not `done`.
- **Convention-first** — establish a shared glossary + conventions BEFORE building
  (bkit phase-1/2 idea), so every dispatched agent emits consistent, on-vocabulary code.
  Default: a lightweight `docs/` glossary + conventions note at PHASE 0 for multi-feature
  dev sprints; skip for trivial. Knob-able.
- **Quality-gate pack (the "11")** — bkit's M1-M10 + S1 offered as a dev DEFAULT bundle,
  each a tunable knob, none a hard mandate: matchRate (#3), critical-issues = 0,
  convention compliance, design completeness, API compliance, success-criteria coverage,
  dataflow integrity. Measured by the vendored verification agents; evaluated
  measure-then-advance (§3.4). A repo dials thresholds or disables gates via local config.
- **Trust-based autonomy** — how far a sprint auto-runs scales with *earned* trust
  (gate-pass / low-rollback streak), not a fixed flag. cowork already has autorun scope;
  under dev a clean streak widens it, a failure narrows it. Default conservative; never
  auto-escalates past the approval gate.

## 7. Architecture lenses (dev — mostly opt-in, one default-on gate)

Dev lenses — never an imposed source structure (openness stance). Most are opt-in; the
contract-surface spec gate is a *default-on* gate (still knob-disable'able) because a
silently-degraded contract check is a real correctness hole, not a style preference:
- **Clean Architecture** — optional lint: business logic free of IO/framework imports
  (e.g. a `domain/` no-`fs`/`http` check). Enable per repo; cowork imposes no layout.
- **Contract-surface spec gate (default-ON in dev; conditional on interface surface)** —
  when the WorkList declares an **interface surface** (server route / client fetch / MCP
  tool / CLI flag / exported function signature), the declared contract doc (`api-spec` —
  a design-phase output) is REQUIRED before `do`. This is a *default-on gate* (free-form
  local-config knob `contractSpecGate`, disable per repo), NOT a nudge — because without a
  declared spec the contract check silently collapses to 2-way (server↔client) and can no
  longer catch a *wrong-shaped intended contract*. The gate keeps the check at full
  **3-way** (spec↔server↔client) strength; `gap-detector` then verifies it.
  - **Scope discipline** (why it lives in dev-profile, not the generic skill): fires ONLY
    when an interface surface exists — pure UI / CLI-less / data-only / non-dev sprints are
    untouched. "Mandatory" is scoped to *dev sprints that actually have an API surface*.
  - **No silent degradation**: interface surface present + spec absent →
    (gate ON) design-phase **FAIL**, fed to the fix loop; (gate OFF by knob) run 2-way but
    **LOG** "contract check degraded to 2-way — no api-spec" in the QA table. Never a silent
    2-way (matches the global NO-silent-truncation stance).
  - **Bootstrap friction reducer** (don't demand a hand-written spec from scratch): scan
    the server routes (and MCP / CLI / signature surfaces) to **auto-scaffold an `api-spec`
    STUB** — URL · method · params reverse-derived from code → the human fills only the
    response shapes. api-first made cheap: derive from code, then converge.
  - **Generalized beyond REST**: the same 3-way diff applies to every surface in the user's
    CONTRACT-SYNC rule — MCP tool in/out schema ↔ handler ↔ advertised description; CLI flag
    ↔ parser ↔ docs/help; function signature ↔ callsites. REST is the first instance, not
    the only one.
- **7-Layer dataflow verification** — the web-fullstack dataflow sub-lens (§3.6): trace
  UI→Client→API→Validation→DB→Response→UI as an *example* end-to-end checklist (opt-in;
  non-web dev traces its own end-to-end path). Executed by `gap-detector` / a runtime probe.

## Provenance
Mechanisms adapted from bkit (Apache-2.0, popup-studio-ai/bkit-claude-code):
Context Anchor, gap-detector scoring signals, sprint-master-planner topo-sort +
bin-packing, sprint-orchestrator auto-pause + measure-then-advance, pdca-iterator
plateau/anti-gaming, qa-lead L1-L5 taxonomy, M2/M4 design/test discipline.
Methods/ideas only — not copyrightable expression; no bkit source reproduced.
