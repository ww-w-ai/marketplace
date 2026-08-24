# Shared Cowork Method

This file is the method contract shared by every supported host. Public skill entrypoints may add routing and task-specific detail. Host runtime references may map capabilities. They must not redefine this contract.

## Planning model

Use rolling-wave planning.

At roadmap start, define the goal, one product-level intent anchor, a coarse sprint map, dependencies, and approximate completion criteria. Do not fully design later sprints before earlier work has produced the facts they depend on.

Immediately before each sprint, complete this sequence:

1. Research the current code, references, and constraints.
2. Write a Sprint Brief with `Problem`, `Success`, `Out of scope`, `Dependencies`, and `Pre-mortem`.
3. Write the Plan: scope, order, deliverables, WorkList, and completion evidence.
4. Run an independent Plan review for completeness, sizing, sequencing, and the dominant risk. Resolve blockers before Design.
5. Write the Design: interfaces, data and state flow, file ownership, validation seams, and test strategy.
6. Run an independent Design review for implementability and the dominant technical risk. Resolve blockers before Do.
7. Build from the reviewed Design.
8. Run targeted tests for the changed contract and adjacent behavior.
9. Compare the WorkList with the implementation and record gaps.
10. Commit the sprint independently.
11. Persist the checkpoint.

Plan review asks whether the right work is planned. Design review asks whether that plan can be implemented and verified as described. Do not merge the two reviews.

## Roadmap and cluster contract

At roadmap start, write an intent anchor, coarse sprint list, dependency graph, ownership keys, and approximate Done criteria. Detail only the active sprint. Run an independent roadmap review for completeness, sizing, sequencing, scope, and dominant risk before execution.

Use the deterministic scheduler to classify the roadmap:

- a dependency always places the dependent sprint in a later cluster;
- equal or ancestor/descendant path ownership serializes sprints;
- unknown ownership serializes the sprint;
- independent, disjoint sprints may share a concurrent cluster;
- `integrationOrder` is stable roadmap order.

Only the first unfinished cluster may run. Every member of every earlier cluster must be completed or archived-done with a commit. A blocked or failed member prevents cluster advance. Concurrent work uses flat workers with explicit ownership; the leader integrates in stored order and runs adjacent regression before advancing.

## Core gates

Every sprint runs these gates regardless of risk score:

- Research and Sprint Brief exist.
- Plan and independent Plan review are complete.
- Design and independent Design review are complete.
- Targeted tests execute against changed behavior.
- WorkList-to-implementation gap check is complete.
- A fresh-context intent audit confirms the result serves the sprint intent.
- The QA diff question resolves unrequested work.
- The sprint has its own commit.
- The durable checkpoint is updated after the commit.

Every roadmap ends with full regression, final intent review, documentation synchronization, a completion report, and retrospective when the run produced reusable learning or material correction.

Tests do not replace the gap check. Tests ask whether implemented behavior works. The gap check asks whether every promised item exists.

## Convergence and failure direction

Check/Act is bounded to five fix-and-recheck iterations. Each iteration records real command exit codes, WorkList coverage, current gaps, and the affected re-review lenses. Engineering work reaches Done only at complete WorkList coverage with no blocker or major gap and green applicable checks. Non-code work uses its reviewed verifiable predicate.

Mechanical failure stays within the reviewed Design. A false premise returns only the affected slice to Plan or Design and re-runs invalidated lenses. Work outside Success becomes an explicit carry item. Exhausted iterations, unresolved quality failure, unsafe irreversible action, or merge conflict pauses truthfully; none may be relabeled Done.

## Intent, documentation, and close

The executor cannot perform the independent intent audit. Give a fresh reviewer the intent anchor, artifacts, and gap result. A REVISE verdict returns to bounded Check/Act.

Every roadmap closes with integrated full regression, final intent review, documentation synchronization, a completion report, and a retrospective when the run produced reusable learning or material correction. If the run created an isolated worktree and the target worktree is safe to update, a verified local merge may follow; conflicts stop, and remote push always requires explicit approval.

Roadmap Done requires every sprint completed with its own commit and checkpoint, final regression green, intent audit PASS, documentation synchronized, and no unresolved blocker or major gap. A report, test count, or state label cannot substitute for this predicate.

## Risk score and added gates

Score each dimension from 0 to 2 and store the five dimensions plus their sum:

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Impact | one local surface | several modules | several systems or platforms |
| Recovery | immediate revert | repair or migration needed | difficult state or data recovery |
| Security/external | none | permissions or network involved | credentials, deployment, or external mutation |
| Contract | internal implementation | internal interface or schema | public API, CLI, format, or compatibility |
| Verification | existing tests suffice | new targeted tests needed | parity, mutation, or real-environment proof needed |

Apply the sum mechanically:

```text
0..3   core gates
4..6   core gates + deeper independent review + adjacent regression
7..10  prior gates + specialist review + applicable parity or mutation
        + intent and rollback checks where the failure mode requires them
```

Risk adds gates. It never waives core gates. External or irreversible actions always require explicit user approval, regardless of score.

## Dynamic role contract

Every delegated task receives exactly these four parts:

1. **Base role**: the reusable capability, such as researcher, implementer, Plan reviewer, Design reviewer, or QA reviewer.
2. **Sprint role delta**: the domain and failure mode that matter for this sprint.
3. **Evidence contract**: the sources, commands, artifacts, and structured result needed to support a verdict.
4. **Explicit exclusions**: adjacent work the role must not pull into the current sprint.

Keep a one-off delta in the dispatch prompt. When the same delta repeatedly produces useful findings, record it as a retrospective promotion candidate. Promote it to a reusable project role only after repeated evidence; do not create a permanent role for every prompt variation.

## QA diff check

After targeted tests and the WorkList gap check, inspect the sprint diff once and ask:

> What is present that no WorkList item requested?

Cut speculative generality and gold plating when a smaller implementation satisfies the reviewed Design. Keep contracts, boundaries, security controls, failure direction, and concise extensibility that the Design explicitly justifies. Record material cuts or one-line keep reasons in the sprint report. This is a concise QA question, not a separate mandatory agent or an additional review phase.

## Execution and safety

Use OODA inside Do and Check when evidence contradicts a reviewed premise. Re-plan only the affected slice and re-run only the review lenses invalidated by the change. New work outside the sprint's success criteria becomes a follow-up instead of silently widening scope.

Quality failures loop within the bounded Check/Act policy. External mutations, destructive actions, release operations, and other irreversible steps stop at an approval boundary. A high quality score cannot authorize a safety-sensitive action.

## Durable outputs

The shared state file stores resume facts, not reports. Detailed research, review findings, QA tables, and resolved decisions belong in plan or report artifacts. Source control remains authoritative for code and commits.

The common outputs are:

- roadmap and intent anchor;
- sprint Brief, Plan, Design, and WorkList;
- targeted verification and gap evidence;
- one commit per sprint;
- minimal durable checkpoint;
- final regression, intent, documentation, and completion reports.

Host-local progress displays and session controls are transient mirrors. They do not replace the shared checkpoint.
