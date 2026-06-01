# Refactoring sprints — restructure internals, preserve external behavior

> Refactoring (Fowler): **change internal code structure while external behavior stays identical**
> (extract/rename, dedup, untangle, module restructure). The behavior contract is the invariant;
> the *structure* is what moves. Danger = invisible regression: "it compiles / old tests pass" ≠ "behavior unchanged."
>
> **What distinguishes refactoring from migration is WHAT changes — not whether behavior is preserved**
> (both preserve behavior, which is why both need the parity harness below):
> - **Refactoring** → the *internal code structure* changes; the tech/data substrate stays put.
> - **Migration** → the *substrate itself* moves (library/framework/version swap, DB/data/API move) →
>   read **`references/migration.md`** (reuses the parity-harness core here + adds data-safety / cutover /
>   rollback / irreversibility). sooji's Hono swap + session-hash are **migrations**, not refactors.
>
> This file is the canonical home of the **parity-harness method** — migration.md references it.

## Core principle — characterize before you change

Established practice (not invented here): capture current behavior as an executable baseline, change the code, then prove the baseline still holds.

- **Characterization test** (Michael Feathers, *Working Effectively with Legacy Code*) — a test that pins down what the code *currently does*, so a change that alters behavior fails loudly.
- **Golden master / approval testing** — record current outputs as "golden"; diff future runs against them. (Jest *snapshot tests* are the same idea.)
- **Parity testing / parallel run** — for swaps/migrations: assert the new path produces the **same** observable result as the old. Industry-standard for large reimplementations.

We call the concrete artifact a **parity harness**: a test that exercises the real surface being refactored, records the pre-change result as golden, and re-runs post-change to assert equivalence.

## The trap this prevents — false-green

A passing test suite proves nothing if **no test exercises the thing you changed**. Example: migrating an HTTP router while the only tests cover the storage layer → suite stays green through the migration → "green" is a false signal of safety. The QA gate (`references/sprint-method.md §5`) forbids this: *a test that doesn't exercise the change proves nothing.*

**Second false-green — happy-path-only harness.** Even a harness over the right surface lies if it seeds only the **common path** and never the **conditional/rare branches** (renewal, error, expiry, retry). An unexercised branch is exactly where a regression hides. sooji's S1 parity harness was green yet missed a *Set-Cookie ×2 on session renewal* BLOCKER — renewal fires ~once/day and was never seeded, so the adversarial code review caught it, not the harness. **The harness must seed and exercise rare/conditional branches, not just the happy path.**

→ **If the refactor's surface has no test, building the parity harness IS the first cycle task** — before touching the code. Not optional.

## Safe-refactor sequence (the cycle for a refactor sprint)

```
1. CHARACTERIZE  — build/extend a parity harness over the surface being changed.
                   Run it against CURRENT code → record GREEN baseline (golden).
                   (If a real baseline can't be captured for some path, say so — don't fake it.)
2. CHANGE        — refactor in the smallest safe increments (not a big-bang on LIVE).
                   Move behavior verbatim where possible; swap only the shell/mechanism.
                   Re-run the harness after each increment.
3. VERIFY        — QA gate: parity harness green (== baseline) + typecheck 0 + full suite green.
                   Leader RE-RUNS independently (don't trust a worker's "green" report).
4. ADVERSARIAL REVIEW (before any irreversible step / deploy) — 2 independent lenses:
                   (a) behavior/parity + data-integrity   (b) integration/regression + edge cases.
                   Scaffold a `*-refactor-reviewer` agent for this (see below).
5. Carry anything still off-baseline; never claim "done" while parity is red (ITERATE_EXHAUSTED).
```

## Roles to scaffold (dynamic agents)

When a refactor sprint needs review muscle, scaffold project-local agents from `templates/agent.template.md` (guidance in `references/agent-authoring.md`):

- **`<project>-refactor-reviewer`** — read-only (`Read, Grep, Glob, Bash`). Lens: "did observable behavior change? list any route/output/contract that differs from baseline." Reusable across the refactor's sprints.
- Optionally a second reviewer with an **integration/concurrency** lens for high-stakes/LIVE changes (adversarial 2-lens per the global `parallel-verify-review` rule).

## Refactor-specific anti-mission (state it in the plan)

- "Behavior changes" are OUT of scope of a refactor sprint — if you find a bug, note it as a **carry item**, don't fix it inside the refactor (it pollutes the parity signal). Separate sprint.
- No new features. No dependency additions beyond the swap target.
- For LIVE systems: no big-bang; increment + gate.

## When NOT to build a heavy harness

- The change is tiny and a cheap existing test already exercises it → just run that.
- Pure internal rename with compiler-enforced safety (types catch all call sites) → typecheck may be sufficient; note the reasoning.
- Don't gold-plate: the harness should be the **minimum that makes the gate real**, not exhaustive coverage.
