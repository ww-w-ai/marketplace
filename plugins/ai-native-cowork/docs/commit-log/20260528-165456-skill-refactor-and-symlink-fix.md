# refactor: streamline cowork-commit skill + fix symlink session discovery

- **Date(KST)**: 2026-05-28 16:54:56
- **Sessions**: `00390488`, `7532fe8d`

---

## Conversation Log

> Verbatim transcription in time order. `>` = user prompt. 🤖 = preceding assistant (truncated, only when user responded to it).

---

**13:51 [00390488 L1249]** — responding to assistant
- 🤖 *"이게 정확히 `/cowork-commit`이 팔리는 포인트입니다 — diff는 what, directive log는 why."*
> 커밋 메시지에 몇줄을 보여주고 더보기에 링크를 걸면 좋겠다

**13:51 [00390488 L1263]** — responding to assistant
- 🤖 *"SKILL.md의 Step 4를 이 방향으로 수정할까요? 기존 `<details>` 풀 recap은 directive-log 파일로 이동하고, 커밋 메시지는 경량화."*
> recap 은 어떤 내용이었지?

**13:52 [00390488 L1272]** — responding to assistant
- 🤖 *"이 전체를 directive-log 파일에 넣고, 커밋 메시지는 Key Prompts 2-3개 + 파일 링크만 남기면 — 커밋 히스토리가 훨씬 가독성 좋아집니다."*
> recap 은 pr 에 들어가는게 맞을 듯!

**13:53 [00390488 L1281]** — responding to assistant
- 🤖 *"커밋 메시지: Key decisions 2-3줄 + `📄 docs/commit-log/...` 링크, PR body: 기존 `<details>` recap 블록 그대로"*
> 그럼 cowork-pr 도 있어야 하나?

**13:53 [00390488 L1291]**
> 음.. 그런데 pr 은 여러명이 작업한걸 합쳐서 볼 수도 있으니 그냥 commit 할 때마다 붙여놓는게 더 맞는 것 같기도 해

**13:55 [00390488 L1313]** — responding to assistant
- 🤖 *"diff만으로는 왜 두 번 리네이밍했는지 알 수 없습니다. 대화가 있어야 의사결정 맥락이 남습니다."*
> 이제 key prompts 는 빼도 돼. 대화 자체가 별도로 남으니까

**13:56 [00390488 L1322]** — responding to assistant
- 🤖 *"빠진 것: Key Prompts, Other Prompts, Learnings, Stats. 남은 것: Summary, AI Contribution, Assessment, 파일 링크"*
> 그게 아니라 대화가 보이는데 더보기가 대화 쪽으로 가는거지

**13:58 [00390488 L1335]**
> 음.. 20260528-133918-fix-readme-stale-ref.md 과 같은 문서에 대화 내용만 넣는게 아니라 그 밑에 recap 내용도 포함시키면 되겠다. 대화를 통해 결과가 나오니까 대화가 먼저, 결과는 아래. 그리고 커밋 메시지에는 주요 내용 요약본이 들어가고 더보기를 눌러서 상세보기

**14:01 [00390488 L1422]** — responding to assistant
- 🤖 *"SKILL.md 리팩토링 완료. Step 2: 커밋 메시지 경량화, Step 3: directive-log에 대화→recap 순서 통합."*
> 아니 그냥 커밋 하면 어떻게 해. 우리 cowork-commit 을 이용해야지

**14:15 [00390488 L1465]**
> 소스를 푸시된걸 돌리고 /cowork-commit 해볼까?

--- *(new session after directory rename)* ---

**14:15 [7532fe8d L12]**
> /continue last

**14:17 [7532fe8d]**
> cowork-commit 테스트 중이었음

**14:18 [7532fe8d]**
> cowork-commit으로 다시 커밋하려다 중단됨 — 엔진이 프로젝트 해시 불일치로 세션을 못 찾는 문제 있음 : 이것도 폴더명 바껴서 그런거지?

**14:22 [7532fe8d]**
> 1 (symlink으로 해결)

**16:53 [7532fe8d]**
> /cowork-commit 실행 → 엔진 세션 0 → session-scanner.ts에서 isDirectory()가 심링크를 false 반환하는 버그 발견 → isSymbolicLink() 추가 → 엔진 정상 동작

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 2, 2.6h |
| Messages | 46 (user 34 + 12) |
| Tools | Bash(19), Read(4), Edit(1) |
| Lines | +50 / -92 |

**Summary**: Refactored cowork-commit SKILL.md to streamline the commit message format — removed Key Prompts section (conversation log in directive-log file makes it redundant), restructured directive-log template to conversation-first/recap-second order. Discovered and fixed a bug in session-scanner.ts where `isDirectory()` returns false for symlinks, causing the engine to miss sessions when a project directory is renamed and symlinked.

**Friction**: Directory rename (`www-cowork` → `ai-native-cowork`) caused project hash mismatch. Node.js `Dirent.isDirectory()` returning false for symlinks was the root cause of engine failing to find sessions.

**Assessment**:
- **Goal**: Test cowork-commit with new SKILL.md format; fix session discovery after directory rename
- **Outcome**: fully_achieved
- **AI Helpfulness**: essential
