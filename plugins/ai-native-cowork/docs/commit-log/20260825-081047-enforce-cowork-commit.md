# fix(cowork-sprint): enforce AI-aware sprint commits

> **Correction (2026-08-25):** The conclusion below was too strict. Autonomous `cowork-sprint` commits should not require a new per-sprint user transcript. The initiative conversation belongs in one shared intent log; each sprint records artifact-led decision provenance and only adds verbatim dialogue when the user actually intervened. The earlier seven commits are not defective merely because their autonomous windows lacked user turns, and no transcript backfill is required.

- **Date(KST)**: 2026-08-25 08:10:47
- **Sessions**: `01a035f8`

---

## Conversation Log

**08:05 [01a035f8 L449]** — responding to assistant
- 🤖 *"같은 `ww-w-ai/marketplace` Git 저장소 안에 Codex 규격인 `.agents/plugins/marketplace.json`과 실제 `plugins/ai-native-cowork` package가 필요합니다."*
> 이전 세션의 작업들에 대한 내용들도 cowork-commit 이 되었나?

**08:07 [01a035f8 L529]** — responding to assistant
- 🤖 *"Marketplace에 v1.18.0 canonical source가 Git subtree로 추가됐습니다."*
> cowork-sprint 에는 cowork-commit 을 쓰라고 되어 있지?

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 1, about 0.1h |
| Messages | 2 retained user decisions |
| Tools | transcript engine, parity tests, git audit |
| Lines | +45 / -6 |

**Summary**: Audited the prior dual-host sprint commits and confirmed that they were bare commits without directive logs, despite the legacy sprint method requiring `cowork-commit`. Strengthened the shared method, both host runtimes, as-built documentation, and behavior tests so a real commit plus directive log is now an explicit cross-host gate.

**Friction**: Mechanical backfill was attempted but rejected: S1 had no qualifying turn, and every later commit window contained only worker prompts with author-absolute paths that the commit safety gate forbids. The historical hashes remain unchanged, and the gap is recorded here instead of fabricating compliant history.

**Assessment**:
- **Goal**: Make the sprint commit contract explicit and preserve an honest record of the historical gap.
- **Outcome**: fully_achieved
- **AI Helpfulness**: essential
