# better-rea

English · [한국어](./README.ko.md)

**A Claude Code skill that gets professional reverse-engineering results out of REA — through an industry-grade report template and a library of real RE methodologies — without you being a reverse-engineer.**

REA (Reverse Engineer Anything) connects an AI agent to real analysis engines — Ghidra for native binaries, JavaScript analysis for Electron and web apps — and returns findings as evidence with stated limits, leaving what it cannot reach marked unknown. That part is REA's. The problem is what the agent does with it: on a single pass it takes the first answer, fills the rest with a plausible story, and the result is not reliably better than what the plain model already invents. What a real reverse-engineer adds is not another engine — it is persistence, a report discipline, and a repertoire of methods. `better-rea` gives the agent those three, and ships `scripts/check-ledger.mjs`, a validator that fails any report citing a claim that is missing or refuted.

The three parts below are what the skill adds on top of REA. Together they were what moved the output in testing; REA bolted on by itself did not reliably beat the plain model.

| Part | What it adds on top of REA | Where |
|---|---|---|
| Loop | REA already reports evidence, limits, and unknowns. The loop takes that and keeps going — the agent re-runs REA and digs further until the claims it needs are confirmed, instead of stopping at the first plausible pass. | `references/loop.md` |
| Template | A report template at the level professional reverse-engineering work uses — Observed behavior, Hypotheses, Evidence, Actual mechanism, Reproduce/verify. Giving the agent this shape is what raised the quality of the result. | `assets/report-format.md` |
| Methodology notes | A library of real reverse-engineering methodologies we researched and cite — how working RE engineers approach a target. Offered as possibilities for the agent to draw on, not one prescribed path, so it is not boxed into a single method. | `references/methods.md` |
| Enforcement | The ledger validator exits non-zero if a report cites a claim that is not in the ledger or was refuted. | `scripts/check-ledger.mjs` |

By DubDubDub Corp. ([ww-w.ai](https://ww-w.ai)). MIT license.

## Why REA alone isn't enough

You have a built app and no source. You point an agent at REA and ask it to explain the architecture. You get a clean diagram, named modules, and a confident story about how the feature works.

Then you check. The module names are guesses. The data flow is what a typical app of that kind would do, not what this one does. Nothing in the answer points to a function, an address, or a line of decompiled code. The evidence was available — REA surfaces it — but the agent stopped early and wrote the gap as if it were a fact, with no report discipline and no method behind where it looked.

In testing across several setups, bolting REA on by itself did not reliably beat the plain model. The lift came from the three parts below, and only when they were applied together.

## What better-rea adds

**1. A loop, not a single pass.** REA returns evidence, limits, and unknowns on its own. Left at one pass, the agent takes the first answer. The skill runs REA inside a loop: every conclusion goes into a ledger as a claim, and the agent keeps digging and re-running the analysis until the claims it needs are confirmed — or are honestly left unknown. The persistence is the point.

**2. An industry-grade report template.** The report is built from the ledger in the shape professional reverse-engineering work uses:

```text
Observed behavior         what the app does, seen from outside
Hypotheses considered     the candidate explanations, including the ones that failed
Evidence                  the ledger entries, with locations
Actual mechanism          the conclusion; every statement traces to a line in Evidence
Reproduce / verify        steps another person can run to check it
```

Giving the agent this template, rather than letting it free-form an answer, is what raised the quality of the result.

**3. Real RE methodologies, offered as possibilities.** The skill carries a library of methodologies we researched from how working reverse-engineers actually operate — where the mechanism tends to live, which paths to trace, what to confirm against what. They are given to the agent as options to draw on, not a single mandated procedure, so it reaches for the right method instead of the first one.

Before delivery, the validator checks the report against the ledger:

```bash
node scripts/check-ledger.mjs ledger.md --deliverables report.md
```

It fails the deliverable if a statement cites a claim that is not in the ledger or that was refuted during the analysis. A report that does not pass is not finished.

## Install

From the ww-w-ai marketplace, inside Claude Code:

```text
/plugin marketplace add ww-w-ai/marketplace
```

Then install the `better-rea` plugin through `/plugin`.

Or add this repository directly:

```text
/plugin marketplace add ww-w-ai/better-rea
```

Repository: <https://github.com/ww-w-ai/better-rea>

## Usage

After install, ask the agent in plain language. The skill triggers on requests like:

- "How does this app work?"
- "Draw its architecture."
- "Explain this feature well enough to rebuild it."

The agent runs REA, keeps a claim ledger, loops until its claims are confirmed, runs the validator, and returns a report in the template. It works best when REA and its analysis engines (for example Ghidra for native binaries) are available to the agent. Without them there is little evidence to cite, and by the loop's rules those parts stay "unknown" rather than being filled with a guess.

## Intended use

Use this skill on apps you have the right to analyze: your own apps, or apps you are authorized to inspect.

## Layout

```text
SKILL.md                     the skill instructions the agent loads
references/loop.md           the evidence-and-limits loop
references/methods.md        the RE methodology notes
assets/report-format.md      the report template
assets/ledger-template.md    the claim ledger template
scripts/check-ledger.mjs     the ledger validator
```

## License

MIT. See `LICENSE`.
