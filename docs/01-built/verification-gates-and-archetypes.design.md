# Verification Gates + Agent Archetypes — design rationale

> Status: LIVING (as-built). Ships in cowork-sprint as two on-demand references + a runnable tool.
> Authority for behavior = `skills/cowork-sprint/references/{verification-gates,agent-archetypes}.md`
> + `skills/cowork-sprint/scripts/gates/`. This doc = the *why*.

## Problem

cowork's strength is a free, self-verifying Leader loop (adversarial review). Its gap vs bkit:
bkit's verification is **defined in detail + backed by code** (M1-M10/S1 rubrics as a single
source of truth, a `measure-router` that routes each gate to an agent, parses a structured numeric
return, compares a threshold, records an audit). cowork left that as prose the Leader re-improvised
each time. We already **absorbed bkit's dev agents** (see `dev-profile.md`, THIRD-PARTY-NOTICES)
but **not** the gate mechanism — the plugin was deliberately standalone (bkit `.bkit/` state,
M1-M10 SSoT, CI invariants removed). So measurable gates were the remaining gap bkit left.

## Decision 1 — internalize bkit's gate *mechanism* (not its FSM)

Take the **definitions + code**, drop the **enforcement**:
- **Kept** (adapted from bkit `measure-router.js`, Apache-2.0): gate-routing contract, balanced-JSON
  extraction, agent-output→numeric parse, threshold contract → `scripts/gates/gate-lib.mjs`.
- **Dropped**: the sprint FSM, phase-gate blocking, Stop-hook (the friction — gates become a
  *track* that fights the Leader).
- **Tuned to cowork**: (a) deterministic gates (build/test, migration grep) run directly in Node —
  real numbers, no agent (bkit routed everything to agents); (b) threshold resolution
  project-override > catalog > fallback; (c) M1-M10/S1 remapped to cowork lenses
  (G-BUILD/G-CONTRACT/G-MATCH/G-CRIT/G-MIGRATE/G-INTENT/G-DOCSYNC).
- **Principle**: a gate is a **tool the Leader picks** at QA / pre-irreversible moments to add
  number + threshold + audit onto prose findings — never a mandatory ordered track.

Provenance handled in `THIRD-PARTY-NOTICES.md` (derivative work, changes stated). Agent gates still
require the model to inject the agent result (Node can't spawn Claude agents) — same shape as bkit's
injected `agentTaskRunner`, not a shortcut.

## Decision 2 — the dev legion is a SAMPLE archetype set

SKILL.md already said "generic meta-roles ship fixed; domain-specific execution roles are
scaffolded" (only `cowork-intent-auditor` ships fixed). But non-dev sprints got open-ended "identify
the roles" → under-scaffold risk. Sharpened: the `profile: dev` agents are a **reference archetype
set** (verifier / critic / design-validator / risk-lens / QA / diagnosis / architect / intent-auditor).
For any domain the Leader produces the **domain-equivalent of each applicable archetype** (a coverage
checklist), reading a dev agent's `.md` as a worked example of a strong archetype agent.
→ `references/agent-archetypes.md`; wired into SKILL.md PHASE 0 (archetype-coverage check) with the
existing create-vs-reuse gate unchanged.

## Surfaces

- `references/verification-gates.md` — catalog + 4-element contract + CLI usage.
- `references/agent-archetypes.md` — archetype map + PHASE 0 coverage check.
- `scripts/gates/{gates.config.json,gate-lib.mjs,cli.mjs}` — SSoT + lib + CLI.
- SKILL.md — PHASE 0 archetype hook + Gates&safety measurable-gates pointer.
- Per-repo override: `<repo>/.cowork-gates.json` (shallow per-gate merge).
