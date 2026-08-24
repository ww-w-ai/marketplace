# Commit Log — absorb bkit dev strengths into cowork-sprint (dev profile)

> Date(KST): 2026-06-29 06:27:51
> Note: the collaboration session was hosted in a different project's cwd (bkit was
> being analyzed there) while editing this repo, so the cowork-commit engine found
> 0 sessions for auto-metrics. This log is authored manually to preserve the
> decision trail; quantitative metrics are unavailable.

## Conversation Log (key decisions — distilled, intent-for-the-next-worker)

**1. bkit:sprint vs cowork-sprint — which to use?**
Decision: keep cowork-sprint; do NOT switch to bkit. bkit:sprint is dev-only +
needs LLM gate-measurement (headless CLI deadlocks at `plan` with gate_fail).
cowork's "Leader embodied in main" model avoids that. → absorb bkit's *value*, not adopt bkit.

**2. PRD + gap-analysis absorption (1st round → prd-to-gap-intent-chain.design.md)**
Why: cowork named `matchRate==100` as a QA target but had NO mechanism to measure it —
"tests green" was back-filling a false matchRate. Added: PRD-lite (intent anchor),
two-axis QA gate (Axis-1 mechanical "does it work" + Axis-2 gap-analysis "did we build
all we declared", classify done/partial/missing/divergent → matchRate), intent-audit
wired to PRD Success Metrics.

**3. Local customization standard (§6A) — mirror cowork-doc-sync**
User: "cowork-doc-sync처럼 로컬 환경 설정에 맞게 커스텀… 기본은 범용, 커스텀 표준에 맞춘
커스터마이제이션이 되어 있다면 해당 기준으로 동작." → §6A local-config contract: generic
default + per-repo override (docs/CONVENTION.md or `## cowork-sprint 범위`), read every run.
All tunables became knobs (#1–#10), not one-time decisions.

**4. Governing principle — "absorb the mechanism, not the mandate"**
User: "bkit 만든 Kay는 디테일하게 정의·제어를 좋아하고, 나는 일반화하고 열려있는 걸 좋아해.
장점은 가져오되 너무 틀에 박히기보다 유연하게." → every absorbed bkit mechanism lands as a
default-behind-a-knob, never a hardcoded mandate. Dropped bkit rigidity (fixed 9-phase,
M1-M10 SSoT as hard gates, .bkit infra, imposed Clean-Arch, vendor lock).

**5. Vendoring agents — copy, do NOT depend on bkit installed**
User: "복사를 해야 나뿐만 아니라 플러그인으로 배포를 하지." → the plugin ships to all users,
so dev agents are VENDORED (copied + bkit-infra stripped + Apache-2.0 attribution), not
discovered-from-bkit. 10 agents now run standalone with no bkit install.

**6. Full scope — ① experts ② methodology ③ architecture**
User caught that "dev 기능 다 가져왔다"는 과장 — only Tier-S skeleton existed. Expanded to:
① 10 vendored agents (gap-detector, code-analyzer, design-validator, security-architect,
qa-test-planner/generator, frontend/infra/enterprise-architect, bkend-expert[optional]);
② dev methodology §6 (Context Engineering, Docs=Code, Convention-first, 11-gate pack,
Trust autonomy); ③ architecture lenses §7 (Clean-Arch optional lint, API-First, 7-Layer).

**7. Dogfooding + fresh intent-audit caught self-deception (twice)**
Built using cowork-sprint itself. The fresh-perspective intent-audit (which the new
gap-analysis.md warns self-review is biased) caught doc-honesty overstatements both
rounds — auto-pause "arm fewer" vs SKILL "fixed set"; design-validator's ≥90 band
presented as hard law without the tunable caveat its siblings carried. Both fixed.

## Recap

- **Goal**: absorb bkit's dev strengths into cowork-sprint as a flexible, dev-only
  profile that ships standalone (no bkit dependency).
- **Outcome**: dev profile (§6A knob #9) with 10 vendored agents + methodology +
  architecture lenses; two-axis gap-analysis; PRD-lite chain. QA: Axis-1 mechanical
  clean (functional bkit-leak 0), Axis-2 matchRate 100%, Tier-2 intent-audit PASS
  after fixes. License: Apache-2.0 attribution (THIRD-PARTY-NOTICES + per-file headers).
- **Assessment**: the absorption preserves cowork's openness (mechanism-not-mandate
  verified across 11/12 agents), adds the dev rigor it lacked, and stays bkit-independent.
  Self-review bias was the recurring risk — fresh intent-audit was the effective control.
