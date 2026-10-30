# better-rea

English · [한국어](./README.ko.md)

**A Claude Code skill that makes your agent prove every claim it makes about a compiled app — with evidence, or marked unknown.**

REA (Reverse Engineer Anything) connects an AI agent to real analysis engines — Ghidra for native binaries, JavaScript analysis for Electron and web apps — so the agent can look inside an app you only have as a build. On its own, though, pointing an agent at REA and asking "how does this work?" gives you something that reads well and is mostly guessed: the agent surfaces a little evidence, then fills the rest in the same confident voice, and the result is not reliably better than what the plain model already invents. What changes the output is not the engine but how it is used. `better-rea` wraps REA in the three things that moved the result in testing — an evidence-and-limits loop, a fixed report template, and domain method notes — and ships `scripts/check-ledger.mjs`, a validator that fails any report citing a claim that is missing or refuted.

The three parts below are what the skill adds on top of REA. The validator is the part that makes the discipline a gate the deliverable has to pass, not a suggestion the agent can talk its way around.

| Part | What it does | Where |
|---|---|---|
| Loop | Every conclusion is a claim with concrete evidence (function names, `file:line`, decompiled lines, call paths) and a stated limit. The agent keeps digging until a claim is confirmed; what it cannot reach stays "unknown". | `references/loop.md` |
| Template | A fixed report shape — Observed behavior, Hypotheses considered, Evidence, Actual mechanism, Reproduce/verify — where every line of the mechanism traces back to a line of evidence. | `assets/report-format.md` |
| Domain notes | Method notes on where to look for a given kind of app, so the agent follows the paths that matter instead of the first ones it finds. | `references/methods.md` |
| Enforcement | The ledger validator exits non-zero if a report cites a claim that is not in the ledger or was refuted. | `scripts/check-ledger.mjs` |

By DubDubDub Corp. ([ww-w.ai](https://ww-w.ai)). MIT license.

## Why REA alone isn't enough

You have a built app and no source. You point an agent at REA and ask it to explain the architecture. You get a clean diagram, named modules, and a confident story about how the feature works.

Then you check. The module names are guesses. The data flow is what a typical app of that kind would do, not what this one does. Nothing in the answer points to a function, an address, or a line of decompiled code. The analysis engine was right there — the discipline wasn't. The agent reached for evidence, stopped early, and wrote the gap as if it were a fact.

In testing across several setups, bolting REA on by itself did not reliably beat the plain model. The lift came from three things, and only when they were applied together.

## What better-rea adds

**1. An evidence-and-limits loop.** Every conclusion is written as a claim in a ledger. A claim needs concrete evidence from the analysis — real function names, `file:line`, decompiled lines, call paths — or it is not written. Every claim states what it does not establish, and anything the analysis did not reach stays marked "unknown". The agent re-runs the analysis until the claims it needs are confirmed.

**2. A fixed report template.** The report is built from the ledger in one shape:

```text
Observed behavior         what the app does, seen from outside
Hypotheses considered     the candidate explanations, including the ones that failed
Evidence                  the ledger entries, with locations
Actual mechanism          the conclusion; every statement traces to a line in Evidence
Reproduce / verify        steps another person can run to check it
```

**3. Domain method notes.** For a given kind of app, the skill carries notes on where the mechanism usually lives, so the agent follows the paths that matter rather than the first thing it decompiles.

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

The agent runs REA, records claims with evidence and limits, runs the ledger validator, and returns a report in the fixed format. It works best when REA and its analysis engines (for example Ghidra for native binaries) are available to the agent. Without them there is little evidence to cite, and by the loop's rules those parts stay "unknown" rather than being filled with a guess.

## Intended use

Use this skill on apps you have the right to analyze: your own apps, or apps you are authorized to inspect.

## Layout

```text
SKILL.md                     the skill instructions the agent loads
references/loop.md           the evidence-and-limits loop
references/methods.md        domain method notes
assets/report-format.md      the fixed report format
assets/ledger-template.md    the claim ledger template
scripts/check-ledger.mjs     the ledger validator
```

## License

MIT. See `LICENSE`.
