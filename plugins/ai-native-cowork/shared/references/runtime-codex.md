# Codex Runtime Mapping

Read [`cowork-method.md`](cowork-method.md) first. This file maps its shared responsibilities to Codex. It does not change their order or exit conditions.

## Capability mapping

| Shared responsibility | Codex mechanism |
|---|---|
| Long-running autonomous objective | Goal, on the user's `goal` opt-in |
| Current-session progress | `update_plan` |
| Code discovery | purpose-fit explorer agents |
| Independent review or implementation | collaboration agents |
| Durable cross-session state | repository `status.json` managed by the state helper |
| Project instructions | `AGENTS.md` |
| Session recovery | Codex rollout or compact handoff, used only as recovery evidence |
| Recovery after a compaction | the root agent invokes `/s-continue` itself — Codex has no hook that can inject context, so this step is explicit and must not be skipped |

Use the root agent as the orchestrator. Keep the Goal aligned with the roadmap outcome and use `update_plan` only for current progress. Neither is the cross-host state authority.

The opt-in word on this host is **`goal`**. Codex has no `Workflow` primitive, so a persistent Goal
is what carries structured, bulk, or barrier-shaped execution across turns and compaction — and it
is created only when the user asks for it by that word. Claude Code's equivalent gate is the word
`ultracode`; see [`runtime-claude-code.md`](runtime-claude-code.md). The two words are not
interchangeable, and a leader must not infer one host's trigger from the other's.

For each delegated task, select a reusable agent type and append the shared role delta, evidence contract, and exclusions. Use explorers for bounded codebase questions and workers for owned implementation. State file ownership explicitly, and remind workers that other edits may coexist.

Run independent Plan and Design reviews in fresh agent contexts. After a blocking finding is fixed, re-run only the affected lens. Do not ask reviewers to add future features that are outside the current success criteria.

Write durable lifecycle changes through the shared state helper. On resume, validate the repository, worktree, branch, commit, and state revision before continuing. Treat rollout data as recovery material rather than the state authority.

When a thread compacts mid-run, the root agent's first action afterwards is `/s-continue`, which
rebuilds the pre-compact turns from the rollout and also loads any `/s-compact` handoff for this
project. Nothing in Codex does this automatically, so an autonomous run that skips it continues on a
summary and re-derives work it already has. Re-read `status.json` in the same breath: the summary is
not the authority for which cluster or phase the run was in.

Keep approval, merge, and final completion decisions in the root agent. Collaboration agents supply evidence and owned changes; they do not become nested leaders.
