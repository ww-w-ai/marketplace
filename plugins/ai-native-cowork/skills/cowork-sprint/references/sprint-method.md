# Sprint method — sizing, planning dialogue, cycle gates, status schema

> Detail for `cowork-sprint`. The SKILL.md is the thin orchestrator; this file holds the
> heuristics and the state schema. Self-contained — do not defer to global CLAUDE.md at runtime.

## 1. Sprint sizing (human-week unit)

A sprint = roughly **one human-week of work for a normal (non-AI) team** — the *unit of planning*, not of wall-clock. AI executes far faster, but sizing in human terms keeps scope legible and the roadmap honest.

Heuristic:
- Estimate the whole goal in human-effort terms.
- **> ~1 human-week → split** into multiple sprints, each a coherent ~1-week slice that ends in something shippable/deliverable.
- Each sprint must have a **clear deliverable + a QA/acceptance bar** (a sprint that can't be "done" is mis-scoped).
- Prefer vertical slices (end-to-end value) over horizontal layers when possible.

## 2. Dependency analysis & execution mode

For the sprint list, classify relationships (same rules apply across sprints and across phases inside a sprint):

- **Explicit dependency** — "after X", "requires X".
- **Implicit dependency** — references/modifies another sprint's artifacts.
- **Independent** — no relation → **eligible for concurrent dispatch**.
- **Circular** — resolve at planning time (split / merge / re-sequence).

Then set execution mode per cluster:
- **Independent + structured/bulk** → concurrent dispatch (parallel `Agent` calls ‖ one fan-out `Workflow`).
- **Ordered, high-risk, LIVE-production, or exploratory** → sequential.

★ Concurrency is achieved by the **Leader dispatching from main**, never by nesting sub-leaders.

## 3. Planning dialogue (PHASE 0, collaborative default)

Co-plan with the user; ask **one question at a time** when something is ambiguous. Cover:
- Purpose & success criteria (what "done" means for the whole roadmap).
- Scope boundaries (explicit non-goals — YAGNI).
- Constraints (stack, deadlines, LIVE systems, irreversible steps).
- Domain → which **roles/agents** are needed (see `references/agent-authoring.md`).

Each sprint plan also states an **anti-mission / out-of-scope** line — what this sprint will deliberately NOT do — so scope stays honest at the ~1-week boundary (don't silently expand).

Output of PHASE 0: a roadmap (sprint list + order + parallelism + assigned agents) and **one plan file per sprint** written into the repo `docs/` (durable single input to execution). Then the **approval gate**.

`--auto-plan`: skip the dialogue, choose sensible defaults, still write the plans and present the roadmap before executing.

## 4. Execution patterns (PHASE 1) — pick per work-chunk

| Pattern | Use when |
|---|---|
| **DELEGATE** — `Agent` swarm / parallel / council | exploratory, judgment-heavy, heterogeneous, few items |
| **DIRECT inline** — Leader does it step-by-step | small, quick, or needs the Leader's full context |
| **DIRECT Workflow** — Leader authors a deterministic JS script | structured, bulk, repetitive, wide parallel fan-out, needs reproducibility/barriers/loops |

- Workflow is a **direct-execution** method (not delegation); its spawned agents are flat workers — correct, not a downgrade.
- Hybrid: while delegating autonomously, if a "structured bulk parallel" chunk appears, the **Leader** designs a Workflow for just that chunk (no sub-leader improvises one).
- **An objective gate upgrades DIRECT → DELEGATE.** When a trustworthy objective gate (test / parity harness) exists, otherwise-DIRECT judgment-heavy work becomes safely delegatable — the gate externalizes the judgment, so a judgment-light worker can "iterate until green." **Build the gate first, then delegate against it.** sooji's S1 (1337-line LIVE Hono port) was DIRECT-inline territory until a 17/17 parity harness objectified correctness — then it delegated safely. ⚠️ Only as safe as the gate is *complete*: a happy-path-only gate (see `references/refactoring.md` → rare-branch false-green) + aggressive delegation = regressions slip through. Make the gate exercise rare branches before delegating against it.

## 5. Sprint cycle & gates

Each sprint runs a full cycle. The phase names are internal stages (never user sub-commands):

```
research → plan-detail → design → do → QA → fix → intent-audit → deploy/deliver
```

Gates fire at **different phases** (catch drift early, not just at the end):
- **Research sign-off** (before `plan-detail`): the facts THIS sprint depends on are gathered — codebase reality, external specs, constraints, prior art. Never enter `do` on assumptions (CLAUDE.md "Research-before-Do" — Research-less Do is an anti-pattern).
- **Design sign-off** (before `do`): the design/approach is coherent and matches the sprint plan. Don't build on an incoherent design.
- **QA gate** (before deploy/deliver): the phase's **exit predicate** (§5b) holds, verified by running the check. Engineering default = `tsc`/typecheck 0 + the project's test suite green + `matchRate == 100%`. If no suitable test exists for the change, say so explicitly and add a minimal one — do not let "green" be a false signal (a test that doesn't exercise the change proves nothing). For data-flowing apps, also sanity-check the path end-to-end (input→store→output), not just unit-green.
- **Intent-audit gate** (Tier-2 metacognition, before deploy/deliver): the QA gate above is Tier-1 (*does the output match the plan?* — literal compliance). This gate asks the harder question — *does the result serve the **intent** behind the plan/prompt, or did it satisfy the letter and miss the point?* ★ It must be run from a **reset perspective**: dispatch the `cowork-intent-auditor` agent (or a discovered equivalent reviewer) — a fresh context that did NOT do the work, fed the intent + artifacts + QA result. The executor cannot audit its own intent-fit (its context is full of its own rationalizations). **PASS required before deploy**; on REVISE, fix and re-audit. Catches intent-drift, invented-vs-intended behavior, self-deception, and false-completion that Tier-1 is blind to.
- **Irreversible/outward gate**: deploy, remote migration, push, mass delete → confirm even in autonomous mode; for high-stakes run an adversarial 2-lens review (correctness/data-integrity + integration/regression) first.

## 5b. Exit predicate — the DONE-WHEN contract for each phase

Borrowed from Claude Code `/goal` (a verified built-in, v2.1.139) and hardened past it. Every phase declares a machine-checkable **exit predicate** with three parts:

1. **One measurable end state** — e.g. `bun test exits 0`, build succeeds, queue empty, file count == N.
2. **The check, actually executed** — ★ the **Leader runs the check command and gates on the real exit code.** It does NOT judge completion by reading a claim in the transcript. (This is where cowork-sprint is strictly safer than `/goal`, whose evaluator only reads the conversation and can be fooled by "Claude said tests pass.") Reserve a model judgment only for genuinely subjective bars that have no exit code.
3. **Invariants that must not change** (reward-hack guard) — e.g. `no file outside src/auth/ modified`, `test count did not drop`, `coverage did not regress`. A verifiable-but-misspecified predicate ("tests pass," satisfied by deleting the tests) yields a provably-correct *useless* result; the invariant clause blocks it.

**Truthful completion (ralph rule):** declare a phase done ONLY when its predicate is genuinely, verifiably true. Never emit a false "done" to escape the loop — being stuck is a *pause*, not a finish.

**Iterate loop — convergence & stop:**
- Target = the predicate holds. **Engineering code sprints: `matchRate == 100%`** + tsc 0 + suite green — this is the bypass-pdca family standard; do **NOT** apply bkit's default 90% here. Non-code sprints: the sprint's own declared verifiable predicate.
- **Cap = 5** fix-and-recheck rounds. On each fail, **inject the failure reason** (which check failed, what the output was) into the next round's context — fix with the evidence, never re-run blind.
- If the cap is hit and the predicate still doesn't hold → do **NOT** claim "done." Pause (ITERATE_EXHAUSTED), record what's still off, and **carry** the remainder **only with an explicit written reason captured for the final report** — never a silent or unexplained deferral (CLAUDE.md "don't defer; if you must, state why").

After each sprint cluster: **free-perspective augmentation pass** — step outside the plan and look for improvements, risks, and out-of-plan impact the plan didn't anticipate (the open lens a plan-bound check misses). For code, invoke `Skill(/simplify)`.

## 6. status.json schema

Path: `.ww-w-ai/cowork-sprint/status.json`

```json
{
  "goal": "string — the overall roadmap objective",
  "executionMode": "sequential | mixed | concurrent",
  "sprints": [
    {
      "id": "sprint-1",
      "name": "string",
      "planFile": "docs/.../sprint-1.plan.md",
      "deps": ["sprint-0"],
      "agents": ["role-a", "role-b"],
      "cyclePhase": "research | plan-detail | design | do | qa | fix | intent-audit | deploy | done",
      "status": "pending | in-progress | blocked | completed | failed | archived",
      "pattern": "delegate | inline | workflow | mixed",
      "matchRate": null,
      "retries": 0,
      "startedAt": "ISO8601",
      "completedAt": null
    }
  ],
  "executionOrder": ["sprint-1", "sprint-2"],
  "startedAt": "ISO8601"
}
```

### Update timings (record on completion, not batched)

| When | Update |
|---|---|
| PHASE 0 done | create file, sprints[] with `pending`, `executionOrder`, `executionMode` |
| Sprint starts | that sprint `in-progress`, `startedAt`, `cyclePhase` advances live |
| Cycle phase completes | bump `cyclePhase`; record `pattern`, `matchRate` when QA runs |
| Sprint deploy/deliver done | `status=completed`, `completedAt` |
| Archived (optional) | `status=archived` |
| Failure | `status` set, `retries++`, surface cause |

## 7. Resume

Read status.json → first sprint whose `status` ∉ {completed, archived, failed} → resume from its `cyclePhase` → skip completed sprints. Respect `executionOrder` / `deps` (don't start a sprint whose deps aren't done).
