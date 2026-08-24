# Design: cowork-sprint "dev profile" — absorbing bkit's dev strengths, flexibly

> Status: BUILT (v1.13.0) — as-built design. Live authority = `skills/cowork-sprint/references/dev-profile.md` (+ vendored `agents/`). Design-of-record; for current behavior read the skill.
> Builds on: [prd-to-gap-intent-chain.design.md](./prd-to-gap-intent-chain.design.md) (the §6A local-config + gap-analysis chain this extends).
> Provenance: mechanisms adapted from **bkit** (Apache-2.0, popup-studio-ai/bkit-claude-code).
> Method/ideas only — no source text copied. Attribution in each absorbed reference file.

---

## 1. Guiding principle — absorb the mechanism, not the mandate

bkit's author (Kay) optimizes for detailed definition and tight control; this
project optimizes for generalization and openness. So we take bkit's *value*
(the mechanisms that add dev rigor) but **refuse its rigidity**:

- bkit says "MUST be matchRate ≥ 90 / exactly 9 phases / fixed 7 layers / M1-M10
  SSoT" → we take it as **a sensible default behind a knob you can change or off**.
- bkit ships **fixed personas + CI-enforced gates + .bkit state infra** → we take
  the **role definition + the mechanism**, expressed as cowork's existing shapes
  (local-config knobs §6A, scaffolded agents, the existing cycle gates).
- Nothing here is a new enforced phase. The dev profile is a **preset of defaults**
  that turns on richer dev verification when the work is dev — and stays out of the
  way otherwise.

**Test of every absorption**: if it can only exist as a hardcoded number/layer/phase,
we reframe it as a knob + default. If it cannot be reframed flexibly, we drop it.

## 2. Activation — dev-only trigger, never forced

The dev profile is one named preset in the §6A local-config system.

- **Auto-detect** (advisory): dev markers in repo root — `package.json`, `go.mod`,
  `Cargo.toml`, `pyproject.toml`, `pom.xml`, etc. Presence → suggest dev profile.
- **Explicit**: `## cowork-sprint scope` / `docs/CONVENTION.md` declares
  `profile: dev` (or `none`, or a future `marketing`/`research`).
- **Override always wins.** Auto-detect only *suggests*; the user/config decides.
- Non-dev sprints are untouched — the generic defaults (prd-to-gap design) apply.

Within dev, an optional **complexity tier** (adapted from bkit's level system, made
generic) scales ceremony — but as defaults, not gates:

| Tier | Marker (default, overridable) | Default dev-knobs on |
|------|-------------------------------|----------------------|
| light | static site / single package | gap-analysis + mechanical baseline |
| standard | app with deps | + bounded iterate, code+test pairing, intent anchor |
| heavy | k8s/terraform/multi-service | + scheduler, dataflow lens, design-alternatives |

Tiers are **suggested defaults** — any knob can be flipped regardless of tier.

## 3. Absorbed assets (each reframed as knob + default)

### 3.1 Intent Anchor (from bkit Context Anchor + M3) — Tier S
- bkit: fixed 5-field anchor (WHY/WHO/RISK/SUCCESS/SCOPE) copied verbatim into every
  phase doc, M3 gate enforces presence.
- **Flexible form**: the PRD-lite (already in the prd-to-gap design) IS the anchor.
  Propagate its Problem + Success Metrics forward as the intent contract every cycle
  phase and the intent-audit reference. Default suggested fields = bkit's five, but
  the field set is **PRD-lite knob #1** — add/drop freely. No separate M3 gate; the
  anchor's presence is just the PRD-lite step.
- Why flexible: an anchor's *value* is "stable propagated intent," not "these exact 5 fields."

### 3.2 Gap-analysis dev lens (from gap-detector) — Tier S
- bkit: weighted score formula (Structural/Functional/Contract/Intent/Behavioral/UX
  with fixed weights) + placeholder-depth 0-100 + 3-way contract check.
- **Flexible form**: extend `references/gap-analysis.md` with a **dev lens** =
  *signals to look for*, NOT a fixed formula:
  - placeholder/stub detection (TODO, empty handlers, `[1,2,3].map` skeletons →
    classify `partial`, not `done`).
  - 3-way contract agreement (spec ↔ server ↔ client on shape/params) when an
    interface surface exists — kept at full 3-way by the **contract-surface spec gate**
    (dev-profile.md §7): under `profile: dev`, when the WorkList declares an interface
    surface (REST route / client fetch / MCP tool / CLI flag / function signature) the
    `api-spec` design-output is REQUIRED before `do` (default-ON gate, free-form knob
    `contractSpecGate`). Absent spec → design FAIL (gate on) or logged 2-way degradation
    (gate off) — never silent. Bootstrap friction reduced by auto-scaffolding an
    api-spec STUB reverse-derived from code (human fills response shapes only).
    Source: btw-001 (contract-surface diff QA lens), 2026-07.
  - "evidence must be real depth, not a file that exists" (anti-gaming).
  Multi-axis scoring (the 7 dimensions above) is the **dev-sprint default
  discipline — NOT opt-in** (opt-in gets ignored); WHICH axes apply adapts to the
  environment (drop UX with no UI, Runtime only when executable, redistribute —
  never silently zero). What we do NOT hardcode is a *fixed weighted formula*: the
  matchRate aggregation stays knob #4 (flat vs priority-weighted) and the axis SET
  adapts per work. See `references/gap-analysis.md § Multi-axis scoring`.
- Why flexible: the multi-axis discipline is portable wisdom (use it); the exact
  fixed weights are Kay's taste (don't hardcode) — the two are separable.

### 3.3 Plan scheduler (from sprint-master-planner) — Tier S, generic
- bkit: Kahn topological sort + greedy bin-packing by token budget; LOC×tokensPerLOC estimator.
- **Flexible form**: offer (not force) a deterministic scheduler in PHASE 0 — given
  the feature list + dependency graph, topo-sort + pack into sprints under a budget.
  This is **fully domain-agnostic** (operates on opaque names + estimates). The
  estimator is pluggable (default a coarse size heuristic, not LOC-locked). The
  Leader may accept, tweak, or ignore the suggested grouping — it's an aid, not a verdict.
- Why absorb wholesale: it's an algorithm, not a mandate — already matches cowork's openness.

### 3.4 Cycle safety: auto-pause + measure-then-advance (from sprint-orchestrator) — Tier S
- bkit: 4 fixed triggers (gate-fail / iteration-exhausted / budget / timeout) + FSM
  that requires a gate's numeric `current` measured before advancing.
- **Flexible form**: cowork already has iterate caps and gates. Add as **principles +
  default thresholds (all knobs)**:
  - "measure before you advance" — don't treat an *unmeasured* gate as failed (the
    bug bkit's FSM fixes); applies to our two-axis QA gate.
  - pause conditions: quality regressed / iteration cap hit / budget blown / phase
    hung. Default thresholds provided, each overridable; a repo may arm fewer.
- Why flexible: the *discipline* (measure-then-advance, bounded auto-run) is universal;
  the specific numbers are defaults, not law.

### 3.5 Tier A (defaults-on for standard+ dev, all optional)
- **Bounded iterate loop** (from pdca-iterator): cap N (default 5) + **plateau
  detection** (stop after K rounds of no improvement) + anti-gaming guard. Reframed
  as the stop-condition for our existing fix loop.
- **L1-L5 test depth vocabulary** (from qa-lead): a shared *vocabulary* for the QA
  Axis-1 baseline (unit / api / e2e / ux / dataflow) with **graceful degradation**
  (skip levels the stack can't run, note the skip) — guidance, not a required matrix.
- **code+test pairing** (from M4/do.template): gap-analysis dev lens treats an
  impl item with no test as `partial`. Default-on for standard+; off-able.
- **Design alternatives** (from M2): when a design doc is produced, *suggest*
  ≥2 considered approaches + rationale. A nudge in the design step, never a gate.

### 3.6 Dropped / hard-sub-option (respecting openness)
- **7-Layer dataFlow**: web-fullstack only → offered as a *dev sub-lens* under the
  dataflow knob, not a default. Generalized to "trace one end-to-end write path,"
  with the 7 hops as an example checklist for web apps.
- **Clean-Arch 4-layer + check-domain-purity**: offered as an *optional lint* a repo
  can enable; never an imposed source structure.
- **Fixed M1-M10 SSoT, .bkit checkpoint store, CI invariants, token-ledger**: dropped
  — bkit-infra-specific and against the lightweight stance.
- **bkend-* skills**: vendor-locked; only behind an explicit "uses bkend.ai" sub-flag.

## 4. How personas come across (sprint team → cowork)

cowork ships one fixed agent (`cowork-intent-auditor`) and scaffolds the rest. bkit's
sprint personas are absorbed as **mechanisms in the dev-profile procedure / scaffold
templates**, not as new shipped agents:

- sprint-master-planner → the §3.3 scheduler (procedure in PHASE 0 + sprint-method.md).
- sprint-orchestrator → §3.4 cycle-safety principles (sprint-method.md gates).
- sprint-qa-flow → §3.6 dataflow sub-lens (gap-analysis.md dev lens).
- sprint-report-writer → carry-item rule already in cowork report; adopt its
  "matchRate<100 → carry" threshold as a dev default.
- gap-detector / code-analyzer → §3.2 gap-analysis dev lens + confidence-gating
  (the one persona pattern worth a scaffold template, since fresh-perspective review
  is already cowork's model).

Principle kept from bkit: **pure-synthesis isolation** (the LLM persona returns
content; deterministic work — scheduling math, state writes — lives in the
procedure/Leader). This already matches cowork's "Leader coordinates, work is delegated."

## 5. Files touched (implementation)

| File | Change |
|------|--------|
| `references/sprint-method.md` | EDIT — §6A add `profile` + `tier` knobs; PHASE 0 scheduler (§3.3); cycle-safety principles (§3.4) |
| `references/gap-analysis.md` | EDIT — add dev lens (§3.2): placeholder/contract/anti-gaming signals; dataflow sub-lens (§3.6) |
| `references/dev-profile.md` | NEW — the dev preset: activation, tier table, the knob-default bundle, persona-mechanism map |
| `templates/prd-lite.template.md` | EDIT — note anchor propagation (§3.1); default fields = bkit five (overridable) |
| `SKILL.md` | EDIT — PHASE 0 notes dev-profile detection + offers scheduler |

## 6. Open decisions (recommend → proceed)
1. **Scheduler estimator** — coarse size buckets vs token-guess. *Recommend:* coarse
   buckets (S/M/L) default; token-guess opt-in. Keeps it generic.
2. **Tier auto-detect vs always-ask** — *Recommend:* detect→suggest, never auto-apply
   without the PHASE 0 approval gate (consistent with cowork's existing approval).
3. **dev lens as one ref vs split** — *Recommend:* keep in gap-analysis.md (one place)
   until it outgrows it.

## 7. Provenance / license
Mechanisms adapted from bkit (Apache-2.0): Context Anchor, gap-detector scoring
signals, master-planner topo-sort+bin-packing, orchestrator auto-pause + measure-then-
advance, pdca-iterator plateau/anti-gaming, qa-lead L1-L5 taxonomy, M2/M4 design/test
discipline. Ideas/methods only — not copyrightable; no bkit source reproduced. Each
absorbed reference file carries an attribution line. bkit is permissive (Apache-2.0) —
notice suffices, no copyleft blocker.
