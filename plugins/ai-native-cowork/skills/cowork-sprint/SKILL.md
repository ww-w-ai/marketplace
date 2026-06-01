---
name: cowork-sprint
description: |
  Plan-then-execute sprint orchestrator. Works like a real delivery team: split work into sprints (~1 human-week each), plan them all up front WITH the user, then autonomously run each sprint through a full cycle (research→plan→design→do→QA→fix→deploy) to completion.
  Multiple sprints can run at once (concurrent dispatch). The leader (main session) dynamically scaffolds project-local agents for whatever domain — not dev-only (marketing, research, ops, data all fit).
  bkit-aware: borrows bkit agents/skills internally when present, runs fully standalone otherwise. Not for single-file edits, one-shot bug fixes, or work under ~a few hours.
triggers:
  - cowork-sprint
  - sprint plan
  - run sprints
  - plan and execute
argument-hint: "[goal / feature set / plan-file(s)]  [--auto-plan]"
disable-model-invocation: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash       # build, test, git, scaffold agent files
  - Agent      # dispatch project-local / bkit agents (delegate pattern)
  - Workflow   # deterministic fan-out (direct-execution pattern)
  - Skill      # /simplify, /cowork-doc-sync, bkit skills when present
  - WebSearch
  - WebFetch
effort: max
---

# cowork-sprint: Plan-Then-Execute Sprint Orchestrator

> Composite orchestrator skill — exempt from single-responsibility and minimum-tool rules.
> Runs in the **Main Session** as the embodied team **Leader**. One entry (`/cowork-sprint`) covers planning → execution; phases are internal stages, never user-issued sub-commands.

## Mental model — a real delivery team

```
Roadmap            (several Sprints — overall direction & velocity)
  └─ Sprint        (≈1 human-week of work; full cycle: research→plan→design→do→QA→fix→deploy)
       └─ Cycle    (the work inside a sprint, run by the Leader)
            └─ Execution pattern per chunk:
                 ├─ DELEGATE  → autonomous agents (swarm / parallel / council)   [Agent/Task]
                 └─ DIRECT    → Leader does it: inline  |  Workflow (det. script)
```

- **Not dev-only.** Marketing (research→strategy→copy→publish), planning (discovery→PRD→build), ops, data — same skeleton.
- **Leader = the Main Session, embodied.** See *Execution Model* below for the hard rule.

## Prerequisites & execution model (MUST)

- **Main Session only.** The skill IS the Leader. Claude Code blocks `sub-of-sub` agent spawning and disables thinking inside subagents — so the Leader must never be spawned as a subagent.
- ❌ **Anti-pattern:** `Agent(cto-lead)` (or any "delegate the leadership") — that pushes the Leader into a thinking-off subagent and makes its inner dispatches `sub-of-sub`. bypass-pdca does this; cowork-sprint deliberately does NOT.
- ✅ **Leader stays in main**, and from there spawns workers / runs workflows at **1 level**:

```
Main Session = cowork-sprint Leader
  ├─ Agent(worker-A)         -- DELEGATE, 1-level OK (run several in parallel)
  ├─ Agent(worker-B)         -- concurrent dispatch = parallelism (NOT nesting)
  └─ Workflow(...)           -- DIRECT execution, 1-level; its agents are flat workers
```

- ★ **Concurrency ≠ nesting.** Running many sprints "at once" = the Leader firing concurrent dispatches (parallel `Agent` calls ‖ a single fan-out `Workflow`). There is never a sub-leader. Workflow is a *direct-execution* method, not delegation — its spawned agents are flat workers, and that is correct, not a "lost team."
- **Workflow only from main** (1-level — no Workflow inside Workflow; subagents don't author Workflows).
- **Runs autonomously to completion** in PHASE 1 (no per-step confirmation) — except the planning approval gate and irreversible actions (see *Gates*).

## Input interpretation

`$ARGUMENTS`:

| Pattern | Behavior |
|---------|----------|
| Goal / feature-set prose (e.g. "ship auth + billing + onboarding") | Enter PHASE 0, co-plan the roadmap |
| Existing plan file(s) / glob (`docs/**/*.plan.md`) | Treat as pre-written sprint plans; confirm/refine, then execute |
| `--auto-plan` flag | Skip collaborative planning — Leader plans the roadmap alone, then executes |
| (resume) `.ww-w-ai/cowork-sprint/status.json` exists | Resume from the first unfinished sprint (see *Resume*) |
| No arguments & no status | Ask the user for the goal, then PHASE 0 |

## PHASE 0 — Sprint Planning  (default: collaborative)

> Goal: produce **all** sprint plans and the roadmap **before any execution**, approved by the user.
> This is the "freeze-before-code" principle: converge in dialogue → freeze plans → those frozen plans are the single input to execution.

```
1. Understand scope (dialogue with the user, one question at a time when ambiguous).
2. Size the work in HUMAN terms (~1 human-week = 1 sprint). Split anything bigger.
   - Build the sprint list + dependency graph (which sprints are independent vs ordered).
   - Decide execution mode per cluster: independent → eligible for concurrent dispatch;
     ordered/high-risk/LIVE → sequential.
3. Identify the ROLES this project needs (dev? QA? researcher? copywriter? analyst?).
   - Scaffold project-local agents for missing roles  →  see "Dynamic agents" below.
4. Write a plan per sprint (goal, deliverables, cycle outline, deps, role assignments)
   into docs/  (repo) — these are the durable single input to PHASE 1.
5. Initialize .ww-w-ai/cowork-sprint/status.json  (schema → references/sprint-method.md).
6. ★ APPROVAL GATE: present the roadmap (sprints, order, parallelism, agents) and get
   the user's go. Do NOT start execution before approval.
```

- `--auto-plan` → run steps 1-5 autonomously (sensible defaults, no dialogue), still write plans + show the roadmap, then proceed.
- Detailed sizing heuristic, planning-dialogue guidance, and the dependency rules live in **`references/sprint-method.md`**.

## Dynamic local agents (general team-building)

The Leader assembles a team fit for the project's domain — **reuse before rebuild**, scaffold only the gaps:

```
For each needed role:
  1. DISCOVER existing agents first (reuse > rebuild) — scan in order:
       a. project-local   .claude/agents/*.md
       b. user-global     ~/.claude/agents/*.md
       c. all installed plugins' agents (bkit AND any others — review, feature-dev, madori, …)
     → a suitable fit exists → REUSE it (do not re-scaffold).
  2. No suitable agent → scaffold one:
       read  templates/agent.template.md   (researched high-performance template)
       write .claude/agents/<role>.md       (project-local, version-controllable)
             — fill role, description(triggers), tools(least-privilege), model
In PHASE 1 dispatch them:  Agent(subagent_type="<role>")   or   Workflow agentType:"<role>"
```

- **How to write a strong agent** (frontmatter, description-triggers, system-prompt structure, length, tool scoping) → **`references/agent-authoring.md`** (synthesized from official docs + 36k/21k/12k★ collections). Read it before scaffolding.
- **Discovery is plugin-agnostic.** bkit, when present, is just one source in the pool above (its cto-lead team, gap-detector, qa agents) — reuse it like any other; bkit absent changes nothing about the discovery order. The Leader stays in main either way.
- **This plugin ships one fixed agent — `cowork-intent-auditor`** (domain-agnostic Tier-2 intent audit, used by the intent-audit gate), found by the same discovery. Principle: **generic meta-roles ship fixed; domain-specific execution roles are scaffolded.**

## PHASE 1 — Sprint Execution  (autonomous to completion)

```
Leader runs the approved roadmap. For each sprint (sequential clusters one by one;
independent clusters dispatched concurrently):

  CYCLE per sprint:
    research → plan-detail → design → do → QA → fix → intent-audit → deploy/deliver
    · research = gather the facts THIS sprint needs before planning detail (codebase reality,
      external specs, constraints); never start `do` on assumptions (Research-before-Do).
    · choose an execution pattern per work-chunk:
        DELEGATE  (Agent swarm/parallel/council)  — exploratory, judgment, heterogeneous, few
        DIRECT inline                              — small / quick
        DIRECT Workflow (deterministic script)     — structured, bulk, repetitive, wide parallel
    · concurrency = Leader's concurrent dispatch from main (parallel Agents ‖ one fan-out Workflow)
    · QA gate per sprint: the phase's **exit predicate** must hold before deploy/deliver, and the
      Leader VERIFIES it by running the check (real exit code) — never by trusting a transcript claim.
      Mechanical baseline = **detect the stack, run ITS tools** (format-check+lint+type/compile+test;
      tooling differs by language — JS/TS tsc+eslint, Python ruff+mypy+pytest, Go vet+test, …; run only
      what the project has). Engineering target = baseline green + matchRate **100%**, cap **5** fix-rounds.
      Plus a **ship-hygiene mechanical scan** (full set at sprint; cheap subset per-commit) — secrets/keys,
      conflict markers, abs-paths/host·port, manifest/config validity, packaging hygiene → §5.
      3-part predicate contract (end-state + executed check + reward-hack invariants) → references/sprint-method.md §5b.
    · intent-audit gate (Tier-2, before deploy): QA proves *output matches plan*; this proves *output
      serves the INTENT*. Run from a **reset perspective** — dispatch `cowork-intent-auditor` (a fresh
      agent that did NOT do the work) with intent + artifacts + QA result. PASS required → details §5.
    · update status.json as each sprint/cycle-phase completes (record on completion, not batched)

After each sprint cluster: **free-perspective augmentation pass** — step outside the plan and scan for
improvements, risks, and out-of-plan impact the plan didn't anticipate (the open lens a plan-bound check
misses); for code, invoke Skill(/simplify).
After all sprints: **consolidated report** — per sprint: what shipped, QA result, and **carry items**.
Default = **do NOT defer** — finish in-scope work this run. If something genuinely must carry to a future
sprint, it is **never silently dropped or silently expanded**, AND the report MUST state the **explicit
written reason** it was carried (why it could not finish now). Surface any sprint that paused unresolved.
```

- Pattern-selection heuristic is **encoded here + in `references/sprint-method.md`** (self-contained — do NOT defer to CLAUDE.md at runtime).
- **If a sprint preserves external behavior while changing how the code is built** → read the right ref first (both preserve behavior, so both mandate a characterization/**parity harness** over the changed surface BEFORE editing — else the QA gate is false-green — plus incremental change + adversarial 2-lens review). Distinguisher = *what* changes:
  - **`references/refactoring.md`** — the **internal code structure** changes; substrate stays (rename/extract/restructure).
  - **`references/migration.md`** — the **tech/data substrate** moves (library/framework/version/DB/data/API). Adds data-safety, cutover, rollback, irreversibility, dependency-pinning. *(sooji's Hono swap + session-hash live here.)*
- bkit present → a sprint's cycle MAY borrow bkit agents/skills internally (e.g. gap-detector for the QA gate, /simplify for cleanup) — **but never expose bkit's split `/pdca plan|design|do` command flow to the user.** The whole cycle stays one autonomous conversation.

## bkit-aware degradation

| | bkit present | standalone (no bkit) |
|---|---|---|
| Team | borrow bkit agents **(embodied in main, not `Agent(cto-lead)`)** | Leader + scaffolded local agents |
| Phase skills | reuse `gap-detector`, `/simplify`, qa skills *internally* | built-in cycle + `Bash` (stack's typecheck/test + git) |
| UX | **same single `/cowork-sprint` conversation** — no split commands | identical |

The user experience is identical with or without bkit. bkit only enriches the internal toolset.

## Gates & safety

- **Planning approval gate** (PHASE 0 step 6) — mandatory before execution unless `--auto-plan`.
- **Irreversible / outward actions** (deploy, remote migration, push, mass delete) — pause for confirmation even in autonomous mode; for high-stakes, run an adversarial review first with **risk-selected lenses** (not a fixed count — pick lenses orthogonal to the action's risk; min = correctness + ≥1 dominant-risk lens). **For installable/runnable artifacts (plugins, libs, CLIs, templates), the consumer-environment lens is MANDATORY** — one structured LLM pass (≥high-confidence only, with an exclusion list): portability · undeclared deps · undocumented env/config · public-interface breaks · docs↔behavior drift · install→first-run integrity · new-required-input. The cheap mechanical subset (abs-paths, conflict markers, manifest validity) also runs per-commit (cowork-commit). 7-ask checklist + v1.6.0 case → references/sprint-method.md §5.
- **QA gate** per sprint — must pass before deploy/deliver.
- **Git**: never commit/push without explicit user request (global rule). Stage by name, WHY-focused message, `Co-Authored-By: Claude`.

### Auto-pause triggers (the autonomous loop's stop contract)

PHASE 1 runs unattended, so "when do I stop and ask the human" must be explicit. After each sprint/cycle-phase, the Leader checks this fixed set and **pauses + reports** if any fires:

- **QUALITY_GATE_FAIL** — QA gate not green (tests failing, critical issue, data-flow broken).
- **ITERATE_EXHAUSTED** — fix-loop hit its cap (**5**) and the predicate still doesn't hold. Never emit a false "done" to escape the loop (truthful-completion); pause and report instead.
- **BUDGET / TIME_EXCEEDED** — cumulative cost or wall-clock passes the user's stated bound (if any).
- **IRREVERSIBLE_ACTION** — about to deploy/migrate/push/mass-delete (see above).

**On resume, re-evaluate the pause reason first** — if it still fires, stop again and report rather than looping back into the same wall. (No event system — this is Leader discipline + `status.json`.)

## Progress tracking & resume

- State file: `.ww-w-ai/cowork-sprint/status.json` (roadmap + sprints[]{cycle phase, pattern, matchRate, status} + executionMode). Schema + update timings → **`references/sprint-method.md`**.
- `mkdir -p .ww-w-ai/cowork-sprint/` if absent; ensure `.gitignore` has `.ww-w-ai/`.
- **Resume**: read status.json → first sprint not in `completed`/`archived`/`failed` → resume its last cycle phase; skip completed sprints.

## Constraints

- Needs a goal or plan input. For a single quick edit with no multi-step scope, just do the work directly — don't spin up a sprint.
- Leader never delegates leadership to a subagent (see *Execution Model*).
- Files referenced every run: `templates/agent.template.md`, `references/agent-authoring.md`, `references/sprint-method.md` — read them when the relevant step arrives (don't assume from memory).
