# Claude Code Runtime Mapping

Read [`cowork-method.md`](cowork-method.md) first. This file maps its shared responsibilities to Claude Code. It does not change their order or exit conditions.

## Capability mapping

| Shared responsibility | Claude Code mechanism |
|---|---|
| Current-session progress | `TodoWrite` |
| Independent or parallel work | `Agent` calls from the main session |
| Deterministic fan-out | `Workflow` from the main session |
| Single-feature execution | `/pdca-wf`, invoked in the main session |
| Durable cross-session state | repository `status.json` managed by the state helper |
| Project instructions | `CLAUDE.md` and applicable Claude rules |
| Session recovery | Claude transcript or compact handoff, used only as recovery evidence |

Keep the orchestrator in the main session. Do not wrap leadership or `/pdca-wf` in a subagent. Claude Code prevents useful nested dispatch, and Workflow execution does not provide the judgment needed for planning and design.

For each delegated task, select a reusable base agent and append the shared role delta, evidence contract, and exclusions. A missing permanent agent does not block a one-off dispatch. Only repeated, proven deltas become project-local agent definitions.

Mirror current progress in `TodoWrite`, but write durable lifecycle changes through the shared state helper. On resume, validate the repository, worktree, branch, commit, and state revision before continuing. Treat transcript data as recovery material rather than the state authority.

Workflow scripts may perform structured or parallel execution. Judgment, review-lens selection, conflict resolution, and every irreversible approval remain in the main session.
