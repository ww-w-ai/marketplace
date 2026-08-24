# refactor: rename skills recap→www-insights, recap-commit→www-commit

- **Date(KST)**: 2026-05-28 08:49:53
- **Commit**: `cefcf02`

## Recap

| Item | Value |
|------|-------|
| Sessions | 1, ~0.5h |
| Messages | ~30 (user 12 / assistant 18) |
| Tools | Edit (22), Bash (14), Read (9) |
| Lines | +44 / -43 |

**Summary**: Renamed plugin skills from `recap`/`recap-commit` to `www-insights`/`www-commit` for brand alignment with the www-cowork plugin identity. Updated SKILL.md frontmatter, CLI subcommand (with backward compat), directory names, symlinks, evals, manifest, plugin.json, README, and marketplace.

**Friction**: None

---

## Directive Log

---

**08:15**
> List the skills provided by the current repo

**08:20**
> I want to rename recap → www-insights, recap-commit → www-commit for branding

-> AI mapped the full blast radius: directories, SKILL.md, manifest, plugin.json, README, evals, src/cli.ts, symlinks, marketplace. Confirmed before proceeding.

**08:25**
> Go ahead, push, bump version, sync marketplace too

-> AI executed: directory renames, all file edits (SKILL.md name/description, manifest version 1.0.0→1.1.0, plugin.json, README /recap→/www-insights references, eval file renames + query updates, CLI subcommand alias), symlink updates, committed, pushed www-cowork and marketplace repos.

---
