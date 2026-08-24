# Gap-Analysis — the QA gate's second axis ("did we build all we declared?")

> Procedure for measuring `matchRate` — the QA gate's Axis 2. Generic and
> domain-agnostic. Approach adapted from **bkit gap-detector** (Apache-2.0,
> popup-studio-ai/bkit-claude-code) — method/idea only, no source text copied.
> Pairs with: PRD-lite (intent) → WorkList (declared items) → THIS (measure) →
> intent-audit (Tier-2). Read this when running the QA gate (sprint-method.md §5).

## Why two axes
The QA gate asks two orthogonal questions; both must pass for QA green:

| Axis | Question | Source |
|------|----------|--------|
| 1 — mechanical baseline | "Does it work?" | build/lint/type/test green (sprint-method.md §5) |
| 2 — gap-analysis | "Did we build all we declared?" | WorkList ↔ output (this file) |

Tests can be 100% green while half the declared work is missing — the tests cover
only the built half. Axis 1 alone back-fills a **false** matchRate. This axis
measures it for real.

## Mechanism
1. Input = the WorkList frozen in PHASE 0. Each item carries
   `{ id, description, acceptanceEvidence, priority }` (field set = local config
   knob #7).
2. For each item, compare the declared item against the actual output and classify:
   - `done` — acceptance evidence present and matches.
   - `partial` — started, evidence incomplete.
   - `missing` — no evidence.
   - `divergent` — built, but differs from what was declared.
3. `matchRate = done / total × 100`.
   - Default: **flat** (every item counts 1) — local config knob #4.
   - Override: **priority-weighted** — a missing P0 drops the rate harder than a missing P2.
4. `matchRate < threshold` (default `100`, knob #3) → feed the gap list into the
   `fix` phase and loop (cap = sprint-method.md §5b iterate cap, default 5).
   Re-classify after each fix round; never re-run blind — inject which items are
   still `missing`/`partial`/`divergent`.

## Fresh perspective (recommended)
Self-gap-analysis is biased — the executor sees its own intent, not its omissions.
Prefer a reset-context reviewer: discover a gap-detector-class agent from the
project/user/plugin pool; else dispatch `general-purpose` with "FIRST read the
WorkList + the actual outputs, THEN classify each item" as the prompt's first step.
cowork-sprint ships **no new fixed agent** for this (only `cowork-intent-auditor`
is fixed) — discovery + this procedure, per the decision in the design doc.

## Domain adaptation (no fixed layers)
- **dev**: item ↔ file/function/endpoint + its test. Optionally sanity-check one
  end-to-end data path (input→store→output) — a generalization of bkit's 7-hop
  dataFlow check, NOT the fixed 7 layers.
- **non-dev** (marketing/research/ops/data): item ↔ deliverable (a copy block, a
  report section, a dataset slice). Never hardcode dev layers into a non-code sprint.

Lenses are a local config knob (#5); default is the generic item↔evidence compare.

## Output (recorded to status.json)
- `matchRate` — the measured value (not a target).
- `gapItems[]` — `[{ id, status, note }]` from the last run; enables resume +
  the final report without recomputation.

## Dev lens (when profile: dev)
With `profile: dev` (§6A knob #9; see references/dev-profile.md §3.2), apply these
dev signals when classifying each item — they are *signals to look for*, NOT a fixed
score formula:
- **Placeholder/stub detection** → classify `partial`, never `done`: TODO/FIXME
  markers, empty handlers, skeleton bodies (`[1,2,3].map`), hardcoded sample returns.
- **3-way contract agreement** (when an interface surface exists): spec ↔ server ↔
  client must agree on URL/method/params/shape. Disagreement → `divergent`. Under
  `profile: dev` the §7 contract-surface spec gate keeps a declared `api-spec` present,
  so this runs at full **3-way**; if the spec is absent (gate knob-off) it degrades to
  2-way (server↔client) and that degradation is **logged, never silent**. Surfaces
  generalize beyond REST: MCP tool schema ↔ handler ↔ description, CLI flag ↔ parser ↔
  docs, function signature ↔ callsites (see references/dev-profile.md §7).
- **Anti-gaming**: evidence must be real depth, not "a file exists". Never mark
  `done` without verifying behavior; don't add comments/stubs to inflate the rate.
- **code+test pairing** (default-on at standard+ tier): an implementation item with
  no test → `partial`.
- **Dataflow sub-lens** (web-fullstack, opt-in): trace one end-to-end write path; for
  web apps the hops UI→Client→API→Validation→DB→Response→UI are an *example*
  checklist, not fixed layers.

### Multi-axis scoring (dev sprints — use it, adapt the axes)
Flat `done/partial/missing` catches "is it there"; it under-counts *how well* each
item holds up. For a **code/dev sprint, score each item across the dimensions that
apply** — this discipline is the dev default, NOT an opt-in. (Scoring by a single
number lets shallow work pass; the multi-axis view is what surfaces "built but
hollow".) Adapt WHICH axes apply to your environment; do not drop the multi-axis
discipline itself.

Reference axis set (adapt to the work, don't hardcode blindly):
- **Structural** — the scaffolding exists and is wired in (files/modules/routes present).
- **Functional** — it actually performs the declared behavior, not a stub.
- **Contract** — spec ↔ server ↔ client agree on shape/URL/params (when an interface exists;
  3-way when a declared spec is present per the dev-profile §7 gate, else 2-way + logged).
- **Intent** — it serves the PRD-lite intent (WHY/SUCCESS), not just the literal instruction.
- **Behavioral** — edge cases, error paths, and states are handled.
- **UX** — interaction/feedback correctness (frontend only).
- **Runtime** — verified by actually executing it (only when a run is possible).

Adaptation rule (environment-fit, NOT axis-skipping): an axis with no surface in
THIS work redistributes its weight — it is not silently zero. Non-frontend → fold
**UX** into Functional/Intent. No execution harness → **Runtime** is `not_measured`
(§3.4 measure-then-advance), never faked green. A pure-logic lib may collapse to
Structural + Functional + Behavioral + Intent. Record which axes you applied (and why
an axis was dropped) in `gapItems[].note`.

Every applied axis score MUST be backed by cited evidence (`file:function` or a run
record). Target stays **100** (knob #3); a shortfall on any applied axis → `partial`
/`divergent`, fed to the fix loop. Non-code sprints keep the flat item↔evidence
compare — this multi-axis reference is a dev-sprint discipline, not a non-dev mandate.

## Local config
matchRate threshold (#3), method flat/weighted (#4), lenses (#5), QA-axis
enforcement (#6), and WorkList fields (#7) are read from the repo's sprint config
(`docs/CONVENTION.md` or a `## cowork-sprint scope` section in `CLAUDE.md`/`AGENTS.md`)
**every run**; omitted keys inherit the defaults above. See SKILL.md / sprint-method.md §6A.

## Provenance
The classification scheme (`done/partial/missing/divergent` → `matchRate`) and the
two-axis gate idea are adapted from bkit's `gap-detector` agent (Apache-2.0).
Facts and methods only — not copyrightable expression; no bkit source is reproduced.
