# PRD-lite — {sprint-id}

> Lightweight sprint intent anchor. 4 sections only. Fill in PHASE 0, BEFORE the
> WorkList/design — it is the input they derive from.
> Produce when: multi-feature OR high-uncertainty sprint (local config knob #2;
> default ≥2 features OR user-flagged uncertainty). Otherwise record
> "PRD-lite skipped — trivial/single-feature" and proceed.
> This is the yardstick the intent-audit gate measures against. Keep it tight;
> vague success metrics make a weak audit.

## 1. Problem / Why
<Who has what problem, and why solve it now. 2-4 sentences. No solution yet.>

## 2. Success Metrics
Quantitative:
- <measurable target — e.g. "cuts X by N%", "M items processed without manual step">

Qualitative:
- <observable quality — e.g. "a fresh user completes the flow without docs">

(These define exactly what the Tier-2 intent-audit checks. If you cannot state a
metric, say why — do not leave it blank silently.)

## 3. Out-of-scope
- <explicitly NOT in this sprint — the scope-creep guard the gap-analysis honors>

## 4. Pre-mortem
- Scenario A — <how this could fail> → prevention: <the guard you put in place>
- Scenario B — <...> → prevention: <...>

---
> Section set is configurable (local config knob #1). Add/remove sections via the
> repo's sprint config; omitted = this default 4-section set.
>
> **Anchor propagation**: this PRD-lite IS the intent anchor. Carry its Problem +
> Success Metrics forward into every cycle phase, and hand them to the Tier-2
> intent-audit as the yardstick. Under `profile: dev` the suggested anchor fields are
> WHY / WHO / RISK / SUCCESS / SCOPE (still knob #1 — add/drop freely). See
> references/dev-profile.md §3.1.
