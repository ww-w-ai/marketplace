# Codex runtime for cowork-sprint

Read [`../../../shared/references/cowork-method.md`](../../../shared/references/cowork-method.md) first. This file maps its contract to Codex and does not redefine it.

## Codex capability map

| Responsibility | Mechanism |
|---|---|
| long-running objective | user-requested Goal |
| transient progress | `update_plan` |
| deterministic schedule | `../scripts/schedule.py` |
| durable state | `../scripts/state/state.py` |
| bounded discovery | explorer collaboration agents |
| independent reviews and owned implementation | fresh collaboration agents or approved Claude CLI replacement |
| one-feature execution | `pdca-wf` in root, execution-only |
| project rules | AGENTS.md and applicable instructions |

The root agent is the leader. Never delegate leadership or let a worker edit state, commit, merge, deploy, or claim Done. Every worker receives named ownership, the shared role delta, evidence contract, exclusions, and the concurrent-edit warning.

## Codex lifecycle mapping

Execute these rows in order. A row completes only when its exit evidence exists.

| Contract ID | Codex action | Exit evidence |
|---|---|---|
| `roadmap-review` | fresh reviewers inspect intent, sizing, dependencies, ownership, and risk | no roadmap blocker |
| `brief` | root writes the active Sprint Brief | all five Brief fields are concrete |
| `plan-review` | fresh reviewers inspect the Plan | no Plan blocker |
| `design-review` | new fresh reviewers inspect Design and WorkList | no Design blocker |
| `targeted-test` | root runs real commands | applicable exit codes are zero |
| `gap-check` | fresh QA evidence compares every WorkList item with built artifacts | complete coverage; no blocker or major gap |
| `qa-diff` | root asks the required diff question once | every unrequested change is removed or justified |
| `intent-audit` | fresh intent auditor receives intent, artifacts, and gaps | PASS |
| `sprint-commit` | root invokes `cowork-commit` for the verified sprint; bare `git commit` is invalid | real commit ID and directive log exist |
| `state-checkpoint` | root records the commit with the state helper | revision advanced after commit |
| `cluster-regression` | root tests the stored-order integrated cluster | adjacent regression green |
| `full-regression` | root runs the repository-wide suite after all clusters | full suite green |
| `doc-sync` | root invokes `cowork-doc-sync` | living docs match shipped truth |
| `completion-report` | root fills the fixed report and any required retrospective | residuals and evidence recorded |
| `bounded-five` | root caps Check/Act at five evidence-fed iterations | predicate true or truthful pause |
| `approval-boundary` | root stops before external or irreversible action | explicit user approval or no action |

## Codex failure and resume mapping

Keep mechanical failures inside the current Design. Re-plan only a false premise and re-run only invalidated lenses. After five unsuccessful Check/Act iterations, persist a truthful pause. External or irreversible work returns to root for approval. A merge conflict stops without auto-resolution.

On continuation, call `get_goal`, restore the returned thread ID, verify session identity, then validate repository, branch, worktree, state revision, commits, and pause reason. Resume the first unfinished cluster; rollout data is recovery evidence, never state authority.
