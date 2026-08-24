# feat: trigger-fit skill descriptions + adopted authoring patterns (3-layer) — v1.10.0

- **Date(KST)**: 2026-06-04 15:48:22
- **Sessions**: `24589626`, `b5bb1e81`, `86753e1d`

---

## Conversation Log

> Verbatim, time order, **kept turns only** (sensitive/off-topic/superseded turns dropped whole). `>` = user prompt. 🤖 = preceding assistant (truncated, only when user responded to it).

---

**02:21 [24589626 L13]**
> cowork-doc-sync 스킬이 사실 버그(혹은 잠재적 버그), 부족하거나 유연하지 못한 아키텍처, 코드의 재활용성, 클린 아키텍처로의 전환 가능성 등을 검토하기 좋은 단계이기에 스킬 결과에 리포트를 해주면 좋을 듯

**22:47 [24589626 L460]** — responding to assistant
- 🤖 *"삭제 완료 (extraction 225MB + zip 둘 다 제거).  정리 — 이번 세션 처리 현황: - doc-sync 스킬에 **code-health 리포트 + directed deep-review handoff** 추가 (shadowing/도구-중립 반영) — `SKILL.md` + `taxonomy.md` - promptfoo 최신 클론 → **`"*
> code-review ultra 내용은 삭제하고 라이트한 코드 리뷰만 하자

**22:58 [24589626 L549]**
> 현재 repo 를 검토하는게 아니라 이 스킬을 쓰는 유저들의 소스를 검토하는 용도잖아. 물론 자가검증용으로도 쓸 수 있겠지만 소스가 변경된게 있을 때만이겠지

**22:59 [24589626 L589]**
> 맞아 문서를 작성하거나 고치다 보면, 자연스럽게 그 소스에서 부족한 점이나 고칠 점을 발견할 때가 많거든. (사람이 실제 일할 때)
사람이 일하는 방식을 자연스럽게 ai 에게 대입해보는게 ai-native 의 시작이니까

**23:01 [24589626 L621]** — responding to assistant
- 🤖 *"메모리에 박았습니다.  이제 doc-sync code-health 작업은 설계 의도대로 완성됐고, 남은 건 마무리 2건: - manifest **1.9.0 → 1.10.0** 범프 + 커밋 - 글로벌 CLAUDE.md "Reference Paths"에 promptfoo refs 등록  둘 다 진행할까요, 아니면 따로?"*
> 메모리에 박는게 아니라 스킬 문서에 적용을 해야지

**23:04 [24589626 L676]** — responding to assistant
- 🤖 *"이제 의도가 스킬에 제대로 박혔습니다:  - **갭1 해소** — What/When에 rationale 명시: "사람이 문서 손대다 코드 결함 발견하듯, 이미 하는 일의 by-product." 실행 AI가 generic 리뷰로 오해 안 함. - **갭2 해소** — step 2가 불일치를 만나면 **"어느 쪽이 틀렸나" 먼저 판별**(사람의 판단): doc"*
> 스킬, 에이전트의 표현이 너무 과대하면 안되는거 알지? 지금 우리 몇 라인씩이야?

**23:08 [24589626 L752]**
> 에이전트 만들 때 cc 공식 가이드를 참고로 했었거든. 한번 더 찾아보고(교차 검증), 스킬도 공식 가이드 내용 찾아봐

**23:20 [24589626 L919]**
> 모든 플러그인의 에이전트와 스킬을 전체 검토해서 참고할만한 양식 있는지 체크 (아까는 기준/가이드를 체크했다면, 지금은 실제 만들어진 md 문서 내용을 보고 참고할 부분을 찾자)

**23:29 [24589626 L967]**
> 차용 후보 다수가 ✅❌🛑를 씀 -> AI 가 이해하기 위한 부분 맞아? ai 가 읽을 때에도 이모지가 도움이 되려나? (학습이 되었다면 그럴 수 있을 것 같기도)

**23:35 [24589626 L976]**
> 현재까지 모은 정보를 바탕으로, 
1. 현재 우리의 skill, agent 의 내용을 보강 (길이 오버플로우 주의)
2. skill, agent 를 만드는 스킬에도 가이드 확립 (유저를 위해)
3. skill, agent 는 이렇게 만들어야 한다고 글로벌 rules 에도 추가 (이건 나를 위해)

**23:49 [24589626 L1127]** — responding to assistant
- 🤖 *"중요: repo diff엔 **프로젝트 4파일 + 신규 1개**만 잡힙니다. 글로벌 룰 변경(`~/.claude/rules/agent-skill-authoring.md` 신규, ai-parseable 정밀화, principles 포인터)은 **이 repo 밖**(홈)이라 여기 안 보입니다.  ## 커밋 안 된 변경 — 무엇을 개선했나  | 파일 | 개선 내"*
> 우리 길이가 짧은데 이미 꽤 잘 만들어둔 상태 맞아? 너무 자신하는 것 같은데

**00:54 [24589626 L1219]**
> 어디서 가져온건지 출처도 남기고,   최고 ROI (점수 높음 + 미도입/부분) — 여기서 고르시면 효율적:
  - #31 rationalization 테이블 (9, N) · #25 edge-case 제외 (8, N) · #53 eval-driven 루프 (8, N — 우리 evals/ 인프라 이미
  있음)
  - #22 confidence 임계 (8, P) · #30 phase-gating (8, P) · #32 Red Flags/STOP (8, P)
  - #36 MANDATORY TodoWrite (7, N) · #55 기계검증 스크립트 (7, N) · #35 success-criteria 테이블 (7, P)

 의 경우에는 별도 표시

**01:01 [24589626 L1246]**
> 우리 스킬/에이전트에 적용하는 것 뿐 아니라, 스킬/에이전트를 생성/업데이트 하는 부분의 프롬프트에도 주입해줘야 해

**01:06 [24589626 L1322]** — responding to assistant
- 🤖 *"B(Frontmatter)의 미도입분은 **#13·#15·#18 셋**뿐(나머지는 Y). 거의 안 길어집니다 — 단 description을 건드리는 게 있어 **eval 게이트**가 붙습니다.  - **#18 길이 제한** | 무료. 텍스트 추가 아니라 **규율**("description ~1024자 이내"). 오히려 짧게 유지. 저작 가이드에 1줄. - "*
> 참 글로벌 rules (나를 위함) 에도 추가해야 해 알지?

**01:12 [24589626 L1419]**
> 게다가 1024는 skill description 기준이고, agent description엔 그 상한이 없습니다 -> 이건 cc 소스를 보고 소스 레벨로 제대로 파악해봐

**10:03 [24589626 L1578]**
> 실제로 시스템프롬프트 혹은 현재 콘텍스트윈도우에 skill, agent 의 디스크립션이 어느 정도 길이로 포함되어 있는지 체크해보자

**10:20 [24589626 L1623]** — responding to assistant
- 🤖 *"먼저 1024 출처 확정 (이번엔 여러 독립 출처로 교차검증됨 — 제 창작 아님): - superpowers `anthropic-best-practices.md:150,1095` "description (1024 **characters** maximum)" - superpowers `writing-skills/SKILL.md:97,607` "Max 1024"*
> when-to-use 를 합쳐서 1024자 이내로 하되, 가급적 짧게 표현하라고 가이드를 하자

**10:27 [24589626 L1730]**
> 1024 char/byte 확정 -> 1024 bytes 면 너무 짧을 수도 있을 것 같은데? 다국어는 한글자에 3~4바이트 되니까

**10:32 [b5bb1e81 L67]**
> B그룹(Frontmatter) 재개 — 핵심은 우리
  5개 스킬 description을 trigger-fit으로 재작성(현재 474~851자) + 트리거 eval 검증 동반 -> 이거 해야 하는거지? c~g 그룹 내용 검토하게 병렬로 진행하고 c 그룹 내용 다시 보여줘

**15:44 [b5bb1e81 L360]** — responding to assistant
- 🤖 *"통합 재검증 **전부 PASS** (subagent 자기보고 일부 부정확했으나 실제 결과는 정확 — distrust가 옳았음):  | 항목 | 확인 | |---|---| | sprint description + **`triggers:` 죽은 필드 제거** | OK (frontmatter에 stray triggers 0) | | doc-sync / doc-i"*
> F그룹 #55 — 권고: 라이트로 채택 : OK

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 3, ~43.9h elapsed (intermittent) |
| Messages | 116 (substantive turns kept: 20) |
| Tools | Edit 81, Bash 159, Read 52 |
| Lines | +1002 / -49 (repo subset of a multi-file authoring-standardization arc) |

**Summary**: Standardized how this plugin's skills/agents are authored, then applied it. (1) Rewrote 3 skill descriptions (cowork-sprint, cowork-doc-sync, cowork-doc-init) to be trigger-fit — front-loaded trigger phrases + implicit cues + near-miss DO-NOT, and removed cowork-sprint's dead `triggers:` YAML field (CC source confirms only `description`/`when_to_use` are parsed for routing). commit/insights left unchanged (already trigger-fit). (2) Adopted authoring patterns surveyed from official guides + ~10 reference plugins, applied across 3 layers (our artifacts / generation guides / global rule): C #22 confidence-threshold + #25 edge-case-exclusions on intent-auditor; D #29 one-line maxim, #30 phase gate, #31 Excuse|Reality, #32 Red Flags/STOP, #34 Quick-Ref, #36 mandatory TodoWrite; #33 create-vs-reuse gate for sprint's dynamic scaffolding; F #55 lightweight pre-save mechanical check. E/G skipped; #53 full eval-loop + #54 retrofit skipped as too heavy. (3) Authored 5 trigger-eval sets and verified the rewrites via an LLM-router proxy eval.

**Key decisions / intent for the next worker**:
- doc-sync code-health is a **by-product of doc↔code reconciliation** (a human editing docs naturally spots code defects), NOT a separate audit — and targets the *user's* changed source, lightweight only (the ultra/cloud deep-review handoff was deliberately removed).
- description = **trigger surface, not prose**: merge when_to_use in, ≤1024 **characters** (spec max, not bytes — cross-verified), front-load triggers, "trigger completeness > brevity". The 250-char listing cap is **runtime-version-dependent** (observed not applied), so NOT made a rule.
- eval verdict is honest: proxy shows **no regression** (100/100 both), but **does not prove superiority** (ceiling effect + real CC router unreachable: `claude -p` = Not logged in). Rewrites applied on **principle-fit**, not measured win.
- #55 wording was corrected pre-commit: a vague "run `skills-ref validate`" (unverified external tool) → concrete `wc -l`/`grep`/`jq` checks primary, external validator optional.
- Meta-lesson (recurred twice this arc): false confidence ("already well-made", "150-250 official", "250 universal") was each time corrected by source/measurement. Verify numbers/behavior at the source before asserting.

**Friction**: Two false-confidence corrections by the user; `claude -p` auth failure forced switching the eval from real-router to subagent-proxy; one subagent's self-report ("already present") was inaccurate and required main-session git re-verification.

**Assessment**:
- **Goal**: Resume B-group (trigger-fit description rewrites + eval) and adopt selected C–G authoring patterns into 3 layers.
- **Outcome**: fully_achieved
- **AI Helpfulness**: very_helpful
