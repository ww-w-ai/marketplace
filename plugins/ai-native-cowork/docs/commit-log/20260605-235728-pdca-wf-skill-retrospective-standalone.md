# feat: /pdca-wf skill + cowork-sprint retrospective/execution-only integration (fully standalone)

- **Date(KST)**: 2026-06-05 23:57:28
- **Sessions**: `5e95ed1a`, `7e3747ec`

---

## Conversation Log

> Verbatim, time order, **kept turns only** (SKILL.md Step 3a — sensitive/off-topic turns dropped whole, no placeholder). `>` = user prompt. 🤖 = preceding assistant (truncated, only when user responded to it).

---

**14:06 [5e95ed1a L13]**
> 이번에 업데이트된 네이티브 workflow 기능이 아주 강력한 것 같아

**14:08 [5e95ed1a L30]** — responding to assistant
- 🤖 *"맞아요. 핵심이 뭐가 강력한지 짚어보면: 결정론적 오케스트레이션 — pipeline()/parallel()로 fan-out을 코드로 제어 … Workflow = 위임이 아니라 '메인의 직접수행 한 방식'. 띄운 에이전트는 flat 워커, thinking off. 그래서 설계/판단은 여전히 메인이고, Workflow는 결정론·정형·대량·병렬 실행에만 씀."*
> pdca, sprint 의 방식을 흡수하되 실행 방식은 workflow 를 적극적으로 활용하고 싶어

**14:13 [5e95ed1a L43]**
> 재사용 스킬 2개 (추천) / 패턴/템플릿만 / cowork-sprint 확장 -> 재사용 스킬을 2개를 각각 만드는 이유는 뭐야?

**14:16 [5e95ed1a L56]**
> 단계 게이트(No-Go, matchRate<90, 비가역 액션)를 만나면? -> 어차피 우리는 100점까지 개선하는걸 목표로 하니 분기가 없어. 어쩔 수 없이 100점에 도달 못하면 사후 보고

**14:26 [5e95ed1a L85]**
> taxonomy 출력 문서 양식에 날짜+시간을 추가하자. 그래야 순서를 알 수 있고 이력이 관리 됨

**14:27 [5e95ed1a L98]**
> 만든 후에는 built 로 옮기고 planned 에서는 지워야지 (문서의 일부만 구현한 부분은 취소선 처리)

**14:29 [5e95ed1a L117]**
> 부분 구현된 항목 → 01-built에서 취소선 + 잔여 갭으로 기록 : built 는 이미 구현된거니까 취소선이 없지. planned 쪽에서 계획이었는데 구현된걸 취소시켜야지. 그리고 built 의 기존 이력을 고친거면 기존 이력을 취소선 처리하는게 아니라 아예 삭제해 (최종 정보만 남김)

**16:06 [5e95ed1a L523]**
> A, C, E : 도입. 하지만 로컬 문서로만 (메모리, 룰, 위키를 모든 유저에게 범용화하여 적용하기 어려움)

**16:22 [5e95ed1a L549]**
> 1. pdca-wf를 ai-native-cowork 플러그인으로 이전 (유저 로컬 → 플러그인, 의존성 방향 해소)
> 2. cowork-sprint 종결 단계에 회고(A+C+E) 추가 + mid-cycle 진화 축소
> 3. pdca-wf 설계 문서 2개 → 01-built/로 동기화 (/cowork-doc-sync)
> 진행

**19:46 [7e3747ec L136]**
> 마켓플레이스 쪽 소스를 수정해서 뭐해. 심링크 걸린 cache 된쪽을 수정하던가 혹은 DEV/ww-w-ai/ai-native-cowork 원본을 수정해야지

**19:55 [7e3747ec L268]**
> pdca-wf 로드 확인 (심링크라 이후 dev 편집은 즉시 반영) <- 여전히 안 뜨네
> 다른 스킬들은 어떻게 연결했는지 체크해봐. 그래서 폴더로 심링크 건게 아니라 파일들 각각을 걸었나?

**20:55 [7e3747ec L427]**
> cowork-sprint 를 시작하기 전에 pdca-wf 의 플래닝 부분을 미리 해야지. 혹은 cowork-sprint 초기에 플래닝을 끝내고 각 부분에 대해 pdca-wf 를 호출하던가. 안 그러면 각 pdca-wf 시작될 때 플래닝이 되니까 중단되고 한번에 돌리는 의미가 업잖아.

**21:02 [7e3747ec L540]**
> 취소선 ≥ 50%: 취소선 항목 삭제 : 방어코드로 문서가 너무 작으면 삭제하지 말고 남겨놔. 계속 삭제될테니까

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 2, ~9.8h |
| Messages | ~46 user turns (design dialogue + integration + cleanup) |
| Tools | Bash, Edit, Read (+ scenario-test/adversarial-review subagents) |
| Lines | +57 / -30 on tracked files, + new `skills/pdca-wf/` (SKILL 154 lines + 3 references + docs) |

**Summary**: Designed and shipped `/pdca-wf` — a single-feature PDCA cycle that keeps Plan/Design in the main session (thinking) and runs Research/Do/Check as deterministic native Workflow scripts with a verify-to-100, no-branch quality loop (quality gates never pause; only irreversible actions gate back to main). cowork-sprint gained a user-gated terminal Retrospective phase (A agent-review + C local-docs knowledge capture + E carry triage; repo-local outputs only), mid-cycle agent evolution narrowed to unblock-only, and PHASE 0 now freezes per-feature design docs + WorkLists so PHASE 1 invokes pdca-wf execution-only (front-loaded planning — no interactive pause mid-run). Document lifecycle codified: 01-built stays clean (delete superseded, git holds history), strikethrough lives only in 02-planned with a ≥50%+≥3-struck noise cap and a small-doc guard. The plugin was generalized to fully standalone wording (plugin-agnostic discovery/borrowing); future direction is deeper consolidation on the cowork side.

**Friction**: pdca-wf was initially "migrated" into the auto-updated marketplace clone (a GitHub mirror CC never loads skills from) and the user-local copy deleted, making the skill vanish; root cause traced to the actual loading mechanism — per-skill symlinks in `~/.claude/skills/` pointing at this dev repo. Fixed by porting all changes to the dev repo (3-way reapply onto v1.10.0) and adding the missing symlink.

**Assessment**:
- **Goal**: Absorb PDCA/Sprint methodology but execute via native Workflow, as a fully standalone plugin
- **Outcome**: fully_achieved
- **AI Helpfulness**: very_helpful
