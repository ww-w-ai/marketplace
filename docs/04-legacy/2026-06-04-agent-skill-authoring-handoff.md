> 상태: FROZEN (2026-06-06) — SUPERSEDED. v1.10.0 (873b94a)으로 출하 완료 — trigger-fit descriptions + authoring patterns. 현재 진실 = skills/*/SKILL.md + references/{agent,skill}-authoring.md

# Agent/Skill 저작 표준화 — 세션 인계 (2026-06-04)

> 컨텍스트: cowork-doc-sync code-health 기능 추가에서 출발 → "스킬/에이전트를 어떻게 만들어야 하는가" 표준 정립으로 확장.
> 핵심 원칙(이번 세션 확정, 글로벌 룰에 박음): **패턴을 채택하면 항상 3곳 모두 업데이트** — (1) 우리 현재 skill/agent (2) skill/agent 생성·업데이트 가이드(유저용) (3) 글로벌 룰(나를 위함).

## 1. 이번 세션 완료

### A. doc-sync code-health 기능 (원 작업)
- `skills/cowork-doc-sync/SKILL.md`: code-health 관찰 = **doc↔code 대조의 by-product**(잘못 고친 것 포착). 1차=불일치, 2차=구조. step 2에 disambiguation(코드가 결정 배신 시 doc으로 덮지 말고 flag). 소스변경 게이트. 경량 리포트 포맷. 97→77줄 압축.
- `references/taxonomy.md`: 05-reports에 code-health 분류 추가.

### B. 저작 표준 정립 — 리서치 + 3-레이어 적용
리서치: CC 공식 docs + skill-creator(Anthropic) + superpowers writing-skills + plugin-dev/feature-dev/vercel 등 ~10개 ref + **CC 소스(v2.1.88) 직접 검증**.

- **글로벌 룰 신규**: `~/.claude/rules/agent-skill-authoring.md` (저작 메커니즘 단일 정본, 자동로드).
- **생성 가이드**: `skills/cowork-sprint/references/skill-authoring.md` **신규**(agent-authoring의 짝) + `agent-authoring.md` 보강(mis-citation 수정·TOC·트리거 가이드) + `sprint/SKILL.md`에 skill 스캐폴드 포인터.
- **우리 아티팩트 (A그룹=크기/구조 적용)**: >100줄 ref 3개에 TOC(agent-authoring·sprint-method·html-style-guide).
- **부수**: `~/.claude/rules/ai-parseable-no-emoji.md`(장식 vs 기능마커 구분), `~/.claude/agent-skill-principles.md`(저작룰 포인터).

### C. description 규칙 확정 (긴 논의의 결론)
- **description = 主 트리거 메커니즘(설명문 아님).** "어떤 상황에 발동해야 하나" 관점, 암묵 표현 포함.
- **undertrigger 대비 약간 pushy** (skill-creator 근거: Claude는 스킬을 써야 할 때 안 씀).
- **when_to_use 내용은 description 한 필드에 통합**(별도 when_to_use X — 같은 예산 공유, invoke 시 body만 로드).
- **≤1024자**(Agent Skills 스펙 필드 max). **간결하되 트리거 완전성 > 짧음.**
- 3곳(글로벌룰·skill-authoring·agent-authoring)에 reframe 완료.

### D. CC 소스 검증 결과 (확정 사실, file:line)
- 스킬 리스팅: `SkillTool/prompt.ts:29` `MAX_LISTING_DESC_CHARS=250` + 1%-컨텍스트 동적 예산. **단 현재 런타임에선 250 절단이 관찰 안 됨(full 노출)** → 250은 버전 의존, 보편규칙 아님.
- 에이전트 리스팅: `AgentTool/prompt.ts:45` **캡 없음**(full), `validateAgent.ts:70` >5000자 soft 경고만.
- invoke 시: `SkillTool.ts:1068` parseFrontmatter로 **body만 주입**(frontmatter description/when_to_use는 invoke 후 컨텍스트에 안 올라옴 = 라우팅 전용).
- 1024 = 다출처 교차검증된 **스펙 필드 max**(agentskills.io/specification). 1536은 별개(리스팅 절단, 덜 확실).
- 실측 footprint: 설치 스킬134+에이전트69 description 합 **~54k자 ≈ 13.5k토큰** 상주(보수적 하한).

### E. 기타
- promptfoo 최신 클론 → `~/Documents/DEV/refs/promptfoo`(git, v0.121.14). 구버전 zip 삭제. vault에 reference 엔티티 등록(peery와 비교 포함).

## 2. 다음 세션 할 일

### 최우선 — 우리 스킬 description 재작성 + eval 검증
- 우리 5개 스킬 description(현재 474~851자)을 **trigger-fit + pushy** lens로 재작성.
- **트리거 eval로 검증 필수**(description=트리거 표면). 인프라 있음: `evals/trigger-eval*.json` + skill-creator `run_loop.py`/`run_eval.py`(`claude -p`, 20개 should/should-not, near-miss, 5회 반복, held-out test score).
- 3-레이어 원칙대로: 우리 스킬 + (생성가이드·글로벌룰엔 이미 반영됨).

### 패턴 그룹 C~G 채택 (논의/선별 후 3-레이어 적용)
미도입 ROI 높은 것 (각각 우리아티팩트+생성가이드+글로벌룰):
- #31 rationalization 테이블(Excuse|Reality) [9, N]
- #25 edge-case "언제 보고 안 하나" [8, N]
- #53 eval-driven 반복(우리 evals/ 인프라 있음) [8, N]
- #22 confidence 임계 필터 [8, P] · #30 phase-gating [8, P] · #32 Red Flags/STOP [8, P]
- #36 MANDATORY TodoWrite [7, N] · #55 기계검증 스크립트 [7, N] · #35 success-criteria 테이블 [7, P]
- 전체 59개 패턴 목록·점수·도입여부는 이 세션 대화에 있음(필요시 /continue로 복기).

### 미해결 확인
- ~~1024 char vs byte~~ **RESOLVED (2026-06-04, 스펙 fetch)**: agentskills.io/specification = `description` **Max 1024 characters** (바이트 아님, Unicode 문자). 한글도 ~1024자 가능. + body **<5000토큰 권장**, name ≤64, compatibility ≤500. 공식 검증기 **`skills-ref validate`** 존재 → #55(기계검증)는 이걸 차용.
- **현재 CC 버전의 SkillTool**: 250 캡이 왜 현 런타임에 미적용인지(버전갭/플래그) — 정확히 보려면 현재 버전 소스 확인.
- ~~B그룹 #15(`<example>` 블록)~~ **RESOLVED**: 생성 템플릿(`agent.template.md` L10-14)이 이미 운반("auto-firing agent엔 권장, explicit-only는 생략"으로 명확화) → 앞으로 스캐폴드 에이전트가 자동 적용. 기존 intent-auditor는 explicit-invocation이라 **스킵 확정**(retrofit 불요).

### 커밋
- 이번 세션 변경 미커밋. manifest **1.9.0 → 1.10.0** 범프 + 커밋 필요.

## 3. 기타사항 / 주의

- **변경 파일 (repo, 미커밋)**: `cowork-doc-sync/SKILL.md`·`references/taxonomy.md`, `cowork-insights/references/html-style-guide.md`, `cowork-sprint/SKILL.md`·`references/agent-authoring.md`·`references/sprint-method.md`, **신규** `cowork-sprint/references/skill-authoring.md`.
- **변경 파일 (글로벌 ~/.claude, repo 밖·커밋 무관)**: 신규 `rules/agent-skill-authoring.md`, `rules/ai-parseable-no-emoji.md`, `agent-skill-principles.md`.
- **교훈(메타)**: 이번 세션 두 번 거짓확신(에이전트 "official ~150-250" 오인용 / description "250 절단 보편" 단정) → 둘 다 소스·실측으로 정정. **숫자·동작은 소스/실측으로 확인 후 단정.** 문서 인용도 버전 의존일 수 있음.
- **eval 게이트**: description 변경은 트리거 정확도에 직결 → 항상 트리거 eval 재실행과 함께.
- 250 절단은 **버전 의존**이라 규칙으로 박지 않음. 채택 규칙 = **1024 스펙 + 트리거 완전성 우선 + front-load(hedge)**.
