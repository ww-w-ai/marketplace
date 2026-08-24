# feat(cowork-sprint): force commit + doc-sync as mandatory cycle steps

- **Date(KST)**: 2026-06-02 17:07:46
- **Sessions**: `e93e29c9` (sooji project — where this fix was diagnosed and decided)

> Note: the change lives in this repo (ai-native-cowork), but the conversation that
> produced it happened while running `/cowork-sprint` in the **sooji** project — the
> directive log is pulled from that session per the cross-project origin.

---

## Conversation Log

> Verbatim, time order, **kept turns only** (SKILL.md Step 3a — sensitive/off-topic turns dropped whole, no placeholder). `>` = user prompt.

---

**[e93e29c9 L928]**
> cowork-sprint 에 cowork-commit 이랑 cowork-doc-sync 가 단계별로 포함되어 있지 않아?

**[e93e29c9 L963]**
> cowork-sprint 에 commit 과 doc-sync 가 누락되지 않게 강제하도록 문구 조정

**[e93e29c9 L1013]**
> ~/.claude/skills/cowork-sprint/SKILL.md <- ??? ww-w-ai/ 하위의 플러그인 소스를 수정해야지! 저 스킬은 symlink 인건가? (그럼 결국 원본이 같이 고쳐지려나)

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 1 (sooji `e93e29c9`, cross-project origin) |
| Tools | Edit, Read, Grep |
| Lines | +19 / -4 (skills/cowork-sprint/SKILL.md + references/sprint-method.md) |

**Summary**: While running a real `/cowork-sprint` in the sooji project, the user noticed the cycle never actually triggered `/cowork-commit` or `/cowork-doc-sync` — they were implied but not enforced, so sprints ended at the report with stale docs and bare `git commit`s. Promoted both to **mandatory** steps: `commit` is now an explicit per-sprint cycle phase (via `/cowork-commit`, not a bare commit — carries the WHY message + directive-log + mechanical-hygiene subset), and `/cowork-doc-sync` is the mandatory terminal step after all sprints (anti-pattern: ending at the report and merely *proposing* doc-sync). The edit was correctly made in the **plugin source** (this repo) rather than the symlinked `~/.claude/skills/` copy. Also synced `references/sprint-method.md` for consistency — added `commit` to the cycle string and the `cyclePhase` enum.

**Friction**: The skill file is reached via a `~/.claude/skills/cowork-sprint/` symlink; the user flagged that edits must target the plugin source repo, not the symlink path — they resolve to the same file, but the source repo is the authority that gets committed.

**Assessment**:
- **Goal**: Stop cowork-sprint from silently skipping commit and doc-sync — make both mandatory cycle steps.
- **Outcome**: fully_achieved
- **AI Helpfulness**: very_helpful
