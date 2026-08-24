# refactor: rename www-insights/www-commit → cowork-insights/cowork-commit

- **Date(KST)**: 2026-05-28 12:45:57
- **Commit**: `d933dd6`

## Recap

| Item | Value |
|------|-------|
| Sessions | 1 (continued), ~0.3h |
| Messages | ~20 (user 6 / assistant 14) |
| Tools | Edit (18), Bash (8), Read (4) |
| Lines | +27 / -26 |

**Summary**: User questioned whether the `www-` prefix would trigger curiosity or just be filed as "web stuff." AI advised the latter — `www-` is too familiar to spark interest. User agreed to switch to `cowork-` prefix, which ties to the plugin name and invites the question "what's cowork?"

**Friction**: None

---

## Directive Log

---

**12:20**
> When people see the www- prefix, will they think "World Wide Web?" — is that curiosity-inducing, or will they just file it as "web tech" and move on?

-> AI gave an honest assessment: the latter is more likely. `www-` is too familiar to trigger curiosity. Suggested `cowork-insights`/`cowork-commit` as alternatives — the plugin identity is preserved and the unfamiliar prefix invites questions.

**12:25**
> Alright, I'll follow your suggestion. Let's go with cowork-insights / cowork-commit

-> AI executed the same rename pipeline: SKILL.md, directories, symlinks, CLI subcommand alias chain (cowork-commit → www-commit → recap-commit), evals, manifest, plugin.json, README, marketplace. Committed and pushed both repos.

---
