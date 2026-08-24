# Agent Archetypes — the dev legion is a SAMPLE, not a dev-only bundle

> **Principle** (sharpens SKILL.md §"generic meta-roles ship fixed; domain-specific execution
> roles are scaffolded"): the `profile: dev` agents (gap-detector, code-analyzer, … — see
> `dev-profile.md`) are a **reference archetype set** — a proven shape of a complete delivery
> team. For **any** domain, the Leader produces the **domain-equivalent of each applicable
> archetype** before `do`, instead of open-endedly "identifying roles" (which under-scaffolds).
>
> Turns "what roles does this need?" (easy to miss one) → "cover this archetype set" (checklist).

## The archetype map (universal role → dev SAMPLE → domain equivalents)

| Archetype (universal role) | dev sample | Marketing | Research | Planning / Data / Ops |
|---|---|---|---|---|
| **Spec↔output completeness verifier** | gap-detector | brief ↔ campaign match | question ↔ coverage | PRD ↔ deliverable / spec ↔ dataset |
| **Quality / adversarial critic** | code-analyzer | copy critic | source credibility | data-quality / process auditor |
| **Design / plan completeness** | design-validator | strategy validator | methodology validator | plan / schema validator |
| **Adversarial risk lens** | security-architect | brand-safety / legal-claims risk | bias / reproducibility | PII / governance / safety |
| **Verification planner + executor** | qa-test-planner / -generator | pre-send proof + link/claim check | fact-check execution | pipeline / acceptance QA |
| **Failure diagnosis** | qa-debug-analyst | underperforming-campaign analysis | contradictory-source triage | anomaly / incident analysis |
| **Domain architect** | enterprise / frontend / infra-architect | GTM strategist | research designer | data / ops architect |
| **Intent-fit auditor** *(ships fixed)* | cowork-intent-auditor | — same, domain-agnostic — | | |

> Not every archetype applies to every sprint — pick the ones the work needs. But **decide
> explicitly** (cover or consciously skip), don't silently omit.

## PHASE 0 usage — archetype coverage check
When identifying the roles this sprint needs (SKILL.md PHASE 0):
1. Walk the archetype rows above; for each, ask "does this sprint need this role in THIS domain?"
2. For each needed archetype → run the **create-vs-reuse gate** (SKILL.md "Dynamic agents"):
   discover an existing fit first (reuse > rebuild); scaffold only the gaps via
   `templates/agent.template.md` + `agent-authoring.md`.
3. Record which archetypes were **covered** vs **consciously skipped** (and why) — this feeds the
   Retrospective "was reuse/coverage right?" scorecard.

The dev legion itself is just the **most-filled-in instance** of this map. Read a dev agent's
`.md` as a worked example of what a strong archetype agent looks like (role framing, confidence
filtering, structured output, DO-NOT list), then write the domain equivalent to the same bar.

## Guardrails (unchanged from SKILL.md)
- **Reuse before rebuild**; scaffold only real gaps (no sprawl).
- Generic meta-roles ship fixed (only `cowork-intent-auditor`); domain execution roles are scaffolded.
- Scaffold quality = `agent-authoring.md`; a scaffold is a first draft, evolve it from its output.
