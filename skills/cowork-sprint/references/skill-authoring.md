# Skill authoring — how to scaffold a project-local skill

Counterpart to `agent-authoring.md`. Source: CC official skills docs + Anthropic skill-creator + superpowers writing-skills (cross-verified).

## When skill vs agent vs inline

- one-shot execution role for this sprint → **agent** (`agent-authoring.md`).
- **reusable capability / heavy domain knowledge** referenced by agents (`skills:` field) or invoked directly → **skill** (this file).
- small role-specific knowledge → keep **inline in the agent body**. Do not over-create skills.

> An agent's `skills:` field only REFERENCES existing skills — it does not create them. If a scaffolded agent needs a domain skill that does not exist, scaffold the skill here first, then reference it.

## Location

- project-local `.claude/skills/<name>/SKILL.md` (+ optional `references/`, `scripts/`, `assets/`). version-controllable, team-shared.

## Frontmatter

- `name` (kebab-case, unique), `description`, optional `allowed-tools` (least privilege if tool scope matters).
- **description = the PRIMARY TRIGGERING MECHANISM, not a feature blurb.** Write it from "in what situations must this fire?" — what it does + when to use it, including **implicit phrasings where the user never names the skill**. All when-to-use lives here, not the body (summarizing the workflow makes the model follow the description and skip the body).
- **Combat undertriggering — be slightly "pushy."** Claude tends to NOT fire skills when it should (skill-creator). e.g. not `"Builds a dashboard."` but `"...Use whenever the user mentions dashboards, data viz, or internal metrics, even if they don't say 'dashboard.'"` Add DO-NOT only to block genuine near-miss mis-fires.
- **One field, ≤1024 chars.** Fold any when_to_use into `description` (no separate field — shared budget; invoke loads only the body). Concise, but **trigger completeness beats brevity** when they conflict (still a per-turn token cost; some CC versions render-truncate ~250 → front-load the core trigger). Optimize with a trigger eval (20 should/should-not queries, near-misses included).

## Body (SKILL.md)

- **< 500 lines** (CC official). Approaching the limit → split to `references/` with "read X when Y" pointers.
- structure: overview → when to use → core process (phase-gated if multi-step) → output-format → constraints/DO-NOT.
- progressive disclosure: SKILL.md = essentials / `references/` = detail (1-level deep, no nesting) / `assets/` = output templates / `scripts/` = deterministic code. Info lives in SKILL.md OR a ref, not both. Ref >100 lines → TOC.
- multi-domain skill → split references by variant (`aws.md`/`gcp.md`, `sales.md`/`finance.md`); SKILL.md routes, and only the relevant variant file is read. Keeps unrelated context out.
- imperative form. A loaded skill stays in context every turn → "does this paragraph justify its token cost?"
- **workflow / staged skills — explicit phase gate.** State that phase N-1 must be complete (an **observable** exit condition — check passes / artifact exists / sign-off) before phase N starts; an unmet condition pauses, never passes silently. A vague "do these steps in order" is not a gate.
- **checklists are mandatory TodoWrite items, not passive lists.** A multi-step skill must instruct the executor to turn each checklist/phase item into an actual `TodoWrite` item (in_progress on entry, completed only when its exit condition is verified) — "each checklist item → TodoWrite, no exceptions." A passive prose list gets skipped.
- **skills over ~200 lines — end with a Quick Reference table** summarizing phases/commands/outputs at a glance, so the operator doesn't re-read the whole body.

## Patterns to borrow

- DO-NOT / hard rules up top, bold, one line each.
- output-format as a code-block template ("ALWAYS use this template").
- discipline skills: rationalization table (`Excuse | Reality`) to close loopholes.
- discipline skills: a **Red Flags / STOP self-check** list — "if you catch yourself thinking X, STOP" (e.g. "if you're about to skip the test because it's slow → STOP"). Pairs with the rationalization table to interrupt the loophole in the moment.
- emoji: decorative banned; functional polarity markers as text (PASS / Anti-pattern / STOP). See global `ai-parseable-no-emoji`.

## Mechanical check before save

- SKILL.md < 500 lines; `references/` one level deep; `description` ≤1024 chars.
- Verify mechanically before save (script, not eyeball): `description` ≤1024 chars, SKILL.md <500 lines, `references/` one level deep — a one-line `wc -l` / `grep` / `jq` check guards what a human forgets. (Optional: if the official `skills-ref` CLI is installed, it also validates name/description/refs against the spec.)
- if `evals/` exist (trigger-accuracy), re-run after any description change — the description is the trigger surface.

## Evolve (bounded, same as agents)

A scaffolded skill is a first draft. Evolve from output only when the gap is a DEFINITION defect (vague trigger, missing constraint, loose output-format, over-broad scope). Compact, never accrete; split if over-broad. Cap rounds, then escalate — see `agent-authoring.md` § Self-evolution.
