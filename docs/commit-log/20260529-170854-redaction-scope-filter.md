# cowork-commit: scope-filter redaction for directive logs

- **Date(KST)**: 2026-05-29 17:08:54
- **Sessions**: `920499ac`

> Scope of this log: kept turns only (SKILL.md Step 3a). Turns whose substance was personal,
> financial, credential, or unrelated to this product's development were dropped entirely — not
> masked, not summarized. What remains is the design conversation that shaped this change.

---

## Conversation Log

> Verbatim transcription in time order, kept turns only. `>` = user prompt. 🤖 = preceding assistant (truncated).

---

**07:49 [920499ac L54]** — responding to assistant
- 🤖 *"읽었습니다. commit-log 자체를 보고 든 생각 — 하나가 결정적입니다. ## 치명적 모순: 제외한다고 선언하고 맨 밑에서 노출…"*
> 음.. 내가 보기에 개인 정보, 예민한 정보, 그리고 소스나 개발 방향과는 무관한 내용들이 포함된게 문제야

**07:50 [920499ac L63]** — responding to assistant
- 🤖 *"맞습니다. 그리고 제가 한 줄에 꽂힌 게 너무 좁았네요 — 문제는 '무관한 내용이 새어든다'는 클래스지 특정 줄이 아닙니다…"*
> 1회로 모든걸 해결하려고 하지 말고, 여러번 api 를 타도 괜찮으니 퀄리티가 중요해

**07:55 [920499ac L108]**
> 애초에 개인·재무·크레덴셜 이 포함된 대화는 대부분 참고사항일 뿐, 제품 개발과는 무관하잖아. 혹시 아니더라도 그런 대화는 그냥 다 버려도 돼. 굳이 마킹을 하거나 하면서 무리하게 포함시키지 않아도 됨. 나의 의도는 어떤 프롬프트를 쓰느냐에 따라 약간만 달라져도 다른 결과를 만들 수 있기 때문에, 프롬프트를 보존하여 노하우로 쌓으려는거야

**08:04 [920499ac L201]**
> 동일 redaction을 cowork-insights에도 적용(거기도 prompt verbatim 노출) : 그래? insights 는 prompt 를 1,2개 정도만 포함하긴 한데.. 그래도 예민한게 드렁갈 수도 있긴 하지. 하지만 특정 기간, 폴더를 본인이 지정하고 만들어진 html 문서를 본인이 확인한 후 공유할거라 그건 둬도 될 듯 (html 이 자동 커밋에 포함되진 않음)

**08:05 [920499ac L211]**
> 그리고 cowork-insights 는 cc 의 insights 스킬을 분석해서 만든거라 그대로 둬도 될 것 같아

---

## Recap

| Item | Value |
|------|-------|
| Sessions | 1 (`920499ac`) — multi-day window |
| Messages | 40 (window total, pre-filter) |
| Tools | Bash 56 / Edit 18 / Read 15 |
| Lines (this commit) | +65 / -11 (source) + this log |

**Summary**: Added a scope-filter (Step 3a) to the `cowork-commit` skill so directive logs commit
**only development-relevant turns** — personal, financial, credential, and off-scope turns are
dropped whole (no masking), with **drop-on-doubt** as the default and a deterministic secret gate
plus a pre-commit re-scan as backstops. The design preserves dev prompts verbatim (prompt wording
is reusable know-how) while making the rationalize-to-include path structurally impossible.
`cowork-insights` was deliberately left unchanged: its HTML output is user-scoped, human-reviewed
before sharing, and not auto-committed. Versions aligned to 1.3.0 across manifest / plugin.json / CLAUDE.md.

**Friction**: Initial instruction ("source-affecting only") was first misread as a file-scope
filter; clarified to mean a content filter on the recap. Resolved before implementation.

**Assessment**:
- **Goal**: Stop sensitive content from leaking into committed directive logs without losing the prompt-as-know-how value.
- **Outcome**: fully_achieved
- **AI Helpfulness**: very_helpful
