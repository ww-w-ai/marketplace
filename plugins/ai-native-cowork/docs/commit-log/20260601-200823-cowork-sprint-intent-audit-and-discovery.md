# feat(cowork-sprint): intent-audit Tier-2 gate + intent-auditor agent + agent discovery; harden exit-predicate/100%-cap5; englishize plugin

- **Date(KST)**: 2026-06-01 20:08:23
- **Sessions**: `b1abc18e` (this), with genesis context from `9175f1a3`/`8d9dd70b` (sooji), `3d8506d1` (thessen-ai)

---

## Conversation Log

> Verbatim, time order, **kept turns only** (SKILL.md Step 3a). `>` = user prompt. 🤖 = preceding assistant (truncated, only when user responded to it).

### Cross-project genesis (sooji / thessen-ai — why these enhancements exist)

> These turns, in other projects, drove this commit's design. They are the intent-for-the-next-worker record: the cowork-sprint enhancements came from real dogfooding, not speculation.

**[8d9dd70b L1075]** (sooji)
> 실행하면서 스킬이 우리 의도대로 실행이 되고 있는지 중간 중간 자가점검 해.

**[9175f1a3 L539]** (sooji)
> /ai-native-cowork:cowork-sprint S1+S2 를 실제 구현 실행하며, 우리의 의도대로 스킬이 발현되는지 체크까지 동시에 진행

**[9175f1a3 L439]** (sooji)
> cowork-sprint 와 bypass-pdca 를 비교하면서 우리의 의도가 잘 반영되었는지 갭분석 실행. bkit 의 sprint 기능은 참고삼아 보면서 우리쪽 스킬을 개선시킬만한 부분이 있으면 흡수 (너무 오버엔지니어링이 되지 않게 주의)

**[9175f1a3 L599]** (sooji)
> cowork 스킬에 refactoring 에이전트 or 스킬 or 참조 문서를 만들어서 위 내용을 기록해두면 리팩토링 작업에 좋을 것 같은데? 어떤 식으로 적용할까? (현재 general-purpose 작업이 돌면서 병렬 사이드로 작업)

**[3d8506d1 L450]** (thessen-ai)
> sprint 로 쪼개서 각 스프린트를 bypass-pdca 루프로 끝까지 실행하라니까? 물어보지 말고, 애매한게 있으면 모아뒀다가 마지막에 리포트 해

**[3d8506d1 L341]** (thessen-ai)
> 도메인 관련 기능과 목적은 변리사님의 의도가 담긴거 (특히 ui 로 눈에 보이는 부분) 지만, 눈에 안 보이는 소스의 영역은 ai 가 맘대로 만들었는데 놓쳤을 가능성도 크거든

### This session (b1abc18e)

**[b1abc18e L12]**
> 다른 프로젝트들에서 cowork-commit 스킬 개선에 도움을 줬어. 현재소스가 바껴 있을거야. 현재 최종 소스 확인해.

**[b1abc18e L114]**
> Tip: /goal keeps Claude working until a condition is met. Good for "tests pass", "build succeeds", or long refactors.
> -> goal 기능을 cowork-sprint 에 합쳐서 녹여야 할 듯?

**[b1abc18e L135]**
> 전역 룰(doc-sync-usage.md) 명령어명 cowork-doc-*로 정합 + CLAUDE.md 버전 1.5.0 동기화 -- 당연히 해야 하니 병렬로 진행

**[b1abc18e L137]**
> cowork-sprint를 사용자 CLAUDE.md PDCA/Sprint 룰과 적대적으로 리뷰 -> 이건 무슨 말인지 모르겠어. 적대적으로 리뷰? 서로 안 맞는 부분이 있는지 체크해보고 싱크 맞춘다는건가?

**[b1abc18e L139]**
> cowork-sprint 스킬이 생겼으니, 이 스킬을 쓰라고 가이드를 주고 claude.md 와 rules 에서 상세한 내용은 제거해

**[b1abc18e L245]** — responding to assistant
- 🤖 *"/goal 리서치 백그라운드 진행 중 — 4번(적대적 리뷰)을 먼저 진행할지 제안"*
> 리서치 완료를 기다리는 동안 4번(적대적 리뷰) 를 먼저 진행

**[b1abc18e L276]**
> a1 : 100%/cap5 확정, a2: research 추가, a3: 미루지 마라. 꼭 다음 스프린트로 미룰 경우에는 반드시 그 이유를 작성해서 마지막 리포트 보고에 포함

**[b1abc18e L457]**
> 별도 스킬은 오버인건 동의. self-check 로 할지, 혹은 점검을 할 '감사' 역할의 에이전트를 호출할지? 어떤게 좋아?

**[b1abc18e L466]** — responding to assistant
- 🤖 *"감사 에이전트(fresh 컨텍스트) 권장 — self-check.md는 그 에이전트의 루브릭으로"*
> 감사 역할의 에이전트는 고정시켜서 미리 만들어둘까?

**[b1abc18e L481]**
> 감사 에이전트는 도메인 무관(dev/마케팅 공통) → 정적 파일 박을 필요 없이 기존 agent.template.md로 스캐폴드 + self-check.md 주입 -> 이게 그 얘긴가?

> *(이 턴이 앞선 내 발언의 모순을 잡음 — "도메인 무관"은 스캐폴드 근거가 아니라 고정 근거. 결론: 도메인-무관 메타역할 = 고정 동봉, 도메인-특화 실행역할 = 동적 스캐폴드.)*

**[b1abc18e L490]**
> 메인 세션에서 에이전트를 동적으로 생성하는데, 생성하기 전에 먼저 bkit 외에도 이미 유저의 플러그인/글로벌/로컬에 적합한 에이전트가 있으면 알아서 부르지?

**[b1abc18e — englishize + deploy directive]**
> 모든 스킬, 에이전트, 문서를 영어화
> 배포에는 marketplace 쪽에도 싱크 맞춰야 하는거 알지?

**[b1abc18e — /cowork-commit invocation]**
> thessen-ai, sooji 프로젝트에서의 실제 결정에 영향을 미친 중요한 대화는 가져와서 함께 반영

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 1 (b1abc18e), ~3.4h + cross-project genesis (sooji/thessen) |
| Messages | 19 (this session) |
| Tools | Edit 28 / Bash 21 / Read 12 (+ 2 background research/translation agents) |
| Lines | tracked diff +93/-34 at mid-session; final commit also lands new skills (cowork-sprint, cowork-doc-sync/init) + agents/ previously untracked |

**Summary**: Folded the Claude Code `/goal` pattern, bypass-pdca's 100%/cap-5 iterate standard, and the ralph-loop truthful-completion rule into cowork-sprint as a hardened **exit-predicate contract** (3-part: measurable end-state + executed check + reward-hack invariants; the Leader runs the check on real exit code rather than trusting the transcript — strictly safer than `/goal`). Added a **Tier-2 intent-audit gate** (output-serves-INTENT, not just output-matches-plan) run from a reset perspective by a new fixed `cowork-intent-auditor` agent, plus **discover-before-scaffold** agent reuse (project → global → all plugins, not bkit-only). Absorbed two sooji-observed gaps: happy-path-only harness = 2nd false-green (Gap A → refactoring.md), and objective-gate-upgrades-DIRECT-to-DELEGATE (Gap B → sprint-method.md §4). Resolved A1/A2/A3 (100%/cap5, add Research phase, no-silent-defer + written carry reason). Thinned global CLAUDE.md + pdca-loop.md to point sprint-execution detail at the skill while keeping universal PDCA/sub-of-sub/trigger rules. Englishized the whole plugin (3 doc-sync files via subagent + light touch-ups), verified 0 Hangul outside verbatim commit-logs.

**Friction**: Mid-design I drew opposite conclusions from the same premise ("domain-agnostic" → both "scaffold" and "fix"); user caught it (L481). Corrected: domain-agnostic ⇒ fixed, not scaffolded. (This is exactly the self-deception class the new intent-audit gate targets.)

**Assessment**:
- **Goal**: Evolve the cowork plugin's sprint orchestrator with a metacognition/self-check layer learned from real dogfooding in sooji/thessen-ai, dedup global rules into the skill, and ship in English.
- **Outcome**: mostly_achieved (skill + agent + global thinning + englishization done & verified; marketplace sync + commit pending).
- **AI Helpfulness**: very_helpful
