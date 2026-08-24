# Sprint provenance file format

Use this format only when `cowork-sprint` invokes `cowork-commit` after a verified sprint. The initiative conversation is stored once and linked, not duplicated per sprint.

```markdown
# <sprint commit subject>

- **Date(KST)**: YYYY-MM-DD HH:MM:SS
- **Initiative intent**: <repo-relative link>
- **Sprint artifacts**: <Brief/Plan/Design/report links>

---

## Intent inherited

<one concise statement of the approved initiative intent and this sprint's role in it>

## Decision trail

| Decision | Why | Evidence |
|---|---|---|
| <material decision or constraint> | <reason that won> | `<artifact path or test evidence>` |

## Verification

- Targeted tests: <commands and results>
- Gap check: <coverage and residuals>
- QA diff: <removed or justified unrequested work>
- Intent audit: <verdict>

## User Intervention Delta

<verbatim kept turns only when the user intervened after the previous checkpoint>

<!-- Otherwise write exactly: -->
None — autonomous execution continued from the approved roadmap.

## Outcome

- Done: <true|false>
- Commit ready: <true|false>
- Residuals: <none or explicit list>
```

Rules:

- Do not copy the initiative conversation into every sprint.
- Do not classify worker, reviewer, subagent, Workflow, or Goal-control prompts as user dialogue.
- Every decision row cites an existing artifact or real verification result.
- Apply the same secret, absolute-path, conflict-marker, and JSON gates as transcript mode.
