# Codex Runtime Mapping

Read [`cowork-method.md`](cowork-method.md) first. This file maps its shared responsibilities to Codex. It does not change their order or exit conditions.

## Capability mapping

| Shared responsibility | Codex mechanism |
|---|---|
| Long-running autonomous objective | Goal |
| Current-session progress | `update_plan` |
| Code discovery | purpose-fit explorer agents |
| Independent review or implementation | collaboration agents |
| Durable cross-session state | repository `status.json` managed by the state helper |
| Project instructions | `AGENTS.md` |
| Session recovery | Codex rollout or compact handoff, used only as recovery evidence |

Use the root agent as the orchestrator. Keep the Goal aligned with the roadmap outcome and use `update_plan` only for current progress. Neither is the cross-host state authority.

For each delegated task, select a reusable agent type and append the shared role delta, evidence contract, and exclusions. Use explorers for bounded codebase questions and workers for owned implementation. State file ownership explicitly, and remind workers that other edits may coexist.

Run independent Plan and Design reviews in fresh agent contexts. After a blocking finding is fixed, re-run only the affected lens. Do not ask reviewers to add future features that are outside the current success criteria.

Write durable lifecycle changes through the shared state helper. On resume, validate the repository, worktree, branch, commit, and state revision before continuing. Treat rollout data as recovery material rather than the state authority.

Keep approval, merge, and final completion decisions in the root agent. Collaboration agents supply evidence and owned changes; they do not become nested leaders.
