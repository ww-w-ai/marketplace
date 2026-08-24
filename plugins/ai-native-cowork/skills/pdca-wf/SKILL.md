---
name: pdca-wf
description: USE for ANY single-feature build request. Trigger when the user asks to implement, build, add, or rework one feature end-to-end, supplies a feature Plan or Design for execution, explicitly requests PDCA, or asks to verify implementation completeness. Runs the shared Research, Brief, Plan review, Design review, Do, targeted Check/Act, and Report lifecycle. Also runs execution-only when cowork-sprint supplies reviewed planning artifacts. Do not use for multi-feature initiatives (use cowork-sprint), trivial edits under about 30 minutes, or pure research with no build.
---

# pdca-wf

Build one feature through the same product contract on Claude Code and Codex.

## Required method

Read **[`../../shared/references/cowork-method.md`](../../shared/references/cowork-method.md)** completely before acting. It is authoritative for phases, core gates, risk scoring, dynamic roles, QA diff, safety, and durable outputs.

Then select the runtime from available capabilities:

```text
update_plan + collaboration agents, without Workflow/TodoWrite
  -> read references/runtime-codex.md

Workflow + TodoWrite, without update_plan
  -> read references/runtime-claude-code.md

both capability sets
  -> stop: ambiguous host capability surface

neither capability set
  -> stop: unsupported host
```

Do not ask the user to choose a host.

## Inputs

| Mode | Required input | Planning |
|---|---|---|
| Interactive standalone | one feature goal or request | run the full shared lifecycle |
| Pre-planned standalone | reviewed Brief, Plan, Design, and WorkList | validate them, then start at Do |
| Called by `cowork-sprint` | reviewed sprint artifacts and caller context | start at Do; return evidence to the leader |

If supplied planning artifacts are incomplete or contain an unresolved blocker, do not enter Do.

## Outputs

Both runtimes produce the same observable outputs:

- research note when research is needed;
- Sprint Brief;
- Plan and independent Plan review result;
- Design with WorkList and independent Design review result;
- targeted test evidence;
- WorkList gap result and QA diff decision;
- completion report and as-built update.

Execution-only mode returns:

```text
{artifacts, targetedTests, gapResult, qaDiff, done, commitReady}
```

After the gap check, ask exactly: **what is here that no WorkList item asked for?** Record the QA diff decision. This is not a separate agent or review phase.

Standalone mode does not infer permission to commit. When called by `cowork-sprint`, the leader owns the mandatory sprint commit and durable checkpoint after receiving `commitReady` evidence.

## Goal boundary

Do not create a Codex Goal for an ordinary feature run. Participate in an existing Goal when the caller already has one. Create a Goal only when the user explicitly requests it.

## References

- [`references/runtime-claude-code.md`](references/runtime-claude-code.md)
- [`references/runtime-codex.md`](references/runtime-codex.md)
- [`references/schemas.md`](references/schemas.md)
- [`references/doc-templates.md`](references/doc-templates.md)
- [`references/taxonomy-map.md`](references/taxonomy-map.md)
