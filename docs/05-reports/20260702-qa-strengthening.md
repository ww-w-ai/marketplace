> 상태: FROZEN report (2026-07-02) — 완료 기록(as-executed 스냅샷). 살아있는 진실은
> `docs/01-built/dev-profile.design.md` + `skills/cowork-sprint/references/gap-analysis.md`
> (multi-axis) + `agents/qa-debug-analyst.md`. 이 파일은 "무엇을·왜 그렇게" 남긴 기록일 뿐.
> 적대적 리뷰로 재정리한 델타만 실행. 원계획의 ~2/3은 이미 구현돼 있었고(dev-profile 흡수),
> 핵심 신규안(7축 하드코딩)은 사용자 교정으로 "환경 맞춤 사용 가이드(비옵션)"로 방향 전환.
> 대상: 이 플러그인(ai-native-cowork, MIT). 원천: bkit(Apache-2.0).

# cowork-sprint QA 강화 — as-executed 기록

## 배경 / 의도 (불변)
bkit의 강점 = "다 됐나"를 눈대중 아닌 **다축 채점 + 증거 인용 + 자가수정**으로 게이트해
껍데기 구현을 못 통과시킴. 이를 cowork-sprint에 흡수하되 **도메인 무관 + 모든 사용자
배포 + bkit 미설치** 제약 유지.

## 적대적 리뷰 결과 (실행 전 게이트)
원계획(2026-07-02)을 현행 코드(7/1 dev-profile 흡수분)에 대조한 결과:

**이미 구현돼 있던 것 (재작업 불필요):**
- 게이트 목표 = 100 (gap-analysis.md 기본값), fake-green 금지·anti-gaming 명문,
  placeholder→partial, 3-way contract(spec↔server↔client), 2축 게이트 —
  전부 `references/gap-analysis.md`에 있음.
- 3층 게이트(기계 baseline + gap-analysis Axis2 + intent-audit Tier2),
  matchRate==100, "test count did not drop" 불변식 — `sprint-method.md §5`에 정식화됨.
- dataflow UI→API→DB — 고정 7-hop이 아니라 **적응형 서브렌즈**로 이미 존재(§3.6/§7).
- qa-test-planner / qa-test-generator — 이미 vendored + THIRD-PARTY-NOTICES 고지됨.
- THIRD-PARTY-NOTICES.md — 이미 존재(원계획의 "신규 생성" 전제 오류 → append로 처리).

**충돌 (원안 그대로 실행 시 문제):**
- 원안 "7축 가중 matchRate를 코드 스프린트 기본으로 하드코딩" ↔ 현행 설계의 명시적
  결정 "fixed N-axis는 example, not hardcoded"(도메인 결합 회피). → 되돌리면 안 됨.

## 실제 실행한 델타 (사용자 확정 방향)
1. **다축 채점 = dev 스프린트 기본 규율(비옵션), 축 세트만 환경 적응** — 사용자 교정
   반영. `gap-analysis.md § Multi-axis scoring` 신설: 7축 참조(Structural/Functional/
   Contract/Intent/Behavioral/UX/Runtime) + 적응 규칙(없는 축은 재분배, silently-zero
   금지; Runtime은 실행 가능할 때만·못 하면 not_measured). "옵션으로 두면 안 쓰게 되니
   쓰라고 가이드." 비코드 스프린트는 flat 유지. `dev-profile.md §3.2` 문구도 정합.
2. **qa-debug-analyst 이식(하나만)** — `agents/qa-debug-analyst.md`. docker-log /
   zero-script-qa 가정 제거 → 런타임 무관(스택이 가진 로그 표면 사용). Apache-2.0 헤더 +
   `dev-profile.md §4` 군단 등재 + NOTICES append.

## 기각 / 보류 (실행 안 함 — 근거)
- **sprint-qa-flow 고정 7-hop 에이전트 이식**: 현행 적응형 dataflow 서브렌즈로 이미
  대체됨. 고정 에이전트는 도메인 결합 재도입 → 기각(현행 유지).
- **qa-strategist 이식**: 오케스트레이터성 → sub-of-sub 금지 + 리더가 역할 대행하므로
  토큰값 못 함 → 보류.
- **qa-monitor(docker)**: 원안대로 기본 기각(Docker 프로젝트 옵트인만).
- **7축 하드코딩**: 상기 충돌로 기각 → "사용 가이드"로 치환(항목 1).

## git 로지스틱 (실행 시 준수함)
- 편집은 **원본 DEV repo**에서만. 마켓플레이스 사본은 미접촉(다음 publish로 sync).
- DEV 트리의 미커밋 한국어→영어 영문화 WIP(사용자 소유, 잔량으로 보류 중)는 **미접촉** —
  이번 QA 편집 파일과 겹치는 파일 0개라 분리 커밋으로 안전.

## 검증 (실행 후)
- 이식 에이전트 ≤1500단어 + description 형식 cowork 규약 일치.
- gap-analysis / dev-profile 포인터 정합(`§ Multi-axis scoring` 헤딩 실재).
- NOTICES 출처·변경(docker 제거) 명시.
- 스테이징 = QA 파일만(영문화 WIP 제외).
