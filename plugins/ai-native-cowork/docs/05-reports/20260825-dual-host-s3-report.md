# Dual-host cowork S3 report

## Result

`cowork-sprint` can now plan and resume sequential, concurrent, and mixed sprint clusters with deterministic dependency and ownership rules on Claude Code and Codex.

## Evidence

| Contract | Evidence | Status |
|---|---|---|
| DAG and ownership scheduler | chain, diamond, mixed, prefix collision, unknown ownership, cycle fixtures | PASS |
| Durable clusters and backward compatibility | state/schema tests; legacy revision 27 validates | PASS |
| Cluster admission and failure direction | earlier-cluster, concurrent-active, failed, archived/done tests | PASS |
| Deterministic integration | stored roadmap-order contract and parity test | PASS |
| Dual-host runtime semantics | canonical cluster contract equality | PASS |

Commands:

- `python3 skills/cowork-sprint/scripts/state/test_state.py` — 19/19 passed.
- `python3 skills/cowork-sprint/scripts/test_schedule.py` — 4/4 passed.
- `python3 skills/cowork-sprint/scripts/test_runtime_parity.py` — 2/2 passed.
- `python3 shared/scripts/test_contract.py` — passed.
- `python3 -m json.tool skills/cowork-sprint/references/status.schema.json` — passed.
- `git diff --check` — passed.

## Gap and QA diff

The independent Check found archived/done admission deadlock and a false-green parity test. Both were fixed. Root regression exposed the same archived dependency inconsistency in the legacy guard; one shared predicate now governs both paths. No unrequested framework or host-specific state fields remain.

## Residual

None. S4 owns remaining skills, agents, manifests, transcript normalization, packaging, and final regression.
