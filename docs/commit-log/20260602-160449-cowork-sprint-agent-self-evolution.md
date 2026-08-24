# feat(cowork-sprint): agent self-evolution loop + ≤1500-word prompt cap

- **Date(KST)**: 2026-06-02 16:04:49
- **Sessions**: `86753e1d`

---

## Conversation Log

> Verbatim, time order, **kept turns only** (SKILL.md Step 3a — sensitive/off-topic turns dropped whole, no placeholder). `>` = user prompt. 🤖 = preceding assistant (truncated, only when user responded to it).

---

**15:26 [86753e1d L479]** — responding to assistant
- 🤖 *"…the cowork-insights facet work is complete. For cowork-sprint I'd add: after a scaffolded agent runs, evaluate its output and, only when the gap is a definition defect, refine the agent within a prompt-length cap (compact, not append); cap evolution rounds; split a mis-scoped role rather than inflate it. Implement now, or defer to a separate session?"*
> 지금 cowork-sprint에 구현

*(The original feature request, earlier the same session: "cowork-sprint에서 에이전트를 pick/생성하는데, 에이전트가 만든 결과를 평가하고 부족하면 에이전트를 자가 진화시키는 기능을 추가하면 좋겠어. 에이전트를 정의하는 프롬프트 길이의 max를 둬서 너무 길어지지 않고 재편성되도록.")*

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 2, 1.7h (combined run) |
| Messages | 21 |
| Tools | Bash 35, Edit 19, Read 17 |
| Lines | +410 / -27 (this unit: cowork-sprint SKILL.md + agent-authoring.md + sprint-method.md + agent.template.md) |

**Summary**: Added a bounded self-evolution loop to cowork-sprint's agent lifecycle: after an owned scaffolded agent runs, the Leader evaluates its output off existing signals (exit-predicate / QA / intent-audit — no new heavy pass), and **only when the gap is a definition defect** (would recur — vague role, missing constraint, loose output-format, over-broad scope) rewrites the agent `.md`. The key guard is the diagnose step (definition-defect vs one-off) — churning the agent on one-off noise is called out as reward-hacking the loop and forbidden. Introduced a **hard ≤1500-word body cap** (mechanically checked via `awk`/`wc -w`) that forces compaction over accretion; a role that can't fit must be **split**, not inflated. Capped at 2 evolution rounds/agent/sprint with a new `AGENT_EVOLUTION_EXHAUSTED` auto-pause; recorded in `status.json` via `agentEvolutions[]`. Scope is strict: only cowork-sprint-owned project-local scaffolds evolve — borrowed plugin/user-global and the fixed shipped agents stay read-only.

**Friction**: None.

**Assessment**:
- **Goal**: Add agent self-evolution (evaluate output → refine the agent when lacking) with a prompt-length max that compacts rather than grows.
- **Outcome**: fully_achieved
- **AI Helpfulness**: very_helpful
