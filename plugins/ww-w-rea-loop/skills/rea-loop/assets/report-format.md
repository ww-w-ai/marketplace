# rea-loop deliverable format — fill at the depth shown; do not restate the questions

Every deliverable (a mechanism teardown, a feature's path, a format or key-value writeup) is laid out
in these five parts. Each part is written only from ledger claims, citing claim IDs (`C-0xx`). The
decisive part is **Evidence** — depth there is what makes the writeup trustworthy.

1. **Observed behavior** — what is visible from the outside without analysis: timing, memory, network,
   on-screen result, on-disk bytes. Black-box facts only. This is the baseline the mechanism must explain.
2. **Hypotheses considered** — the candidate mechanisms that could explain (1). List several, not one.
   Mark each against the evidence as `confirmed` / `narrowed` / `refuted`. Jumping straight to one is a gap.
3. **Evidence** — what analysis actually found: concrete function names, `file:line`, call paths, flags,
   decompiled lines, key values. **Every statement in (4) must trace to a line here. No evidence = not claimed.**
4. **Actual mechanism** — state it concretely, one or two lines per point ("streams records into a fixed
   native cell table, caps at the grid, trusts cached formula results on open"). Name the real strategy,
   not a vague label. Each point cites the Evidence (3) and the claim (`C-0xx`) it rests on.
5. **Reproduce / verify** — how someone could reproduce or confirm each point with ordinary inputs.

Rules (same as the ledger — `references/loop.md`, "Writing"):
- An inference is written as an inference ("likely", "inferred from C-014"). An `unknown` stays unknown;
  do not fill the gap with a plausible guess. A `refuted` claim is never cited.
- A sentence may not say more than the limits of the claims it cites.
- Fill each section to the depth shown. A section that only restates the question is not done.
