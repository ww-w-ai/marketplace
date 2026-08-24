# Dual-host cowork S2 report

## Result

`pdca-wf` now exposes one single-feature lifecycle on Claude Code and Codex through a thin capability router and host-native runtime mappings.

## Evidence

| Contract | Evidence | Status |
|---|---|---|
| Shared named phases and ordering | `test_runtime_parity.py` | PASS |
| Separate independent Plan and Design reviews | runtime tables, `ReviewResult`, review panel, templates | PASS |
| Interactive, preplanned, and cowork modes | runtime parity checks | PASS |
| Goal, commit, checkpoint, and safety boundaries | runtime parity checks | PASS |
| Supporting links, schemas, templates, and as-built | runtime parity checks | PASS |
| Shared method and state compatibility | shared contract and state tests | PASS |

Commands:

- `python3 skills/pdca-wf/scripts/test_runtime_parity.py` — 11/11 passed.
- `python3 shared/scripts/test_contract.py` — passed.
- `python3 skills/cowork-sprint/scripts/state/test_state.py` — 15/15 passed.
- `git diff --check` — passed.

## Gap and QA diff

WorkList coverage is complete. The independent review found stale single-review references, missing review schema/template slots, and stale as-built documentation; all were corrected and regression-tested. The final QA diff removed duplicated Brief template prose and condensed the generated as-built summary. No blocker or major gap remains.

## Residual

None. S3 owns multi-sprint scheduling and durable orchestration. S4 owns remaining skills, manifests, transcript filtering, and packaging.
