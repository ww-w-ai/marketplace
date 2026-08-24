# fix(cowork): separate initiative dialogue from sprint provenance

- **Date(KST)**: 2026-08-25 08:19:37
- **Sessions**: `01a035f8`

---

## Conversation Log

**08:16 [01a035f8 L830]**
> 이전 7개 sprint 커밋은 cowork-commit이 아니었습니다. 안전한 backfill도 검토했지만, S1은 추출 가능한 turn이 없고 나머지 기록은
>   절대 사용자 경로를 포함해 commit safety gate가 거부했습니다. 기록을 조작하지 않고 이 결함과 수정 이유를 새 collaboration log에
>   남겼습니다. 이제 shared contract는 bare git commit을 명시적으로 거부하고 cowork-commit + directive log를 필수로 검사합니다.
>
>  -> 생각해보면 cowork-sprint 는 유저 대화가 sprint 초기 시작 전에 몰려 있고 그 뒤에는 쭉 자율 주행이라 스프린트 별로 유저 대화를 기록하는건 맞지가 않아

**08:18 [01a035f8 L867]** — responding to assistant
- 🤖 *"`cowork-commit`: 일반 transcript 모드와 autonomous sprint provenance 모드를 분리… 기존 결함 로그의 결론을 명시적으로 정정"*
> 수정 후 마켓플레이스 버전 업 포함 배포 및 로컬에 재설치까지 진행

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 1, about 0.1h |
| Messages | 2 retained user decisions |
| Tools | contract audit, parity tests, skill validation |
| Lines | +150 / -16 |

**Summary**: Replaced the incorrect per-sprint transcript requirement with a two-level provenance model. The initiative preserves user intent once; autonomous sprint commits link that intent and record artifact-backed decisions, verification, and only genuine user-intervention deltas.

**Friction**: The prior correction confused decision provenance with repeated conversation provenance and incorrectly labeled seven autonomous commits as defective.

**Assessment**:
- **Goal**: Preserve trustworthy sprint intent without inventing or duplicating user dialogue.
- **Outcome**: fully_achieved
- **AI Helpfulness**: essential
