# Claude Code runtime for cowork-sprint

Read [`../../../shared/references/cowork-method.md`](../../../shared/references/cowork-method.md) first. This file maps its contract to Claude Code and does not redefine it.

## Claude capability map

| Responsibility | Mechanism |
|---|---|
| long-running autonomous objective | the main session driving from durable `status.json` — Claude Code has no single objective primitive, so the roadmap itself is the objective and the state file is what survives a restart |
| transient progress | TodoWrite when the session has it. It is a mirror, never the checkpoint, so a session without it loses visibility and nothing else — say so and use the progress line instead |
| deterministic schedule | `../scripts/schedule.py` |
| durable state | `../scripts/state/state.py` |
| discovery and independent reviews | flat Agent calls from main |
| structured fan-out | one-level Workflow from main, unlocked by the user's **`ultracode`** opt-in and preferred for bulk, repetitive, or barrier/loop-shaped execution once unlocked; before the word is said, that same work runs as flat Agent calls. Flat Agent calls remain the mechanism for heterogeneous, exploratory, judgment-heavy work with few items either way |
| one-feature execution | `pdca-wf` in main, execution-only |
| project rules | CLAUDE.md and applicable rules |
| recovery after a compaction | a `SessionStart` hook with matcher `compact` re-injects the pre-compact turns as `additionalContext`; `PostCompact` cannot do this, being absent from the `hookSpecificOutput` union |

The main session is the leader. Never wrap leadership or `pdca-wf` in an Agent, nest Workflow, or let a worker edit state, commit, merge, deploy, or claim Done.

## Claude lifecycle mapping

Execute these rows in order. A row completes only when its exit evidence exists.

| Contract ID | Claude action | Exit evidence |
|---|---|---|
<!-- Every Workflow named in the rows below is conditional on the user's `ultracode` opt-in. Until
     that word is said, those rows run as flat Agent calls or as main running the commands itself.
     Each row already names that substitute, and it is a peer mechanism, not a fallback. -->
| `roadmap-review` | fresh Agents review intent, sizing, dependencies, ownership, and risk | no roadmap blocker |
| `brief` | main writes the active Sprint Brief | all five Brief fields are concrete |
| `plan-review` | fresh Agents review the Plan | no Plan blocker |
| `design-review` | new fresh Agents review Design and WorkList | no Design blocker |
| `targeted-test` | main or a Check Workflow runs real commands. Workflow is the mechanism when the work is bulk, repetitive or wants a barrier; main running the commands directly is a valid substitute and is often the right one for a handful of gates | applicable exit codes are zero |
| `gap-check` | a Check Workflow, a fresh Agent, or main compares every WorkList item with built artifacts. Whichever runs it, the comparison is recorded item by item — the mechanism is free, the evidence is not | complete coverage; no blocker or major gap |
| `qa-diff` | main asks the required diff question once | every unrequested change is removed or justified |
| `intent-audit` | fresh intent auditor receives intent, artifacts, and gaps | PASS |
| `sprint-commit` | main invokes `cowork-commit` in sprint-provenance mode, linking the initiative intent and reviewed sprint artifacts; add verbatim dialogue only for real user intervention | real commit ID and sprint provenance exist |
| `state-checkpoint` | main records the commit with the state helper | revision advanced after commit |
| `cluster-regression` | main tests the stored-order integrated cluster | adjacent regression green |
| `full-regression` | main runs the repository-wide suite after all clusters | full suite green |
| `doc-sync` | main invokes `cowork-doc-sync` | living docs match shipped truth |
| `completion-report` | main fills the fixed report and any required retrospective | residuals and evidence recorded |
| `bounded-five` | main caps Check/Act at five evidence-fed iterations | predicate true or truthful pause |
| `approval-boundary` | main stops before external or irreversible action | explicit user approval or no action |

## Claude failure and resume mapping

Keep mechanical failures inside the current Design. Re-plan only a false premise and re-run only invalidated lenses. After five unsuccessful Check/Act iterations, persist a truthful pause. External or irreversible work returns to main for approval. A merge conflict stops without auto-resolution.

Auto-compact keeps the session id and keeps writing the same transcript, so the pre-compact turns
survive on disk and the hook can rebuild them. If no such hook is installed, run `/s-continue` on the
current session before continuing the run.

On resume, validate repository, branch, worktree, state revision, commits, and pause reason. Resume the first unfinished cluster; transcript data is recovery evidence, never state authority.
