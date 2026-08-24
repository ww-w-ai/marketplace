# Design: PRD → WorkList → Gap-Analysis → Intent-Audit chain for cowork-sprint

> Status: BUILT (v1.13.0) — as-built. Live authority = `skills/cowork-sprint/references/{gap-analysis,dev-profile}.md` + `sprint-method.md` §6A. Design-of-record; for current behavior read the skill.
> Scope: `skills/cowork-sprint` only. Domain-agnostic, lightweight, repo-local.
> Provenance: approach adapted from **bkit** (`bkit:sprint` prd phase + `gap-detector` agent, Apache-2.0).
> Only the *method/approach* is adapted — no proprietary text copied. See §8.

---

## 1. Problem

cowork-sprint already names `matchRate == 100%` as its QA target and stores a
`matchRate` field in status.json, but **there is no mechanism that computes it.**
The QA gate today verifies only the *mechanical baseline* (build/lint/type/test
green) + exit predicate, then declares matchRate. Two consequences:

1. **"Works" is mistaken for "complete."** Tests can be 100% green while only
   half the declared work is built (the tests cover only the built half).
   "Did the code run?" is a different question from "Did we build everything we
   declared?" — the latter is unmeasured.
2. **Intent is scattered.** The intent-audit gate (`cowork-intent-auditor`)
   judges whether output *serves the intent*, but that intent lives only in
   PHASE 0 dialogue + design docs. There is no single, named source of intent +
   success criteria for the auditor to compare against.

This design closes both gaps by threading one intent-to-verification chain
through the existing cycle, **reusing structures cowork-sprint already has**
(matchRate field, WorkList, intent-audit, QA gate) rather than adding a heavy
new subsystem.

## 2. The chain (single source of truth flow)

```
PRD-lite (WHY + success criteria)
   │  intent + Success Metrics
   ▼
WorkList (WHAT — declared items, each with acceptance evidence)
   │  declared work
   ▼
Gap-Analysis (DID-WE — WorkList vs actual output → measured matchRate)
   │  matchRate, gap items
   ▼
Intent-Audit (DID-IT-SERVE — output vs PRD Success Metrics, fresh perspective)
```

- **Tier-1 = Gap-Analysis** (quantitative: output matches the declared plan).
- **Tier-2 = Intent-Audit** (qualitative: output serves the PRD intent).
- PRD-lite is the anchor both ends reference (success criteria define what
  intent-audit measures; WorkList derives from PRD scope).

## 3. Design principles (preserve cowork-sprint philosophy)

1. **Domain-agnostic.** dev / marketing / research / ops / data. No code-only
   assumptions in the generic mechanism (code specifics are an optional dev lens).
2. **No fixed tool/layer list.** Do NOT port bkit's fixed 7-layer dataFlow or
   M1–M10 gates. Express gap-analysis as "compare each declared item to its
   evidence" — the *discipline*, not a hardcoded checklist.
3. **Lightweight, skip-able.** PRD-lite and gap-analysis apply to multi-feature
   or high-uncertainty sprints. Trivial/single-feature sprints skip both
   explicitly (state the skip — never silent).
4. **Reuse, don't accrete.** Extend existing matchRate field + WorkList +
   intent-audit. Minimum new files.
5. **repo-local only** (ships to all users — no personal-system assumptions).
6. **Generic default + local override** — every tunable below is a config knob
   with a built-in generic default; a repo may override via a local config the
   skill reads every run (§6A). Mirrors the cowork-doc-sync §6 contract pattern.

## 4. The four elements

### 4A. PRD-lite (PHASE 0)

New template `templates/prd-lite.template.md` — 4 sections only:

1. **Problem / Why** — what this sprint solves, for whom.
2. **Success Metrics** — quantitative + qualitative. ← the intent-audit yardstick.
3. **Out-of-scope** — explicit boundary (scope-creep guard).
4. **Pre-mortem** — 2–3 failure scenarios + prevention.

Placement: PHASE 0, after scope dialogue, **before** WorkList/design. PRD-lite
is the input to WorkList (mirrors bkit's Context-Anchor-copied-forward pattern).

Gate: produced only when sprint is multi-feature OR uncertainty is high.
Otherwise record "PRD-lite skipped — trivial/single-feature" and proceed.

Not new work for the user: this **structures** the brainstorming the user
already does into a fixed 4-section anchor; it does not invent a new phase.

### 4B. WorkList (strengthen existing)

cowork-sprint already freezes a per-feature design doc + WorkList in PHASE 0.
Change: each WorkList item must be **gap-checkable** — carry an id + verifiable
completion evidence:

```
{ id, description, acceptanceEvidence, priority }
```

- `acceptanceEvidence` = the artifact/behavior that proves the item done
  (dev: file/function/endpoint + test; non-dev: the deliverable — copy, report,
  dataset row). Without this field, gap-analysis has nothing to compare against.
- `priority` enables optional weighted matchRate (§4C decision).

Optional new template `templates/worklist.template.md` OR specify the item
shape inside the design doc — decision in §7.

### 4C. Gap-Analysis (new layer inside the QA gate) — core

Location: the cycle's `do → QA → fix`. Add gap-analysis **inside** the QA gate.

Mechanism (generic, bkit gap-detector approach adapted):

1. For each WorkList item, compare declared item ↔ actual output, classify:
   - `done` — evidence present and matches.
   - `partial` — started, evidence incomplete.
   - `missing` — no evidence.
   - `divergent` — built, but differs from what was declared.
2. `matchRate = done / total × 100` (optionally priority-weighted — §7).
3. This populates status.json `matchRate` with a **measured** value
   (today it is a target only).

**Two-axis QA gate** (the key correction):

| Axis | Question | Source |
|------|----------|--------|
| Axis 1 — mechanical baseline | "Does it work?" | build/lint/type/test green (existing) |
| Axis 2 — gap-analysis | "Did we build all we declared?" | WorkList vs output matchRate (new) |

Both must pass for QA green. Today only Axis 1 exists and matchRate is
back-filled from it — that is the bug this fixes.

- Gap result → `fix` input. `matchRate < 100` → fix loop (cowork-sprint's exit
  predicate already mandates `matchRate == 100` for code sprints).
- **Fresh perspective recommended.** Like intent-audit, self-gap-analysis is
  biased. Prefer a reset-context reviewer (discovered gap-detector-class agent,
  else general-purpose with "FIRST read the WorkList + outputs" injected).
  cowork-sprint ships no new fixed agent for this (philosophy: only
  `cowork-intent-auditor` is fixed) — discovery + procedure instead.
- **Domain adaptation:** dev = file/code ↔ item, plus optional end-to-end
  input→store→output sanity (bkit's 7-hop generalized, NOT the fixed layers).
  non-dev = deliverable ↔ item. Never hardcode the dev layers.

New reference `references/gap-analysis.md` holds the procedure + domain
adaptations (keeps SKILL.md and sprint-method.md lean).

### 4D. Intent-Audit (existing — wire to PRD)

`cowork-intent-auditor` (Tier-2) already runs before deploy. Change: feed it
the **PRD-lite Success Metrics as the explicit yardstick**. Input becomes
`intent (PRD §Success Metrics) + artifacts + gap-analysis result`. PRD-lite
gives the auditor the single named source of intent it currently lacks.

## 5. Integrated cycle (final)

```
PHASE 0: scope dialogue
         → [PRD-lite]                (multi-feature/uncertain only; else skip+note)
         → WorkList (items + acceptanceEvidence + priority) + design
         → planning approval gate

PHASE 1: research → plan-detail → design → do
         → QA gate:  Axis1 mechanical baseline green
                     AND Axis2 gap-analysis matchRate == 100   (fresh perspective)
         → fix   (matchRate < 100 → loop; cap = existing iterate cap)
         → intent-audit  (PRD Success Metrics yardstick, fresh, PASS required)
         → commit → deploy/deliver
```

## 6. status.json schema delta

- `matchRate` — now a **measured** value (field already exists).
- `prdRef` — path to PRD-lite (null when skipped).
- `gapItems[]` — `[{ id, status, note }]` from the last gap-analysis run
  (enables resume + report without recompute).

Keep additions minimal; everything else unchanged. Orthogonality: these live in
cowork-sprint's own status.json, touch nothing else.

## 6A. Local project config contract (generic default + local override)

cowork-sprint ships **generic defaults**. Each repo MAY declare project-specific
overrides in a **local sprint config** — either `docs/CONVENTION.md` **or** a
`## cowork-sprint scope` section in the repo's
`CLAUDE.md`/`AGENTS.md`. The skill reads it **at PHASE 0 every run**; if absent,
it applies the defaults below (and MAY note that project-specific knobs are
undeclared). Declare only what differs — omitted keys inherit the default.
This mirrors the cowork-doc-sync §6 contract exactly (same files, same
read-every-run, same omit-inherits-default semantics).

Declarable knobs (default → override):

| Knob | Generic default | Override example |
|------|-----------------|------------------|
| 1. PRD-lite sections | Problem / Success Metrics / Out-of-scope / Pre-mortem | add "Compliance", drop Pre-mortem |
| 2. PRD-lite trigger | ≥2 features OR user-flagged uncertainty | always / never |
| 3. matchRate threshold | `== 100` (code sprints) | `>= 90` |
| 4. matchRate method | flat (done/total) | priority-weighted |
| 5. Gap-analysis lenses | generic item↔evidence | dev: + code/file map + e2e input→store→output |
| 6. QA gate axes | both enforced (mechanical + gap) | gap advisory-only for non-code |
| 7. WorkList required fields | `{id, description, acceptanceEvidence, priority}` | add `owner` |
| 8. Intent-audit yardstick | PRD-lite Success Metrics | + project KPI doc |

If no local config exists, the skill offers to scaffold one from this table
(same "offer to scaffold" behavior as cowork-doc-sync). The generic *method*
stays in the skill; the per-project *what-differs* lives in the local config.

## 7. Decisions (resolved)

1. **Gap-analysis delivery** → procedure in `references/gap-analysis.md` +
   discovered reviewer (keeps "only cowork-intent-auditor is fixed" invariant).
   **CONFIRMED.**
2. **Weighted matchRate** → now **config knob #4** (§6A). Default flat;
   priority-weighted via local override. (No longer a one-time decision.)
3. **WorkList shape** → field set is **config knob #7** (§6A). *Where defined:*
   inline spec in `references/sprint-method.md` first; promote to
   `templates/worklist.template.md` only if it recurs.
4. **PRD-lite trigger threshold** → **config knob #2** (§6A). Default
   "≥2 features OR user-flagged uncertainty". **CONFIRMED as default.**

## 8. Out of scope (YAGNI — explicitly NOT porting from bkit)

- M1–M10 ten-gate catalog (too heavy; cowork uses one predicate + matchRate).
- Trust L0–L4 numeric autorun scope (cowork's autorun model differs).
- Fixed 7-layer dataFlow (replaced by generic item↔evidence + optional e2e sanity).
- MCP query servers, audit-log JSON subsystem.

## 9. Files touched

| File | Change |
|------|--------|
| `templates/prd-lite.template.md` | NEW — 4-section lite PRD |
| `references/gap-analysis.md` | NEW — gap-analysis procedure + domain adaptation |
| `references/sprint-method.md` | EDIT — PHASE 0 PRD step + **local config read (§6A)**; QA gate two-axis; intent-audit PRD wiring; WorkList field spec (inline); status.json delta |
| `SKILL.md` | EDIT — PHASE 0 / cycle summary reflect PRD + gap-analysis + "reads local sprint config" (trigger ≤250 chars unaffected) |
| `templates/worklist.template.md` | OPTIONAL (§7.3 — only if inline spec recurs) |

## 10. Provenance / license note

Approach adapted from bkit (Apache-2.0): the PRD section set (Problem / Success
Metrics / Pre-mortem / Out-of-scope) and the gap-detector classification
(`done/partial/missing/divergent` → matchRate) are **methods/ideas**, not
copyrightable expression; no bkit source text is reproduced. On implementation,
add an attribution line in `references/gap-analysis.md` crediting bkit's
gap-detector as the approach source. bkit is Apache-2.0 (permissive) — notice
suffices; no copyleft blocker.
