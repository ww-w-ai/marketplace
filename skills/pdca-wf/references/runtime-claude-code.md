# Claude Code Runtime for pdca-wf

This file maps the [shared cowork method](../../../shared/references/cowork-method.md) to Claude Code. The shared method owns product behavior. This file owns Claude-specific execution mechanics.

The skill's as-built document is [`../docs/01-built/pdca-wf.md`](../docs/01-built/pdca-wf.md).

## Runtime constraints

- Workflow agents have thinking off. Keep Brief, Plan, Design, review resolution, phase-boundary judgment, and safety decisions in main.
- Workflow nesting is one level. `pdca-wf` never calls itself. A `cowork-sprint` caller invokes it execution-only.
- The Workflow sandbox is not Node. `Date.now()`, `new Date()`, `Math.random()`, and `fs` are unavailable. Main gets timestamps with `date` and passes them through `args`.
- A phase boundary returns control to main. Main reads the structured result and decides the next phase.

## Actors

| Actor | Responsibility |
|---|---|
| Main | judgment, TodoWrite state, planning artifacts, review resolution, timestamps, integration, safety gates, reports |
| Workflow script | deterministic ordering, parallel grouping, bounded loops, structured dispatch |
| Agent | bounded research, implementation, or verification under a dynamic role contract |

## Entry modes and commit ownership

| Mode | Entry | Commit and checkpoint |
|---|---|---|
| `interactive` | Run every phase from `research` | Standalone does not infer commit permission. Reports commit-ready evidence. |
| `preplanned` | Validate Brief, Plan, both review verdicts, Design, WorkList, groups, roles, and verification decision; then enter `do` | Standalone does not infer commit permission. Reports commit-ready evidence. |
| `cowork` | Caller supplies reviewed sprint artifacts; enter `do` | `cowork-sprint` leader owns the mandatory sprint commit and durable checkpoint. |

Execution-only modes return `{artifacts, targetedTests, gapResult, qaDiff, done, commitReady}`. Claude has no Goal primitive and must not invent an equivalent durable objective for an ordinary feature run. It participates in caller-owned sprint state when invoked by `cowork-sprint`.

## Phase map

Create one TodoWrite item per active phase. Mark it `in_progress` on entry and `completed` only after its exit condition holds.

| Phase ID | Input | Owner/tool | Output | Exit condition | Fallback |
|---|---|---|---|---|---|
| `research` | feature and repository context | Workflow fan-out; main integrates | research note | evidence needed by Brief exists | main performs bounded research if Workflow fails |
| `brief` | research evidence | main, thinking | five-field Sprint Brief | boundary and risk basis are explicit | stop if success or scope cannot be stated |
| `plan` | Brief and evidence | main, thinking | active Plan | scope, order, evidence, and risk score exist | revise the Plan before review |
| `plan-review` | raw Brief and Plan | main dispatches fresh agents | verdict and findings | no Plan blocker remains | wait for independence; never self-review |
| `design` | reviewed Plan | main, thinking | Design, WorkList, fileGroups, agentMap, verifyCmd | fixed Do input exists | revise Design inputs before review |
| `design-review` | raw Brief, Plan, Design, and governing paths | main dispatches fresh agents | verdict and findings | no Design blocker remains | wait for independence; never self-review |
| `do` | reviewed Design and grouped WorkList | Workflow | structured built result | assigned WorkList execution returns | return failed ownership to main for bounded execution |
| `targeted-test` | built result and verifyCmd | Check Workflow runs real commands | command and lens evidence | changed contract was exercised | record non-verifiable evidence when no command exists |
| `gap-check` | WorkList, built result, test evidence | Check Workflow, bounded to five iterations | `GapResult` | 100 or residuals recorded after iteration five | report residuals; do not claim Done |
| `qa-diff` | implementation diff and WorkList | main inspects diff once | cuts or keep reasons | unrequested work is resolved | retain only explicitly justified work |
| `report` | returned evidence and Done result | main | Check report, completion report, as-built update | lifecycle reconciliation completes | preserve active Plan/Design when residuals remain |

Plan review and Design review are separate barriers. On a blocker, fix the affected artifact and re-run only the blocking lens.

## Agent lifecycle

Workflow `agent()` resolves `agentType` from the Agent registry: project `.claude/agents/`, user `~/.claude/agents/`, then plugins. Main owns role judgment because scripts cannot write agent files.

1. Discover an approximately fitting base role.
2. Add the sprint role delta, evidence contract, and exclusions in the dispatch prompt.
3. Use the default Workflow agent for one-off deltas.
4. Create a project-local agent only when a repeatable role is absent.
5. Record repeatedly effective deltas as retrospective promotion candidates. Evolve reusable agent files in main, never in Workflow.

## Interactive procedure

### Stamp and scope

Main runs `date '+%Y-%m-%d-%H%M'`, chooses a feature slug, confirms one-feature scope, and ensures the documentation taxonomy exists. Multi-feature work routes to `cowork-sprint`.

### Research

Invoke `Workflow({script, args:{feature, dt}})` with the Research template in [`workflow-scripts.md`](workflow-scripts.md). It may fan out code, web, and entity research and returns `ResearchFindings` from [`schemas.md`](schemas.md). Main writes `06-research/<dt>-<feature>.md`.

### Brief

Main writes `Problem`, `Success`, `Out of scope`, `Dependencies`, and `Pre-mortem`. Keep it concise. It anchors scope and risk scoring.

### Plan

Main writes `02-planned/<dt>-<feature>-plan.md` with status `ACTIVE-PLAN`, using [`doc-templates.md`](doc-templates.md). Define scope, order, deliverables, WorkList outline, completion evidence, and the shared five-dimension risk score.

### Plan review

Review whether the right work is planned.

- Select distinct lenses for completeness, sizing/sequencing, and dominant risk. Apply shared score thresholds.
- Dispatch one fresh-context agent per lens concurrently. The author does not self-review.
- Require `{verdict, findings[{severity, claim, where, whyItSinks, fix}]}`. Exclude low-confidence style and wishlist findings.
- A blocker prevents Design. Fix it and re-run only its lens. Record accepted major risks.
- Work outside Brief success criteria becomes follow-up work, not a blocker.

Use [`plan-review-panel.md`](plan-review-panel.md) for lens and gate details.

### Design

Main writes `02-planned/<dt>-<feature>-design.md` with status `ACTIVE-PLAN`, using [`doc-templates.md`](doc-templates.md). This is Do's fixed input.

Create and embed the `WorkList` JSON from [`schemas.md`](schemas.md), with `{id, file, change, dependsOn}`. Main topologically sorts it, creates dependency-ordered `fileGroups`, serializes same-file work, permits disjoint-file parallelism, builds `agentMap`, chooses a targeted `verifyCmd` or `null`, and defines interfaces, state/data flow, ownership, failure direction, validation seams, and tests.

### Design review

Review whether the Plan can be implemented and verified as designed.

- Select implementability and dominant technical-risk lenses. Add specialist review only when score thresholds require it.
- Supply raw Brief, Plan, Design, WorkList, and governing source paths without the author's rationale.
- A blocker prevents Do. Fix the Design and re-run only its lens.
- Record lenses, verdict, kept findings, and waivers in the Design.

Use [`plan-review-panel.md`](plan-review-panel.md) for lens and gate details — the same catalog,
`ReviewResult` schema, and exit gate serve plan-review and design-review.

### Do

Invoke `Workflow({script, args:{workList, fileGroups, agentMap, designPath, dt, feature}})` with the Do template in [`workflow-scripts.md`](workflow-scripts.md). Inline schemas because Workflow has no filesystem API. Run groups in parallel and items in each file serially. Do not create per-item worktrees.

### Targeted test and gap check

Invoke `Workflow({script, args:{designPath, verifyCmd, agentMap, dt, feature}})` with the Check template in [`workflow-scripts.md`](workflow-scripts.md), with schemas inlined.

For verifiable work, execute targeted stack commands first. Exit codes are evidence. A result reaches 100 only when checks are green and selected lenses reach 100. Compare every WorkList item with implementation, fix gaps in bounded parallel work, and loop until 100 or five iterations. Do not pause merely because quality is below 100. After iteration five, carry residuals to Report.

Main stamps a new timestamp and writes `05-reports/<dt2>-<feature>-check.md`. Use returned iterations and executed tests; do not reconstruct history from memory.

### QA diff

Main inspects the diff once and asks what is present that no WorkList item requested. Remove unjustified generality or record a concise keep reason. This is not another agent phase.

### Report

Main stamps a fresh timestamp and writes `05-reports/<dt3>-<feature>-report.md` with [`doc-templates.md`](doc-templates.md). Include QA evidence, anticipated questions, returned phase history, residuals, and QA diff decision.

Section-scope the as-built merge into `01-built/<feature>.md`, then hand off to `cowork-doc-sync`. Standalone mode returns commit-ready evidence without committing.

## OODA inside Do and Check

When evidence contradicts the reviewed Design, use `Observe -> Orient -> Decide -> Act`.

| Observation | Decision |
|---|---|
| Mechanical error or flaky environment | adjust within Plan and continue |
| Same failure three times, or ten tool calls without progress | re-plan the affected slice; re-run only invalidated lenses |
| A Design premise is false | re-plan that slice; keep unaffected slices running |
| Required work is outside the Brief | defer it as follow-up work |
| An irreversible action now looks unsafe | stop at the safety gate and report |

Log material decisions in the Check report. See [`plan-review-panel.md`](plan-review-panel.md).

## Quality, risk, and safety gates

Quality failures remain inside the five-iteration Check/Act loop. Risk score adds the shared review and verification depth; it never removes a core gate.

Push, deploy, release, remote migration, destructive data work, and other external or irreversible actions return to main for explicit user approval. Before launch, main performs a thinking-enabled adversarial review using correctness plus the action's dominant risk. Workflow review cannot replace it because Workflow thinking is off.

## Done and document lifecycle

Main computes:

```text
done := every WorkList item is present in the built result
        AND GapResult contains no blocker or major gap
```

`matchRate: 100` cannot override missing coverage.

When done, section-scope a clean merge into `01-built/<feature>.md`, delete the superseded Design only after Check, and let `cowork-doc-sync` delete or move the superseded Plan.

When residuals remain after five iterations, update only implemented as-built sections, keep the active Plan and Design, and strike implemented Design items. If at least three items are struck and they are at least half the items, remove struck detail and leave residuals plus a pointer to as-built/Git. Re-pursue residuals with a new dated Plan.

`01-built` never contains strikethrough and is never whole-file overwritten for a section change. Deletion is terminal and idempotent. If Design is absent and as-built exists, treat the cycle as complete and do not re-run Check. See [`taxonomy-map.md`](taxonomy-map.md).

## Structured outputs and red flags

All Workflow outputs consumed by code are schema-validated JSON. Use [`schemas.md`](schemas.md) for `ResearchFindings`, `ReviewResult` (shared by plan-review and design-review), `WorkList`, `GapResult`, and `Report`.

Stop before any of these mistakes:

- placing planning or review-resolution judgment inside Workflow;
- using Node/filesystem APIs inside Workflow scripts;
- nesting Workflows;
- entering Design with a Plan blocker or Do with a Design blocker;
- parallelizing same-file edits or serializing independent file groups;
- widening the Brief with future reviewer wishes;
- auto-running an external or irreversible action;
- overwriting an entire living as-built document.

## Supporting references

- [`workflow-scripts.md`](workflow-scripts.md): Research, Do, and Check templates
- [`schemas.md`](schemas.md): structured schemas
- [`plan-review-panel.md`](plan-review-panel.md): review lenses and OODA
- [`doc-templates.md`](doc-templates.md): artifact skeletons
- [`taxonomy-map.md`](taxonomy-map.md): lifecycle and doc-sync handoff
