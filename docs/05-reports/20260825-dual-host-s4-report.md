# Dual-host cowork S4 report

## Result

The plugin now exposes the same six skills to Claude Code and Codex, scans both transcript formats, and excludes Codex Goal control envelopes from user-facing views without changing raw history.

## Evidence

- Bun engine tests: 19/19 passed, including malformed-tree Codex discovery resilience.
- Product parity: six skills and three manifest names/versions passed.
- S1–S3 state/runtime suites: 19 + 4 + 2 + 11 tests passed; shared contract passed.
- Manifest JSON: Claude, Codex, and legacy manifests parse.
- Live discovery: 24 Codex sessions found in the selected project scope; normalized sample contained zero Goal envelopes.
- `git diff --check`: passed.

## Gap and QA diff

One normalizer owns format compatibility. No duplicate Codex skill tree, marketplace mutation, installation, release, push, or tag was added. The official plugin validator could not start because all available Python environments lack PyYAML; JSON and product-parity checks cover the manifest itself.

Independent Check found whole-scan abort on one malformed Codex tree entry, missing persisted discovery coverage, and Claude-only manifest wording. Per-level/per-file failure isolation, a temporary-tree scanner test, and dual-host manifest descriptions resolved all findings.

## Residual

Final whole-roadmap regression, consumer review, intent audit, and documentation close remain before goal completion.
