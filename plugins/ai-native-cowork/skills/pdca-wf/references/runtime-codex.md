# Codex Runtime for `pdca-wf`

Read [the shared cowork method](../../../shared/references/cowork-method.md) first. This reference maps that method to Codex capabilities. It does not redefine the shared phases, gates, risk thresholds, outputs, or safety rules.

## Runtime boundary

The root agent is the single-feature orchestrator and integration owner. Use `update_plan` as the transient phase display. Use bounded explorer agents for code discovery, workers for explicitly owned implementation slices, and fresh-context agents for independent reviews. The root owns judgment, review resolution, integration, commands used as test evidence, reports, and safety decisions.

An ordinary `pdca-wf` run must not create a Codex Goal. Continue an existing Goal when the caller already has one. Create a Goal only when the user explicitly requests one by the opt-in word **`goal`** — Claude Code's equivalent word is `ultracode`, and the two are not interchangeable. A Goal and `update_plan` are host-local controls; neither is durable cross-host state. Codex has no `Workflow`-equivalent for structured fan-out at single-feature scope, so `research`, `do`, and `targeted-test`/`gap-check` use explorer and worker agents directly. That is also what they do **before the word is said** — the gate withholds the Goal, never the work, and at single-feature scope the difference is whether the objective survives the turn, not whether the phases run.

A persistent Goal earns its keep at roadmap scope, where `cowork-sprint` runs it — a single feature rarely outlives the turn that starts it. That is where a Goal is *useful*, not a limit on where one may exist. **If the user says `goal` during a standalone `pdca-wf` run, create it.** The word is the user's authority and this skill does not overrule it; what this skill must never do is create a Goal the user did not ask for.

Every delegated prompt follows the shared dynamic-role contract:

```text
base role + sprint role delta + evidence contract + explicit exclusions
```

Workers receive named file or module ownership and a warning that other agents may edit the repository concurrently. They must preserve and accommodate unrelated changes.

## Entry modes

| Mode | Required input | Planning behavior | Commit and checkpoint owner |
|---|---|---|---|
| `interactive` | one feature request | Run the complete lifecycle from Research | No implicit commit. Commit only when the user requested it. No cowork state is required. |
| `preplanned` | reviewed or reviewable Brief, Plan, Design, and WorkList | Validate supplied artifacts and missing review evidence. Complete only missing pre-Do gates, then execute. | No implicit commit. Return commit-ready evidence. |
| `cowork` | caller-reviewed Design, WorkList, file groups, role map, targeted-test command, and risk score | Execution-only. Start at Do. Do not repeat Research, Brief, Plan, or Design. | The `cowork-sprint` leader commits and updates the shared checkpoint. |

Reject multi-feature input and route it to `cowork-sprint`. Reject preplanned input whose Brief, Plan, Design, or WorkList is absent or internally inconsistent. In `cowork` mode, reject rather than silently repairing missing planning or review evidence.

## Executable phase table

The phase IDs in this table are the runtime contract consumed by parity tests.

| Phase ID | Inputs | Owner and Codex mechanism | Output | Exit condition | Fallback |
|---|---|---|---|---|---|
| `research` | feature, repository instructions, relevant references | root integrates bounded `explorer` findings | research note with facts, sources, constraints, and local prior art | required unknowns have evidence; local reference-source-first search is complete | root performs bounded read-only discovery if an explorer fails |
| `brief` | feature and research note | root | Sprint Brief: Problem, Success, Out of scope, Dependencies, Pre-mortem, risk score | every Brief field is concrete and the task remains one feature | route multi-feature scope to `cowork-sprint`; stop on an intent choice that materially changes scope |
| `plan` | Brief and research note | root with `update_plan` reflecting current work | Plan with scope, ordering, deliverables, WorkList, and completion evidence | each promised outcome has an owned WorkList item and evidence | revise only the unsupported plan slice |
| `plan-review` | raw Brief, Plan, governing paths, dominant risk | fresh independent collaboration agent with no author rationale | structured verdict and evidence-linked findings | no blocker remains | fix blockers and re-run only lenses invalidated by the fix; if no independent slot becomes available, stop with `INDEPENDENT_REVIEW_UNAVAILABLE` |
| `design` | reviewed Plan and WorkList | root | Design covering interfaces, state/data flow, file ownership, validation seams, test strategy, topo-sorted WorkList, file groups, role map, and targeted-test command | every WorkList item is implementable, ordered, owned, and verifiable | revise only the affected design slice; return to Plan review if Plan premises changed |
| `design-review` | raw Brief and Design, governing paths, dominant technical risk | a new fresh independent collaboration agent | structured verdict and evidence-linked findings | no blocker remains | fix blockers and re-run only invalidated lenses; never substitute root self-review |
| `do` | reviewed Design, WorkList, file groups, role map | explicitly owned workers for disjoint groups; root integrates | implemented WorkList items and changed-file evidence | all dispatched items returned or root completed their bounded fallback | on worker failure, ownership returns to root for bounded direct execution; the exit gate is unchanged |
| `targeted-test` | changed contract, adjacent behavior, selected commands | root runs commands and records real exit codes | targeted test evidence | every required command ran and passed | enter bounded Check/Act; environment-only failures are recorded and retried only when a concrete remedy exists |
| `gap-check` | WorkList, implementation, targeted-test evidence | fresh QA agent supplies evidence; root resolves and integrates | gap result with coverage and residuals | WorkList coverage is complete and no blocker or major gap remains, or five Check/Act iterations are exhausted | fix gaps, then repeat targeted tests and only the affected gap lenses; after iteration five return residuals without claiming Done |
| `qa-diff` | reviewed WorkList and sprint diff | root | concise cut-or-keep decision for unrequested changes | every material unrequested change is removed or justified by the reviewed Design | cut speculative generality; do not create another review phase |
| `report` | artifacts, test evidence, gap result, QA diff, lifecycle outcome | root | completion report and section-scoped as-built update | lifecycle rules are applied and the caller receives the mode-specific result | retain active Plan/Design and residuals when Done is false; never infer commit or external-action authority |

Interactive and preplanned modes traverse the applicable rows in order. `cowork` mode consumes already reviewed planning artifacts and starts at `do`, but it still must execute `targeted-test`, `gap-check`, `qa-diff`, and `report`.

## Independent review barrier

Plan review asks whether the right work is planned. Design review asks whether the reviewed Plan can be implemented and verified. Use separate fresh-context agents. Give each reviewer only the raw artifact, governing repository paths, its base role and sprint delta, evidence contract, and exclusions. Do not pass the author's rationale or earlier verdict.

Prefer `fork_turns: "none"` when dispatch supports it. If a mandatory independent review cannot obtain a fresh slot, wait for a slot or stop with `INDEPENDENT_REVIEW_UNAVAILABLE`. The root may implement a worker's slice after failure, but it may not replace either mandatory independent review with self-review.

Only blocker-producing lenses are re-run after a correction. A changed premise invalidates the affected Plan or Design lens; it does not reopen unrelated approved lenses.

## WorkList scheduling and ownership

Before Do, the root validates dependency references and topologically sorts the WorkList. A cycle is a Design blocker.

Build file groups from that order:

1. Items that modify the same file or mutable artifact stay in one serial group.
2. A dependent item waits for every prerequisite even when the files differ.
3. Groups with no dependency or ownership overlap may run concurrently within available collaboration slots.
4. The root owns deterministic integration and resolves cross-group conflicts against the reviewed Design.

Do not ask multiple workers to edit the same file. If grouping leaves no safe parallel work, the root or one worker executes the ordered chain serially.

## Bounded Check/Act

Check/Act has at most five iterations. Each iteration follows this order:

```text
run real targeted commands
-> compare the WorkList with the implementation
-> collect evidence-linked gaps
-> fix only current gaps
-> re-run affected commands and lenses
```

An empty or missing verifier result is not 100%. Tests must use actual command exit codes. A failed worker, unavailable optional specialist, or exhausted iteration budget never bypasses an exit gate. At iteration five, report residual gaps and set `done` to false.

After the gap check, ask the shared QA diff question exactly once. This question is not a new agent phase.

## OODA and risk additions

When execution contradicts an accepted premise, apply OODA to only the affected slice. Mechanical failures stay inside the Design. A false premise returns to the relevant Plan or Design step and re-runs only invalidated review lenses. Work outside Success becomes follow-up work.

Calculate the shared 0–10 risk score before Do. Core gates always run. Scores `4..6` deepen independent review and adjacent regression. Scores `7..10` add a specialist and the applicable parity or mutation evidence, plus intent or rollback checks when the failure mode requires them. Risk never authorizes external or irreversible action.

## Return and commit contract

Every execution path exposes the same evidence. In `cowork` execution-only mode, return exactly this object to the leader:

```json
{
  "artifacts": [],
  "targetedTests": [],
  "gapResult": {},
  "qaDiff": {},
  "done": false,
  "commitReady": false
}
```

Do not add host-only fields to this object. `done` requires complete WorkList coverage and no blocker or major residual. `commitReady` requires the applicable targeted commands to have passed and the diff to be ready for the leader's sprint commit; it does not mean a commit occurred.

Standalone interactive and preplanned runs report the same evidence in their report. They do not commit unless the user asked for a commit. In `cowork` mode, `pdca-wf` never commits and never edits the shared sprint checkpoint. The leader commits first and then persists that commit through the shared state helper.

External mutations, destructive actions, push, deploy, release, and other irreversible operations always return to the root approval boundary. Neither a risk score nor a successful review grants permission.
