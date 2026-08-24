# commit-log file format

Output: `docs/commit-log/<YYYYMMDD-HHMMSS>-<slug>.md` (timestamp = the documented commit's
committer time, KST; forward mode uses "now" at write time). **No commit hash in the
filename or body for forward mode** (a commit can't contain its own hash). Backfill MAY put
the hash in the body since those commits already exist.

`slug` = a SHORT ENGLISH descriptor coined from the commit subject's meaning, lowercase,
words joined by `-`, ≤ 50 chars. Commit subjects are often non-English; a mechanical
`[^a-zA-Z0-9]→-` slug would strip a non-Latin subject to empty, so coin a meaningful English
slug from the subject's meaning instead (e.g. a "runtime-noise gitignore" subject → `gitignore-noise`).

## Template

```markdown
# <commit subject>

- **Date(KST)**: YYYY-MM-DD HH:MM:SS
- **Sessions**: `<sessionId>`[, `<sessionId>` …]

---

## Conversation Log

> Verbatim, time order, **kept turns only** (SKILL.md Step 3a — sensitive/off-topic turns dropped whole, no placeholder). `>` = user prompt. 🤖 = preceding assistant (truncated, only when user responded to it).

---

**HH:MM [<sessionId> L<line>]**
> <userText, verbatim>

**HH:MM [<sessionId> L<line>]** — responding to assistant
- 🤖 *"<precedingAssistant, truncated>"*
- 🤖 *[options] <options joined by " / ">*   ← only when options present
> **[choice] → "<decision>"**                ← only when decision present
> <userText if it adds beyond the decision>

---

## Recap

| Item | Value |
|------|-------|
| Sessions | N, X.Xh |
| Messages | M (user U / assistant A) |
| Tools | <top 3 tools with counts> |
| Lines | +A / -R |

**Summary**: <2-3 sentences — what was done and what decisions were key>

**Friction**: <one-line description if any, otherwise "None">

**Assessment**:
- **Goal**: <what user wanted>
- **Outcome**: fully_achieved / mostly_achieved / partially_achieved / not_achieved
- **AI Helpfulness**: essential / very_helpful / moderately_helpful / slightly_helpful / unhelpful
```

## Rules
- **Scope-filter first** (SKILL.md Step 3a): emit only development-relevant turns; drop sensitive/off-topic whole (reactive turns: judge the included assistant context too).
- Emit turns in `turns[]` order (already sorted by `ts`).
- For non-reactive turns: just the `>` user line with its `[sessionId Ln]` marker.
- For reactive turns (`isReactive: true`): show the 🤖 preceding-assistant line; if `options`
  present, add the `[options]` line; if `decision` present, add the `[choice]` line.
- Keep user text verbatim — do not paraphrase. Assistant text may stay truncated as provided.
- Group consecutive turns under a section heading only if it aids reading; otherwise list
  them flat in time order.
- **Conversation Log comes first** (cause), **Recap comes after** (result).
- **Language**: kept turns in the Conversation Log are always verbatim (original language). Recap section
  (Summary, Friction, Assessment) follows the `--language` option if given, otherwise
  matches the language the user spoke in the conversation.

## README index (`docs/commit-log/README.md`)
Maintain a table; append/update one row per doc. Never rewrite existing rows.

```markdown
| Date(KST) | Summary | Doc |
|-----------|---------|-----|
| YYYY-MM-DD HH:MM:SS | <commit subject> | [<slug>](./<filename>) |
```
