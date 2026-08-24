---
name: cowork-sprint
description: Plan and execute multi-feature roadmaps as sequential, concurrent, or mixed sprint clusters. Trigger on sprint planning, run sprints, plan then build, /cowork-sprint, or requests to break an initiative into sprints. Do not use for trivial edits, one-shot fixes, or one feature (use pdca-wf).
argument-hint: "[goal / feature set / plan-file(s)] [--auto-plan]"
---

# cowork-sprint

Deliver one multi-feature roadmap through the same observable contract on Claude Code and Codex.

## Required method

Read [`../../shared/references/cowork-method.md`](../../shared/references/cowork-method.md) completely. It owns roadmap planning, sprint phases, core and risk gates, cluster rules, bounded convergence, safety, outputs, and Done.

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

Do not ask the user to choose a host. Host references map mechanisms only; they cannot waive or redefine the shared contract.

## Inputs

| Mode | Input | Planning behavior |
|---|---|---|
| Interactive | multi-feature goal | build and review a rolling-wave roadmap before execution |
| Preplanned | roadmap plus sprint artifacts | validate dependencies, reviews, ownership, tests, and cluster schedule |
| Resume | canonical status file | validate revision and resume the first unfinished cluster |

Use [`scripts/schedule.py`](scripts/schedule.py) to derive clusters. Use [`scripts/state/state.py`](scripts/state/state.py) for every durable transition. Do not edit status JSON by hand.

## Required references

- [`references/sprint-method.md`](references/sprint-method.md): sizing, cluster execution, verification, worktree, and resume detail.
- [`references/plan-review-panel.md`](references/plan-review-panel.md): independent roadmap, Plan, and Design review lenses plus OODA.
- [`references/gap-analysis.md`](references/gap-analysis.md): WorkList coverage evidence.
- [`references/verification-gates.md`](references/verification-gates.md): optional scored gates.
- [`references/status.schema.json`](references/status.schema.json): durable state shape.
- [`templates/sprint-report.template.md`](templates/sprint-report.template.md): completion report.
- [`templates/retrospective.template.md`](templates/retrospective.template.md): learning proposals when material learning exists.

Read specialist references only when their trigger applies: `agent-authoring.md`, `skill-authoring.md`, `dev-profile.md`, `refactoring.md`, and `migration.md`.

## Outputs and boundary

Produce the shared roadmap, reviewed sprint artifacts, targeted and gap evidence, per-sprint commits and checkpoints, final regression, intent audit, documentation sync, completion report, and any required retrospective.

After each sprint gap check, ask exactly: **what is here that no WorkList item asked for?** This is not a separate agent or review phase.

The leader owns decisions, integration, real command evidence, commits, checkpoints, reports, and approval boundaries. Workers never own leadership, durable state, commits, merges, deploys, or completion claims.
