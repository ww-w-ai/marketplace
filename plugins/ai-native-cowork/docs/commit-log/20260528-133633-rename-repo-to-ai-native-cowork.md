# refactor: rename repo www-cowork → ai-native-cowork

- **Date(KST)**: 2026-05-28 13:36:33
- **Commit**: `9b39901`

## Recap

| Item | Value |
|------|-------|
| Sessions | 1 (continued), ~0.3h |
| Messages | ~16 (user 6 / assistant 10) |
| Tools | Edit (7), Bash (10), Read (2) |
| Lines | +15 / -15 |

**Summary**: User wanted to rename the repo itself for AI discoverability — "AI reads repo names now, not humans." Considered `ai-driven-cowork`, `www-ai-driven-cowork`, and `ai-native-cowork`. AI recommended against `ai-driven` (zero information, every AI tool claims it) and the `www-` variants (same problem just solved). User chose `ai-native-cowork` — it signals architecture philosophy, not marketing.

**Friction**: None

---

## Directive Log

---

**13:10**
> I'm thinking of renaming the repo too

-> AI cautioned that repo renames have more cascading costs than skill renames (marketplace URL, enabledPlugins key, plugin cache, absolute paths in SKILL.md). Recommended keeping `www-cowork`.

**13:12**
> No — AI reads repo names now, not humans

-> User reframed the problem. Repo names are signals for AI agents browsing marketplaces, not humans typing URLs. AI acknowledged the shift and compared options.

**13:15**
> How about ai-native-cowork?

-> AI confirmed: `ai-native` is an architecture declaration, not a buzzword. Aligns with ww-w-ai's technical philosophy. Better signal than `ai-driven` (generic) or `ai-cowork` (ambiguous).

**13:18**
> Yes, proceed

-> AI executed: updated all internal references and absolute paths, committed, pushed, renamed GitHub repo via `gh repo rename`, updated git remote, renamed local directory, updated symlinks, updated `enabledPlugins` key in global settings.json, updated marketplace source URL + plugin name, pushed marketplace.

---
