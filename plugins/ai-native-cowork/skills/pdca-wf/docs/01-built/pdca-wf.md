> Status: LIVING — as-built. Live authority = `../../SKILL.md` + `../../references/*`.
> Last updated: 2026-08-25 00:00

# pdca-wf — as-built

Single-feature PDCA with one shared contract and native execution on Claude Code and Codex.

## Authority map

- `SKILL.md`: capability-based host router and trigger boundary.
- `../../../../shared/references/cowork-method.md`: phases, gates, risk, roles, safety, and outputs.
- `references/runtime-claude-code.md`: TodoWrite, Workflow, and Agent mapping.
- `references/runtime-codex.md`: update_plan and collaboration mapping; no implicit Goal.
- `references/plan-review-panel.md`: separate Plan and Design review lenses plus OODA.
- `references/schemas.md`: ResearchFindings, ReviewResult, WorkList, GapResult, and Report.
- `references/doc-templates.md`: Brief, Plan/review, Design/review, Check, Report, and as-built templates.
- `references/workflow-scripts.md` and `references/taxonomy-map.md`: preserved Claude mechanics and document lifecycle.

## Current contract

- Named lifecycle: `research`, `brief`, `plan`, `plan-review`, `design`, `design-review`, `do`, `targeted-test`, `gap-check`, `qa-diff`, `report`.
- Plan review asks whether the right work is planned. Design review asks whether it is implementable and verifiable. Both are independent core gates.
- Modes: `interactive` runs the full lifecycle; `preplanned` validates supplied artifacts; `cowork` starts at `do` and returns evidence to the sprint leader.
- Standalone runs do not infer commit permission. In `cowork` mode, the leader owns the mandatory commit and checkpoint.
- Check/Act runs real targeted commands and is bounded to five iterations. Done requires complete WorkList coverage and no blocker or major gap.
- External or irreversible actions always return to the user approval boundary.

## Proven behavior

`scripts/test_runtime_parity.py` checks host phase parity, entry modes, reviews, Goal and commit boundaries, links, supporting schemas/templates, and retired public phase labels.
