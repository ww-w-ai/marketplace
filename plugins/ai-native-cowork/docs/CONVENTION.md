# Documentation sync contract

> Status: LIVING — project-local configuration for `cowork-doc-sync`.

## Taxonomy

This repository inherits the standard `00-reference` through `99-misc` taxonomy. Tool-generated collaboration records remain under `docs/commit-log/`.

## LIVING authority

- `docs/01-built/` contains the current implementation truth.
- `CLAUDE.md` contains the compact repository map.
- Runtime contracts and schemas linked from `docs/01-built/` are executable authorities.

## Additional sync surfaces

Keep these files aligned when host support, skills, or packaging changes:

- `README.md`
- `README-CODEX.md` and localized `README-CODEX.*.md` variants
- `CLAUDE.md`
- `manifest.json`
- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`
- `scripts/test_product_parity.py`

## Status verification

- Verify versions with `python3 scripts/test_product_parity.py` and JSON parsing.
- Verify shipped commits with `git log` and `git branch --contains <commit>`.
- Verify publication or deployment claims against the relevant remote after push. Local labels alone are not proof.

## Derived documentation

None. All documentation in this repository is edited at its source.

## Vault boundary

Keep engineering plans, reports, and platform research here. File product, market, or business research in the external planning vault.
