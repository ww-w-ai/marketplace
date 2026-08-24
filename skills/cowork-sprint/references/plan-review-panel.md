# Plan-review panel (PRDCA "R") + OODA tactical layer + turn discipline

Read when running a plan/design review gate, when execution contradicts the roadmap, or when
deciding how much work to put in one turn. Domain-agnostic — dev, marketing, research, ops, data.

The sprint cycle is **P → R → D → C → A**:

| Step | Owner | Question |
|---|---|---|
| Plan (roadmap, per-sprint plan, design) | Leader in main (thinking) | what to do, in what order |
| **Review (R)** | **Leader dispatches an adversarial panel** | **is this plan wrong before we pay to execute it** |
| Do | delegated (pdca-wf / subagents) | execute |
| Check (C) | QA gate + intent audit | axis-1 output-vs-plan · axis-2 intent-fit |
| Act (A) | Leader (retrospective) | fold the lesson into rules/agents so it cannot recur |

R replaces the older single "independent reviewer" step. One reviewer produces one blind spot;
lenses are chosen so their blind spots do not overlap.

---

## 1. Where R runs in a sprint

| Gate | When | Minimum lenses |
|---|---|---|
| **Roadmap review** | PHASE 0, after the sprint list exists, **before the user approval gate** | completeness · sizing · sequencing |
| **Per-sprint design review** | PHASE 1, after design, before `do` | completeness · authority-fit · the sprint's dominant risk |
| **Pre-irreversible review** | PHASE 1, before deploy/send/migration | correctness · the action's dominant risk (this one is a safety gate, never skipped) |

Skip a design-review panel only for a sprint that is single-surface, reversible, introduces no
new pattern, and has a mechanical verify command. Log the skip and why.

## 2. Panel composition — lenses, not headcount

Pick lenses by what would actually sink THIS plan. Minimum 2, typical 3, cap 5.
One agent = one lens, dispatched concurrently, purpose-fit `agentType` where one exists
(discover → reuse → create; see `references/agent-archetypes.md`).

| Lens | Hunts for |
|---|---|
| completeness | steps/deliverables/dependencies the plan omits; items with no acceptance evidence; unverified "already done" assumptions |
| sizing | sprints that are not ≈1 human-week — over-large (split) or trivially small (merge). A mis-sized roadmap is a plan defect, not a nit |
| sequencing | ordering and dependency errors; work scheduled before its input exists; parallel slices that touch the same surface |
| authority-fit | conflicts with an existing standard, architecture doc, prior decision, or public contract that the plan silently bypasses |
| scope | over-build (work the goal does not require) and under-build (goal unreachable from these deliverables) |
| reversibility | where this becomes irreversible, whether a checkpoint precedes it, how to roll back |
| assumption | premises treated as fact but never verified, plus the cheapest verification for each |

**The plan's author never reviews it.** The Leader wrote it; fresh-context subagents review it.

## 3. Reviewer contract

Input: the plan/design path, the WorkList (or deliverable list), and the paths of governing
documents to check against. Ask for **findings, not approval**.

```
{ verdict: "GO" | "FIX-FIRST",
  findings: [ { severity: "BLOCKER"|"MAJOR"|"MINOR",
                claim, where, whyItSinks, fix } ] }
```

- report only what the reviewer would defend at ≥80 confidence
- **do NOT report**: style/naming preference, restatements of the plan, wishlist "consider also",
  anything the QA gate or a linter already catches
- every finding names the concrete failure it causes

## 4. Exit gate

```
BLOCKER                    → fix the plan, re-run ONLY the blocking lenses, re-gate
MAJOR                      → fix now if cheap, else record as an accepted risk with rationale
MINOR                      → note, proceed
same finding from 2+ lenses independently → BLOCKER regardless of stated severity
```

`do` MUST NOT start while a BLOCKER stands. Record lenses used, verdict, and findings
kept/waived into the sprint plan and `status.json` so the retrospective can read them.

## 5. OODA — tactics inside execution

PRDCA decides what to build; OODA decides what to do when reality disagrees mid-run. Loop speed
is the point: a wrong plan corrected in one cycle beats a perfect plan defended for three.

```
Observe  gate output, agent returns, error text, timings — raw signal, not your summary
Orient   ★ does this break a premise the plan rests on?
Decide   adjust-in-plan | re-plan slice | defer | escalate
Act      do it, log what changed and why
```

**Orient is where autonomous runs go wrong** — the usual failure is observing a surprise and
executing the existing plan harder. If an observation contradicts a premise the R panel accepted,
the premise loses.

| Observation | Decide | Autonomy |
|---|---|---|
| mechanical failure (typo, missing dep, flaky env) | adjust-in-plan | keep running |
| same failure 3× or 10+ tool calls with no progress | re-plan that slice → re-run only the affected lenses | keep running |
| a premise the design rested on is false | re-plan that slice; other slices keep running | keep running |
| real work outside this sprint's goal | record as report carry | keep running — never widen scope mid-run |
| genuine toss-up with no derivable answer | choose a reversible default; use `openDecisions` only if it must survive resume | keep running |
| the surprise makes an irreversible action look wrong | escalate | **stop at the safety gate, report** |

Only the last row stops the run. Everything else is handled and logged — the autonomous contract
(finish all sprints in one run, batch questions to the end) still holds.

Log every OODA decision into the sprint report. Repeated re-plans sharing one cause are a
standing defect in how plans get written → that belongs in Act (rule/agent update), not in the
next plan's preamble.

## 6. Turn discipline — one perspective per turn

Executing many things in one long turn is worse than several short turns.

- Test: **"is there exactly one question this turn must answer?"** If not, split.
- Split along perspective boundaries: authoring ≠ review ≠ execution ≠ doc update;
  non-deterministic generation (copy, images, browser work) ≠ deterministic assembly (code, build).
- Benefits: depth per perspective, isolated failures (you can see which turn was wrong),
  a place for the user to intervene, and the previous turn's result available to steer the next (OODA).
- **Not the same as batching tool calls.** Independent lookups serving one perspective belong in one
  message (round-trip cost). Split *perspectives*, not *calls*.
- This is also why sprints are sized ≈1 human-week and why the sizing lens is mandatory: an
  over-large sprint is the same mistake at the roadmap scale.
