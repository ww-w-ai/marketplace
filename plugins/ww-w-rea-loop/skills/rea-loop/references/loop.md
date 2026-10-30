# The evidence-and-limits loop

## Record

For every claim in `ledger.md`:

- **kind** — `observation` (you saw it in tool output), `inference` (you reasoned from observations), or `unknown`
- **evidence** — the REA evidence ID, tool call, or command and its output the claim rests on. An `observation` must have evidence.
- **limit** — what this evidence does not cover, or what result would show the claim is wrong or too broad
- **check** — what you ran to test the limit, and what came back
- **status** — `open`, `confirmed`, `refuted`, `narrowed`, or `unknown`

## Loop

1. Pick every `open` claim whose limit can be checked with the tools you have.
2. Run that check. Prefer a check that could prove the claim wrong over one that can only agree with it.
3. Record the result on the claim and set its status:
   - `confirmed` — the check covered the limit and agreed
   - `refuted` — the check contradicted it; write the corrected claim as a new claim
   - `narrowed` — true only in part; rewrite the claim to the part that held and record the rest as its limit
   - `unknown` — no available check can settle it
4. High-confidence claims are not exempt: each gets at least one check that could show it is too broad.
5. New facts found during a check become new claims with their own evidence and limit.
6. Repeat until no `open` claim has a checkable limit, or the budget is spent. Claims still `open` at the end become `unknown`.

## Static and runtime

Check most limits statically first, with REA: who calls this function, what it calls, where a value or string is referenced. Many questions about how components connect are answered by following callers and cross-references.

Static analysis still shows what the code can do, not what ran. For claims that static tracing cannot settle (which path a real document takes, a timing, which thread), run the app with ordinary documents and measure.

## Writing

- Lay the deliverable out with `assets/report-format.md` (observed → hypotheses → evidence → mechanism → reproduce/verify).
- Write deliverables only from claims. Cite claim IDs.
- An `inference` is written as an inference ("likely", "inferred from C-014").
- An `unknown` is written as unknown. Do not fill the gap with a plausible guess.
- A `refuted` claim is never cited.
- A sentence may not say more than the limits of the claims it cites.
