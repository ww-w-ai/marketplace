# feat(cowork-insights): auto-generate facets before render + facet-extractor agent + language auto-detect

- **Date(KST)**: 2026-06-02 16:04:48
- **Sessions**: `86753e1d`

---

## Conversation Log

> Verbatim, time order, **kept turns only** (SKILL.md Step 3a — sensitive/off-topic turns dropped whole, no placeholder). `>` = user prompt. 🤖 = preceding assistant (truncated, only when user responded to it).

---

**14:59 [86753e1d L107]**
> 헐! cc 소스의 오리지널 insights 생성 프롬프트를 파악해서 왜 정성 레이어가 비어 있는지 파악하고 facet 생성(병렬 서브에이전트로 10세션 트랜스크립트 분석)을 돌려서 cowork-insights를 정성까지 채운 풀버전으로 다시 뽑아본 후, 만족스러운 결과가 나오면 cowork-insights 스킬을 보강해.

*(Two follow-up directives during the work shaped the implementation and are recorded here for intent — they arrived as mid-task interrupts, not standalone turns: (1) "insights 스킬은 무조건 영어로 나오나? cowork-insights는 사용자 언어를 캐치하자" → language auto-detect; (2) "facet 전문 에이전트를 정의하는게 낫지 않아?" → extract the inlined facet prompt into a reusable `cowork-facet-extractor` agent instead of dispatching nine ad-hoc inline prompts.)*

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 2, 1.7h (combined run) |
| Messages | 21 |
| Tools | Bash 35, Edit 19, Read 17 |
| Lines | +410 / -27 (this unit: src/cli.ts + cowork-insights SKILL.md + new agent) |

**Summary**: Diagnosed why cowork-insights reports rendered with an empty qualitative layer — `generate-narrative.ts` only *loads* cached facets and the skill's facet generation was a manual Step 4 that never ran, so `analyzedWithFacets` stayed 0. After studying Claude Code's original `/insights` facet-extraction prompt as the reference, generated 9 session facets via parallel subagents and re-rendered a full report (7/7 sections, rich verbatim key prompts). Then hardened the skill so this is automatic: new `list-uncached` engine subcommand surfaces in-range sessions lacking a facet (matched to the report's analyzed set, subagents skipped, JSONL paths resolved by the engine so the skill never recomputes the project hash); new Step 1.5 dispatches the **`cowork-facet-extractor`** agent per uncached session before rendering; `--language` now auto-detects the conversation language instead of defaulting to `ko`.

**Friction**: A newly symlinked agent is not dispatchable by `subagent_type` until the next session (the agent registry loads at session start) — verified the loop via a `general-purpose` stand-in following the agent spec.

**Assessment**:
- **Goal**: Find the root cause of the empty qualitative layer, prove a full facet-backed report, and make facet generation automatic in the skill.
- **Outcome**: fully_achieved
- **AI Helpfulness**: very_helpful
