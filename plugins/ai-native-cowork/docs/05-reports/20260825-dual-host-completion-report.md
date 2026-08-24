> Status: FROZEN — point-in-time completion evidence.

# Dual-host ai-native-cowork completion report

## Result

One `ai-native-cowork` source now serves Claude Code and Codex with the same six skills, shared lifecycle contracts, deterministic sprint state, and host-native execution mappings.

## Sprint evidence

| Sprint | Result | Commit |
|---|---|---|
| S1 | shared method, risk, dynamic roles, minimal state and transitions | `7bb23ba` |
| S2 | dual-host `pdca-wf` and behavioral parity | `bfa749e` |
| S3 | sequential/concurrent/mixed scheduler, ownership and cluster barriers | `6a83fed` |
| S4 | Codex manifest, six-skill parity, transcript normalization and Goal-envelope filtering | `1c1e9c6` |

Post-audit corrections are committed in `b28641a` and `6e08816`; the final packaging-layout commit moves shared implementation outside public skill discovery.

## Final verification

- Bun: 20/20 tests passed.
- `pdca-wf`: 11/11 runtime parity tests passed.
- `cowork-sprint`: 19/19 state, 4/4 scheduler, and 7/7 behavioral parity tests passed.
- Shared contract and six-skill/manifest parity passed.
- Claude, Codex, and legacy manifests parse as JSON.
- Official Codex plugin validation passed; Ruby/Psych supplied YAML parsing to the unchanged validator because Python PyYAML is absent.
- Legacy revision-50 state validates.
- Sonnet invalidated-lens re-review: PASS, no blocker or major finding (`duration_ms=25574`).
- Sonnet raw-view re-review: PASS, no blocker or major finding (`duration_ms=64592`).
- `git diff --check`: passed.

## Intent and safety audit

The final correction promotes all host-neutral gates into the shared method, makes `cowork-sprint` a thin router, gives both host runtimes the same executable lifecycle table, validates the documented state example with the real state helper, and mutation-tests removal of a real gate row.

Shared contracts live at root `shared/`, outside Codex's discoverable `skills/` directory, so the plugin exposes exactly six skills without a fake shared skill.

Transcript parsing exposes `{raw, messages}` from one read: raw rows retain Codex Goal envelopes for audit, while insights, facets, and commit directives consume the filtered dialogue view.
The exported last-five helper slices the same normalized prompt view, preserving chronological real requests while excluding Goal control.

At this report's verification point, no push, publish, tag, release, install, marketplace mutation, or production action had occurred. The original main worktree contained user-owned TRIM changes, so validation remained in the isolated worktree.

## Residual

None within the implementation scope. Publication state is verified separately during release.
