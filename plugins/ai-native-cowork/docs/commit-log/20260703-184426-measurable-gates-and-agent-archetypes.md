# feat(cowork-sprint): on-demand measurable verification gates + dev-as-sample agent archetypes — v1.16.0

- **Date(KST)**: 2026-07-03 18:44:26
- **Sessions**: cross-project — this work was driven inside an **agent-sooji** session (the
  cowork-commit engine found 0 sessions under this repo's path, so the turns below are the
  verbatim user directives from that session, hand-filtered to the decisions that shaped this diff).

---

## Conversation Log

> Verbatim, time order, kept turns only (decisions that shaped the diff). `>` = user prompt.
> 🤖 = preceding assistant context where the user answered it.

---

**[agent-sooji session]**
> cowork 의 철학으로 bkit 의 툴을 쥐여주고 싶어 (필요할 때 원하면 bkit 의 툴을 가져다 씀)

→ Direction set: cowork Leader stays the driver; bkit's *definitions/tools* become an on-demand
catalog. Take the definitions, not the FSM/enforcement.

**[agent-sooji session]** — responding to assistant
- 🤖 *[options] plugin source repo / global rule first / spec-only*
> **[choice] → "bkit 도구를 참고하여 그대로 복사하거나 혹은 우리 상황에 맞춰 튜닝-내재화하고, 스킬에서 사용가능한 도구 리스트 정도로 제공해"**

→ Realization = internalize (adapt) bkit code, expose as a usable tool list in the skill.

**[agent-sooji session]**
> 너무 가볍게 컨셉만 가져온거 아니야? 비킷이 잘되는건 상세한 정의와 코드가 있기 때문인데

→ **The pivot that won.** A prose concept doc was rejected — bkit works because of detailed
data-defined SSoT + actual code (measure-router: routing, balanced-JSON parse, threshold, audit).
So we ported the real mechanism: `gate-lib.mjs` (adapted from bkit `measure-router.js`, Apache-2.0)
+ `gates.config.json` (SSoT) + `cli.mjs`. Tuned beyond bkit: deterministic gates (build/test,
migration grep) run directly in Node instead of always routing to an agent; threshold override
project > catalog > fallback; M1-M10/S1 remapped to cowork lenses (G-BUILD/…/G-DOCSYNC).

**[agent-sooji session]**
> 위 에이전트들은 개발할 때만 뜨는거지? … 위 에이전트들을 '샘플로서' 제공하고 이에 준하는 준비를 해서 진행하라고 하면 체계적으로 될거 같은데?
> dev 는 샘플인 셈!

→ Archetype systematization. The `profile: dev` legion is a **sample archetype set**, not a
dev-only bundle. For any domain the Leader produces the domain-equivalent of each applicable
archetype (coverage checklist) → `references/agent-archetypes.md`, wired into SKILL.md PHASE 0.
Matches the shipped principle "generic meta-roles ship fixed; domain roles are scaffolded."

**[agent-sooji session]**
> 방금 만든 ~/.claude/scripts/cowork-gates/ … ww-w-ai/ai-native-cowork 에 안 넣고? 나에게만 특화된 기능인가?

→ **Location correction.** The gates were first (wrongly) placed in personal `~/.claude/` config.
A general cowork product feature belongs in THIS plugin (versioned, distributed) — not personal
machine config. Relocated into `skills/cowork-sprint/scripts/gates/` + `references/`; personal copy
removed. (Assumption a successor must not violate: `~/.claude/` = personal-machine-local, the
plugin = the shared product.)

**[agent-sooji session]**
> 다른 세션에서 작업한건데 한번에 모두 커밋해. cowork-doc-sync, cowork-commit, market 플레이스와 맞춰서 버전 올려서 푸시

→ Release: doc-sync (added `docs/01-built/verification-gates-and-archetypes.design.md`), commit
everything together (incl. other-session dev-profile.md / gap-analysis.md edits), bump
1.15.0→1.16.0 (plugin manifest ×2 + marketplace.json, which was lagging at 1.14.0), then push.

---

## Recap

**What**: Added an on-demand measurable verification-gate tool (bkit `measure-router` internalized
under Apache-2.0 — routing + balanced-JSON parse + threshold + audit; deterministic gates run in
Node) and an agent-archetype reference that frames the dev legion as a reusable sample set for any
domain. Both wired into cowork-sprint (PHASE 0 archetype-coverage hook + Gates&safety gate pointer).
Released as v1.16.0.

**Friction**: The first attempt was a lightweight concept doc; the user correctly pushed back that
bkit's value is *code + detailed definitions*, forcing a real port. Location was also initially
wrong (personal `~/.claude/` vs the product plugin). The cowork-commit engine could not
auto-generate metrics/turns because the work happened in a different project's session
(cross-project) — this log was hand-authored from the verbatim directives.

**Assessment** — goal: give cowork on-demand access to bkit's measurable-gate rigor without its FSM
friction, and systematize domain agent scaffolding. Outcome: shipped as runnable code + references +
provenance, verified (CLI list/run/eval exercised). Helpfulness: high — user's two course
corrections (too-light, wrong-location) materially shaped the final result.
