# feat: field-test-driven evolution — QA table gate, evolution-centric retrospective, output templates, stronger pdca-wf triggers

- **Date(KST)**: 2026-06-06 12:50:24
- **Sessions**: `7e3747ec`

> Context: a 12-sprint cowork-sprint run on a real project was evaluated against intent (6 sessions replayed + repo ground truth). The gaps found there drove every change in this commit.

---

## Conversation Log

> Verbatim, time order, **kept turns only** (SKILL.md Step 3a). `>` = user prompt.

---

**12:30 [7e3747ec L1345]**
> 그래서 개선해야 할게 뭐야? 짧게 설명해봐
> 그리고 스킬 자체에서 스스로 평가한 자가진화 리포트도 만들어놨거든 그 내용도 파악해서 같이 보고

**12:33 [7e3747ec L1364]**
> 자가진단에 잘된 것과 못한 것, 그 중에서 프롬프트나 스크립트 소스로 개선 가능한 것을 구분하라고 명시해줘야겠네

**12:34 [7e3747ec L1402]**
> QA 정의 업그레이드 (1순위) : plan 단계에서 해야 하면 유저가 직접 설정해야 하니 너무 귀찮아. 단순히 QA 를 하라고 하는게 아니라 "QA 표를 만들고 완수 여부를 표에 체크해서 보고하라" 고 하면 누락시키지 않을 듯

**12:36 [7e3747ec L1463]**
> 회고 템플릿 은 에이전트의 자가진화에 초점을 맞춰 집중되면 좋겠음!

**12:38 [7e3747ec L1493]**
> Workflow 패널 출력 schema 강제, 제안 = 이걸 사후 발견이 아니라 사전 체크로: 병렬 일꾼들 결과물을 합치는 통합 단계에서 Leader가 "여러 파일에 똑같은/비슷한 보조 함수가 복사돼 있나?"를 의무적으로 검사 → 있으면 공유본 하나로 합치고 그것만 점검. 복사본이 N개면 결함도 N배가 되니까요 : 병렬로 만든게 있으면 공통 부분을 뽑아내는 과정이 있으면 좋겟네 굿

**12:39 [7e3747ec L1537]**
> 그리고 pdca-wf 의 발동 조건이 약하면 안 불릴 것 같은데 그럼 우리가 기껏 만들어둔 이유가 없잖아

**12:41 [7e3747ec L1571]**
> llm 은 템플릿이 확실할 때 일을 잘하는 것 같아. 선택을 템플릿화하여 output 할 수 있도록 하자. 그리고 그 외에도 output 을 템플릿화할 수 있는 부분이 있으면 모두 템플릿화 해

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 1 (field-test evaluation + 7 improvement directives) |
| Messages | 7 user turns kept |
| Tools | Edit, Bash, Write |
| Lines | +3 SKILL/refs modified, +3 new template files (~210 lines) |

**Summary**: A real 12-sprint cowork-sprint field run exposed gaps the skill's own retrospective missed (the user spotted "lots of features, thin QA" in minutes; the self-retro was wins-only). Five upgrades landed: (1) mandatory per-sprint QA TABLE the Leader builds and checks off itself — green runners alone are not QA, user never authors criteria; (2) retrospective refocused on SELF-EVOLUTION — every section must end in an evolution proposal or "no change needed", went-poorly items tagged [FIXABLE-PROMPT|FIXABLE-SCRIPT|PROCESS] with target file; (3) INTEGRATION common-extraction pass after parallel fan-out (N copies of a helper = N× defect surface — the fence-escape ×7 root cause promoted to a rule) + compact-return schema for verification panels; (4) pdca-wf trigger strengthened to fire on implicit single-feature build requests ("이 기능 만들어줘") not just skill-name mentions; (5) all structured outputs templatized — sprint-report / retrospective(+APPLY-GATE numbered-choice table) / pdca-wf doc skeletons — "filled, never restructured", because LLMs execute reliably when the structure is fixed and only slots remain.

**Friction**: None — design dialogue converged in single passes.

**Assessment**:
- **Goal**: Convert field-test findings into source-level skill evolution (prompt + template)
- **Outcome**: fully_achieved
- **AI Helpfulness**: very_helpful
