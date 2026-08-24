# Plan-review and Design-review lenses + OODA tactical layer

Read when running the **plan-review** or **design-review** phase, or when execution hits a
surprise (OODA). These are two separate independent-review barriers, not one merged step —
[`../../../shared/references/cowork-method.md`](../../../shared/references/cowork-method.md) is
explicit: "Do not merge the two reviews."

| Phase | Owner | Question it answers |
|---|---|---|
| plan | main (thinking) | what should be built |
| **plan-review** | **main dispatches an adversarial panel** | **is this the right work, before Design is written for it** |
| design | main (thinking) | how it will be built, verified, and rolled back |
| **design-review** | **main dispatches an adversarial panel** | **can this Design be implemented and verified as written, before Do pays to build it** |
| do | Workflow | build it |
| targeted-test / gap-check | Workflow | axis-1 built-as-designed · axis-2 does it meet the intent |
| report | main | fold the lesson into docs/rules so it cannot recur |

A plan or design defect costs one full build cycle if it is found in gap-check. The cheapest
place to catch a plan defect is before Design is written for it; the cheapest place to catch a
design defect is immediately before Do.

Both reviews share this lens catalog, the return schema, and the OODA tactical layer below —
they differ only in which lenses dominate and what artifact they gate.

---

## 1. When each review runs

Always run plan-review before Design and design-review before Do. These are core gates.
For low-risk work, use one focused independent lens per barrier. Add lenses when the shared
risk score, file groups, public contracts, or missing acceptance evidence require them.

## 2. Panel composition — lenses, not a headcount

Pick lenses by what would actually sink this artifact. Minimum = 1 for low risk. Add the
dominant risk lens at medium risk; use the shared score for specialist depth. Cap = 5.

| Lens | Hunts for | Dominant in |
|---|---|---|
| completeness | steps/files/deps the plan omits; WorkList items with no acceptance evidence; "already implemented" assumptions that were never verified | plan-review |
| authority-fit | conflicts with an existing standard, architecture doc, prior decision, or public contract this plan silently bypasses | plan-review |
| scope | over-build (work the goal does not require) and under-build (goal not reachable from this WorkList) | plan-review |
| reversibility | where this becomes irreversible, whether a checkpoint precedes it, and how to roll back | plan-review or design-review |
| assumption | premises the plan treats as fact but never verified, and the cheapest way to verify each | plan-review |
| implementability | whether the Design's interfaces, data flow, and file ownership actually realize the Plan and can be verified as written | design-review |
| integration | ordering/dependency errors, same-file collisions, contract surfaces that must change together | design-review |
| specialist (security/perf/infra) | the Design's dominant technical risk, added only when the shared risk-score threshold requires it | design-review |

Dispatch each lens as a **separate agent** with a purpose-fit `agentType` when one exists
(discover → reuse → create, per the skill's agent-lifecycle rule). One agent = one lens.
Run them concurrently in a single message. Run the plan-review panel and the design-review
panel as two separate dispatches, never combined into one round — a design-review lens reads
the Design, which does not exist yet at plan-review time.

**The author never reviews their own artifact.** Main wrote the Plan and the Design; only a
fresh-context subagent reviews either. Self-review inherits the author's rationalizations.

## 3. What each reviewer receives and returns

- **plan-review**: give each reviewer the raw Brief, the Plan doc path, the research findings
  path, and the paths of the governing docs it must check against — not the Design (it does not
  exist yet).
- **design-review**: give each reviewer the raw Brief, Plan, Design doc path (with embedded
  WorkList), and the same governing-doc paths, without main's rationale for the choices made.

Both ask for **findings, not approval**.

Required return shape (schema-forced; `ReviewResult` in `references/schemas.md` holds the JSON
schema — the same schema serves both reviews):

```
{ verdict: "GO" | "FIX-FIRST",
  findings: [ { severity: "BLOCKER"|"MAJOR"|"MINOR",
                claim: "...", where: "plan/design §/WorkList item id",
                whyItSinks: "concrete failure this causes",
                fix: "smallest change that removes it" } ] }
```

Discipline that keeps each panel signal-dense:

- report only findings the reviewer would defend at ≥80 confidence
- **do NOT report**: style/naming preference, restatements of the plan or design, "consider
  also…" wishlist items, anything a linter or the verifyCmd already catches
- every finding names the concrete failure it causes — a finding with no failure mode is a nit

## 4. Exit gate

```
BLOCKER present            → fix the reviewed artifact, re-run ONLY the lenses that raised blockers, then re-gate
MAJOR only                 → fix now if cheap; otherwise record in the artifact as an accepted risk with rationale
MINOR only                 → note and proceed
2+ lenses raise the same finding independently → treat as BLOCKER regardless of stated severity
```

A plan-review BLOCKER MUST NOT let Design entry proceed. A design-review BLOCKER MUST NOT let
Do entry proceed. Record each panel's result (lenses used, verdict, findings kept/waived) in
its own artifact — plan-review in the Plan doc, design-review in the Design doc — so gap-check
and Report can reference it (slots in `references/doc-templates.md`).

## 5. OODA — the tactical layer inside Do/Check

Plan → plan-review → Design → design-review → Do → Check → Act is the strategy: what to build,
in what order. OODA is what to do **when reality disagrees mid-flight**. Loop speed is the
point: a wrong plan corrected in one cycle beats a perfect plan defended for three.

```
Observe  gate output, agent returns, error text, timing — the raw signal, not your summary of it
Orient   ★ the step that decides everything: does this observation break a premise of the plan?
Decide   adjust-in-plan | re-plan | defer | escalate  (see the table below)
Act      do it, and record what changed and why
```

**Orient is where runs go wrong.** The common failure is observing a surprise and moving
faster along the existing plan instead of asking whether the plan still holds. If an
observation contradicts a premise a plan-review or design-review panel accepted, the premise
loses — not the observation.

Decision table (keeps the autonomous run moving; only the last row stops it):

| Observation | Decide |
|---|---|
| a step fails on a mechanical cause (typo, missing import, flaky env) | adjust-in-plan — fix and continue, no re-plan |
| the same failure recurs 3× or 10+ tool calls pass with no progress | re-plan — the approach is wrong; return to Design, then re-run only the invalidated design-review lens on the changed part |
| a premise the design relied on turns out false | re-plan that slice; leave untouched slices running |
| new work surfaces that is real but outside this feature's goal | defer — record it as a follow-up item, do not widen scope mid-run |
| the surprise makes an irreversible action look wrong | escalate — stop before the safety gate and report; never auto-fire |

Cost discipline: re-running a review after a mid-flight re-plan covers **only the changed
slice and only the lens that was invalidated**. Re-reviewing the whole plan or design on every
adjustment converts the tactical layer into churn.

Log every OODA decision (observation → decision → why) into the Check report. That log is
what makes Act (A) possible: repeated re-plans with the same cause are a standing defect in
how plans get written, and belong in a rule, not in the next plan's preamble.
