# Directive Log — fix README install guide

**Date(KST):** 2026-06-02 14:23:52
**Commit subject:** docs(readme): fix install guide — lead with /plugin commands, drop invalid local syntax

## Conversation Log

> 으이그.. 인스톨 가이드가 이게 맞니?
> https://github.com/ww-w-ai/ai-native-cowork

`[621cee29 L12]`

---

> /plugin marketplace add ww-w-ai/marketplace
> /plugin install ai-native-cowork 로 해야 하는거 아니야?

`[621cee29 L73]`

---

🤖 *Preceding assistant context (reactive turn):* Confirmed the two `/plugin`
commands are correct — the earlier clone error was just both commands pasted as a
single arg, so the whole string became the clone URL. Run them separately:
`/plugin marketplace add ww-w-ai/marketplace` then `/plugin install ai-native-cowork`
(`@ww-w-ai` to disambiguate). Noted the README was missing this canonical command flow.

> readme 고쳐

`[621cee29 L82]`

---

> 다시 cowork-commit & push 해. 이건 버전 안 올려도 되려나? 그럼 마켓플레이스 쪽도 그대로 둬도 되고

`[621cee29 L123]`

## Recap

**Sessions:** 1 · **Duration:** ~5 min · **Messages:** 8
**Top tools:** Bash (6), Read (2), Edit (2)

| Metric | Value |
|---|---|
| Files modified | 1 (`README.md`) |
| Lines added | +19 |
| Lines removed | 0 |
| Category | docs |

### Summary

User flagged that the GitHub README's Install section looked wrong. Investigation
against live GitHub confirmed the marketplace block was valid (marketplace name
`ww-w-ai` and `enabledPlugins` key verified), but the canonical `/plugin marketplace
add` + `/plugin install` command flow was missing entirely, and the "manual install"
snippet used an invalid `ai-native-cowork@local:/path` syntax that CC does not accept.
Rewrote the section: `/plugin` commands as the recommended path, settings.json as the
alternative, and a corrected local-checkout flow (this repo is a plugin not a
marketplace, so install via a local clone of the `ww-w-ai/marketplace` repo).

### Friction

Initial rewrite reintroduced a false claim — `/plugin marketplace add /path/to/
ai-native-cowork` — which fails because this repo ships only `.claude-plugin/plugin.json`
(no `marketplace.json`). Caught and corrected before commit by checking the repo's
`.claude-plugin/` contents.

### Assessment

- **Goal:** Fix incorrect/incomplete README install guide.
- **Outcome:** Achieved. Docs-only change, no version bump (no functional change);
  marketplace entry left untouched (git-URL source reflects `main` on push).
- **Helpfulness:** User's instinct about the `/plugin` command path was correct and
  drove the fix; AI verified facts against live GitHub and caught its own bad-syntax
  regression before commit.
