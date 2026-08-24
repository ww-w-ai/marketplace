# pdca-wf — document output templates (fill, never restructure)

Fixed skeletons for every md artifact pdca-wf writes. Fill the `{slots}`; do not invent/remove sections. (Workflow JSON returns are templated separately in `schemas.md`.)

## Plan — `02-planned/<dt>-<feature>-plan.md` (plan phase)

```markdown
# {feature} — Plan

> Status: ACTIVE-PLAN

## Sprint Brief
- Problem: {…}
- Success: {…}
- Out of scope: {…}
- Dependencies: {…}
- Pre-mortem: {…}

## Goal (one line)
{what & why}

## Scope
- IN: {…}
- OUT: {…} (explicit cut)

## Done criteria
- {verifiable criterion 1}
- {…}

## Risk
| Risk | Mitigation |
|---|---|
| {…} | {…} |

## Plan review (plan-review phase result — filled after the panel returns)
- Lenses run: {…}
- Verdict: GO / FIX-FIRST
- Findings kept/waived: {finding → kept (fixed how) or waived (why)}
```

## Design — `02-planned/<dt>-<feature>-design.md` (design phase, single input to Do)

```markdown
# {feature} — Design

> Status: ACTIVE-PLAN

## Approach (why this way — including rejected alternatives)
{approach; rejected: {alt} because {…}}

## Change map
| File | Change | Reason |
|---|---|---|
| {path} | {…} | {…} |

## WorkList (machine-readable — input to Do)
~~~json
{ "items": [ { "id": "{W1}", "file": "{path}", "change": "{…}", "dependsOn": [] } ] }
~~~

## Verification method
- verifyCmd: `{cmd}` (null if none, with reason)
- Lenses: correctness / regression / design-fit (+ {risk-specific lens})

## Open items (only if any — items that must be locked before implementation)
- {…}

## Design review (design-review phase result — filled after the panel returns)
- Lenses run: {…}
- Verdict: GO / FIX-FIRST
- Findings kept/waived: {finding → kept (fixed how) or waived (why)}
```

## Check snapshot — `05-reports/<dt2>-<feature>-check.md` (targeted-test / gap-check phases)

```markdown
# {feature} — Check {dt2}

| Iter | Execution check (exit code) | Lens | matchRate | Gap fixed |
|---|---|---|---|---|
| 1 | {verifyCmd: pass/fail} | {…} | {n}% | {…} |

Final: matchRate {n}% / iterations {n}/5
Residual gaps (only if max 5 exhausted): {gap + severity, "none" if none}
```

## Report — `05-reports/<dt3>-<feature>-report.md` (report phase)

```markdown
# {feature} — Report {dt3}

## Result (one line, product language)
{what the user can now do}

## QA table
| Behavior | Proven by | Status |
|---|---|---|
| {…} | {runner/probe/live} | PASS / deferred — {reason} |

## phaseHistory (passthrough of Check's return value — no LLM reconstruction)
iterations: {n} / testsRun: {n} / matchRate: {n}%

## Residual & carry
| Item | Reason | Next |
|---|---|---|
| {… or "none"} | | |

## Anticipated questions, answered up front
- **Q. {…}?** — {answer}
```

## 01-built section (report phase merge — section-scoped, never whole-file)

```markdown
## {feature}  <!-- Last updated: {YYYY-MM-DD HH:MM} -->
{as-built: current truth only, no past tense/strikethrough. Delete superseded content (git preserves it).}
- Behavior: {…}
- Location: {files}
- Constraints/invariants: {…}
```
