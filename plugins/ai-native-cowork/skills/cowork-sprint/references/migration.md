# Migration sprints — moving to different tech / version / data shape

> Read this when a sprint **swaps the underlying technology, not the behavior**:
> library/framework swap (e.g. hand-rolled router → Hono), runtime/version bump, dependency
> replacement, DB schema/data migration, API version cutover, storage-format change, reimplementation.
>
> A migration = a refactor's behavior-preservation problem **PLUS** data movement, cutover, and
> irreversibility. So it inherits the whole **parity-harness method** and adds migration-only safety.

## Inherit the parity-harness core (don't duplicate)

Everything in `references/refactoring.md` applies — characterization / golden-master / **parity harness**,
the **no-false-green** rule (a test that doesn't exercise the swapped surface proves nothing), the
**characterize → change-incrementally → verify (Leader re-runs) → adversarial 2-lens review** sequence,
and scaffolding a `*-reviewer` agent. **Build the parity harness over the swapped surface BEFORE editing.**

Migration adds the concerns below.

## Migration-only safety

1. **Data safety first (if any data moves)** — follows the global DB-migration rule:
   - **Back up before any data operation**; tell the user where the backup is.
   - **Test the migration locally first** (Miniflare / local D1) — never first-touch production.
   - **Idempotent + reversible** migrations where possible (`INSERT OR IGNORE`, additive columns).
   - Investigate any row-count / data delta — never shrug off loss.
2. **Cutover strategy** — pick one and state it in the plan:
   - **Big-bang** — only for low-risk / non-LIVE.
   - **Incremental / strangler** — route slice-by-slice to the new path; keep old until parity proven.
   - **Dual-run / shadow** — run old + new in parallel, compare outputs (the strongest parity proof).
   - **Invalidate-and-reissue** — for credential/session shape changes: drop old, force re-acquire (e.g. session-token hash change → `DELETE FROM sessions`, users re-login). Cheap when re-acquire is cheap (magic-link).
3. **Rollback plan** — how to revert if the new path misbehaves in prod (previous deploy version; additive-only schema so old code still runs). Write it down before cutover.
4. **Irreversibility gate** — remote DB migration / deploy / data delete = IRREVERSIBLE auto-pause.
   Before crossing: adversarial 2-lens review (data-integrity/migration-correctness + integration/regression),
   then confirm. Never auto-cross in unattended mode.
5. **Dependency pinning** — pin the new library's exact version; smoke its runtime compatibility once
   (e.g. "does this lib actually run on Workers?") before building on it. Record the verified version.
6. **Compatibility window** — if old and new must coexist (clients, stored data, other services),
   define how long and what the bridge is; don't break in-flight state.

## Migration anti-mission (state in the plan)

- **No behavior changes.** Same inputs → same outputs. Found a bug? → **carry item**, separate sprint
  (fixing it inside the migration pollutes the parity signal).
- **No feature work, no opportunistic refactor** beyond the swap itself.
- **LIVE systems: no big-bang.** Increment + gate + keep rollback ready.

## Migration QA gate (extends sprint-method §5)

- Parity harness == baseline (behavior identical across the swap).
- Typecheck 0 + full suite green.
- If data moved: row-count / integrity check old-vs-new; backup confirmed.
- Cutover + rollback steps rehearsed (at least locally).
- For LIVE: the irreversible step (remote migrate / deploy) is its OWN gated step — code-ready ≠ executed.

## When it's lighter than it sounds

- Pure library swap with **no data movement** and a green parity harness → skip §1; focus on parity + dependency pinning + rollback (revert deploy).
- Additive-only schema change → reversible by definition; lighter rollback.
- Don't gold-plate: match the safety to the blast radius (LIVE prod data = max; local dev = minimal).
