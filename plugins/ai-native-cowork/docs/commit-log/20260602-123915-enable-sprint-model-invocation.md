# feat: make cowork-sprint model-invocable (remove disable-model-invocation)

- **Date(KST)**: 2026-06-02 12:39:15
- **Sessions**: `d2b5ff17`

---

## Conversation Log

> Verbatim, time order, **kept turns only** (SKILL.md Step 3a — sensitive/off-topic turns dropped whole, no placeholder). `>` = user prompt. 🤖 = preceding assistant (truncated, only when user responded to it).

---

**12:32 [d2b5ff17 L69]**
> Skill cowork-sprint cannot be used with Skill tool due to disable-model-invocation <- 으이그 이게 뭐니, 당연히 ai 도 호출할 수 있게 모든 스킬 설정 다 바꿔

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 1, ~0.3h |
| Messages | 5 (user 5 / assistant 5) |
| Tools | Bash, Edit, Read |
| Lines | +2 / -3 |

**Summary**: `cowork-sprint` was the only skill carrying `disable-model-invocation: true`, which blocked the AI from invoking it via the Skill tool (it could only be user-triggered). Per the user's instruction, removed that frontmatter line so the AI can dispatch `cowork-sprint` directly. The skill's description still discourages misuse on trivial single-file edits, so oversensitive auto-triggering stays suppressed without the hard block. Bumped minor version 1.6.2 → 1.7.0 (newly AI-invocable skill = capability-surface change).

**Friction**: None.

**Assessment**:
- **Goal**: Let the AI invoke `cowork-sprint` (and confirm no other skill is similarly blocked).
- **Outcome**: fully_achieved
- **AI Helpfulness**: very_helpful
