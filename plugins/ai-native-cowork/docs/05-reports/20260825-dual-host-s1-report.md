# S1 report: shared contract and durable state

Status: PASS
Risk: 7/10

## Result

S1 established the host-neutral cowork method, Claude Code and Codex runtime mappings, a minimal durable state schema, deterministic state transitions, risk scoring, and focused contract checks. The existing TRIM work was preserved as one concise QA diff question instead of a separate mandatory agent phase.

## QA

| WorkList | Result | Evidence |
|---|---|---|
| S1-01 Shared method | PASS | Both runtime references consume `cowork-method.md`; parity test rejects host tools in shared text and shared-section redefinition |
| S1-02 Minimal state | PASS | Strict schema and semantic validator accept representative CC/Codex lifecycles and reject report fields, bad paths, missing/cyclic dependencies, and invalid timestamps |
| S1-03 State transitions | PASS | 15 tests cover lifecycle, dependency, pause/resume, decisions, commit, completion, failure/archive, stale revisions, atomic preservation, and path traversal |
| S1-04 Risk score | PASS | Sum validation and 0–3/4–6/7–10 thresholds tested; shared contract keeps core and safety gates independent |
| S1-05 Dynamic roles | PASS | Base role, sprint delta, evidence contract, and exclusions are defined once in shared text and consumed by both runtimes |
| S1-06 TRIM preservation | PASS | Original intent retained as the unrequested-diff question; contract test rejects a separate mandatory TRIM phase |
| S1-07 Host seam parity | PASS | Shared contract contains no host tool names; host references map mechanisms without redefining method sections |
| S1-08 Entrypoint consumption | PASS | `cowork-sprint` and `pdca-wf` link shared method and both runtime references while S2/S3 orchestration remains deferred |

## Commands

```text
python3 skills/cowork-sprint/scripts/state/test_state.py
python3 shared/scripts/test_contract.py
python3 -m py_compile <state and contract scripts>
python3 -m json.tool skills/cowork-sprint/references/status.schema.json
bun test src/commit-log.test.ts
git diff --check
```

Results: state 15/15, contract parity PASS, existing Bun tests 15/15, compile/schema/whitespace PASS.

## QA diff check

The state helper is justified because repeated manual state edits produced real drift in free-harness and FastDoc. No additional framework or host abstraction was added beyond the approved shared method, two runtime mappings, one schema, and one deterministic helper.

## Carry

- S2 implements the dual-host `pdca-wf` entrypoints and execution mapping.
- S3 replaces the remaining Claude-only `cowork-sprint` method clauses with the shared rolling-wave contract.
- S4 normalizes transcripts, filters Codex goal-continuation control envelopes from user-message views, and adds Codex packaging and six-skill parity.
