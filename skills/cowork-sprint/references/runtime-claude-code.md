# Claude Code runtime for cowork-sprint

Read [`../../../shared/references/cowork-method.md`](../../../shared/references/cowork-method.md) first. This file maps its contract to Claude Code and does not redefine it.

## Claude capability map

| Responsibility | Mechanism |
|---|---|
| transient progress | TodoWrite |
| deterministic schedule | `../scripts/schedule.py` |
| durable state | `../scripts/state/state.py` |
| discovery and independent reviews | flat Agent calls from main |
| structured fan-out | one-level Workflow from main |
| one-feature execution | `pdca-wf` in main, execution-only |
| project rules | CLAUDE.md and applicable rules |

The main session is the leader. Never wrap leadership or `pdca-wf` in an Agent, nest Workflow, or let a worker edit state, commit, merge, deploy, or claim Done.

## Claude lifecycle mapping

Execute these rows in order. A row completes only when its exit evidence exists.

| Contract ID | Claude action | Exit evidence |
|---|---|---|
| `roadmap-review` | fresh Agents review intent, sizing, dependencies, ownership, and risk | no roadmap blocker |
| `brief` | main writes the active Sprint Brief | all five Brief fields are concrete |
| `plan-review` | fresh Agents review the Plan | no Plan blocker |
| `design-review` | new fresh Agents review Design and WorkList | no Design blocker |
| `targeted-test` | main or Check Workflow runs real commands | applicable exit codes are zero |
| `gap-check` | Check Workflow compares every WorkList item with built artifacts | complete coverage; no blocker or major gap |
| `qa-diff` | main asks the required diff question once | every unrequested change is removed or justified |
| `intent-audit` | fresh intent auditor receives intent, artifacts, and gaps | PASS |
| `sprint-commit` | main commits the verified sprint | real commit ID exists |
| `state-checkpoint` | main records the commit with the state helper | revision advanced after commit |
| `cluster-regression` | main tests the stored-order integrated cluster | adjacent regression green |
| `full-regression` | main runs the repository-wide suite after all clusters | full suite green |
| `doc-sync` | main invokes `cowork-doc-sync` | living docs match shipped truth |
| `completion-report` | main fills the fixed report and any required retrospective | residuals and evidence recorded |
| `bounded-five` | main caps Check/Act at five evidence-fed iterations | predicate true or truthful pause |
| `approval-boundary` | main stops before external or irreversible action | explicit user approval or no action |

## Claude failure and resume mapping

Keep mechanical failures inside the current Design. Re-plan only a false premise and re-run only invalidated lenses. After five unsuccessful Check/Act iterations, persist a truthful pause. External or irreversible work returns to main for approval. A merge conflict stops without auto-resolution.

On resume, validate repository, branch, worktree, state revision, commits, and pause reason. Resume the first unfinished cluster; transcript data is recovery evidence, never state authority.
