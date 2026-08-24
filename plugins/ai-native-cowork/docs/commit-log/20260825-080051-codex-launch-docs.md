# docs(release): add Codex launch docs for v1.18.0

- **Date(KST)**: 2026-08-25 08:00:51
- **Sessions**: `01a035f8`

---

## Conversation Log

> Verbatim, time order, kept turns only.

**07:54 [01a035f8 L70]**
> cowork-doc-sync, cowork-commit 실행 후 푸시 + maketplace 도 업데이트
> 그런데 cc 는 마켓플레이스를 통해서 배포되는데 codex 는?

**07:56 [01a035f8 L211]** — responding to assistant
- 🤖 *"회귀 테스트는 모두 통과했습니다… 완료된 roadmap은 `02-planned`에서 `04-legacy`로 이동하고… `1.18.0` release surface를 맞춥니다."*
> 문서는 codex 너가 더 잘 만드는 것 같아. doc sync 는 sonnet 시키지 말고 직접 수행해

**07:56 [01a035f8 L213]**
> codex 용 readme 를 새로 만들어야 하니 할 일이 많아

**07:58 [01a035f8 L253]** — responding to assistant
- 🤖 *"작업 범위를 `README-CODEX.md` 신규 작성, 공개 Codex Marketplace packaging 설계·검증, 기존 README의 정확한 진입 링크까지 확장하겠습니다."*
> 다국어 대응도 해야 할거야 원래 몇개 언어로 대응되어 있었지? 영어/한국어만 있었나?

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 1, about 0.1h |
| Messages | 4 retained user decisions |
| Tools | transcript engine, git, regression suites |
| Lines | +567 / -10 |

**Summary**: Codex directly synchronized the completed dual-host implementation, added a dedicated Product Hunt-style Codex guide in English, Korean, Japanese, and Simplified Chinese, and aligned the v1.18.0 package surfaces. The release now treats Claude Code and Codex as separate Marketplace formats while preserving one canonical product source.

**Friction**: The collaboration engine reported zero sessions for the nested worktree because the Codex session cwd was its parent repository; the directive view was rerun at the parent scope and strictly filtered to the four release decisions above.

**Assessment**:
- **Goal**: Sync documentation, preserve AI intent, publish the dual-host product, and update its Marketplace distribution.
- **Outcome**: mostly_achieved (product and docs ready; push and Marketplace publication follow this commit)
- **AI Helpfulness**: essential
