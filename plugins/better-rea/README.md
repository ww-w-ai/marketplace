# better-rea

English · [한국어](./README.ko.md)

**An agent skill that draws REA out to its limit — so an agent's look inside a compiled app comes back a checked finding, not a confident guess.**

REA (Reverse Engineer Anything) connects an AI agent to real analysis engines — Ghidra for native binaries, JavaScript analysis for Electron and web apps. Its tools produce the evidence: decompiled functions, call graphs, strings, runtime traces. What they do not do is make the agent finish the job. On a single pass the agent surfaces some of that evidence, fills the rest with a plausible story in the same confident voice, and the result is not reliably better than what the plain model already invents. `better-rea` wraps REA in the three things that change the result — a loop that holds every conclusion to evidence, a required report format, and a methods reference — and ships `scripts/check-ledger.mjs`, a validator that fails any report citing a claim that is missing or refuted.

The three parts below are what the skill adds on top of REA; the evidence itself comes from REA's tools. Together they were what moved the output in testing — REA bolted on by itself did not reliably beat the plain model.

| Part | What it adds on top of REA | Where |
|---|---|---|
| Loop | REA's tools return the evidence. Marking each conclusion as observation, inference, or unknown and keeping its limit is the discipline REA's own guide asks for; this skill makes it mechanical — a claim ledger the validator checks — and re-runs REA, digging further, until the claims it needs are confirmed. | `references/loop.md` |
| Report format | A required report structure — Observed behavior, Hypotheses considered, Evidence, Actual mechanism, Reproduce/verify — where every line of the mechanism traces back to a line of evidence. Holding the agent to this format is what raised the quality of the result. | `assets/report-format.md` |
| Methods reference | Per-question method notes — which REA tools to reach for and the structural patterns worth checking — distilled from a survey of open reverse-engineering literature and practice. Offered as possibilities to confirm or rule out, not one prescribed path. | `references/methods.md` |
| Enforcement | The ledger validator exits non-zero if a report cites a claim that is not in the ledger or was refuted. | `scripts/check-ledger.mjs` |

By DubDubDub Corp. ([ww-w.ai](https://ww-w.ai)). MIT license.

## Why REA alone isn't enough

You have a built app and no source. You point an agent at REA and ask it to explain the architecture. You get a clean diagram, named modules, and a confident story about how the feature works.

Then you check. The module names are guesses. The data flow is what a typical app of that kind would do, not what this one does. Nothing in the answer points to a function, an address, or a line of decompiled code. REA's tools had surfaced the evidence — but the agent stopped early and wrote the gap as if it were a fact, with no report discipline and no method behind where it looked.

In testing across several setups, bolting REA on by itself did not reliably beat the plain model. The lift came from the three parts below, and only when they were applied together.

## What better-rea adds

**1. A loop, not a single pass.** REA's tools give the evidence; sorting it into observations, inferences, and unknowns — and keeping each claim's limit — is the discipline REA's own guide calls for. Left at one pass, the agent takes the first answer anyway. The skill makes the discipline mechanical: every conclusion goes into a ledger as a claim with its evidence and its limit, a validator checks it, and the agent keeps digging and re-running the analysis until the claims it needs are confirmed — or honestly left unknown. The persistence is the point.

**2. A required report format.** The report is built from the ledger in one structure:

```text
Observed behavior         what the app does, seen from outside
Hypotheses considered     the candidate explanations, including the ones that failed
Evidence                  the ledger entries, with locations
Actual mechanism          the conclusion; every statement traces to a line in Evidence
Reproduce / verify        steps another person can run to check it
```

Holding the agent to this format, rather than letting it free-form an answer, is what raised the quality of the result.

**3. A methods reference, offered as possibilities.** For each kind of question — the app's parts, what loads what, one feature end to end, who calls whom, data across boundaries, threads and timing, values and limits — the skill carries notes on which REA tools to reach for and which structural patterns to check for. The notes are distilled from a survey of open reverse-engineering literature and working practice, and they are given to the agent as possibilities to confirm or rule out, not a single mandated procedure, so it reaches for the right method instead of the first one.

Before delivery, the validator checks the report against the ledger:

```bash
node scripts/check-ledger.mjs ledger.md --deliverables report.md
```

It fails the deliverable if a statement cites a claim that is not in the ledger or that was refuted during the analysis. A report that does not pass is not finished.

## Install

The skill is plain instructions any REA-capable agent can follow; it is packaged for **Claude Code** and **Codex**, from the same `ww-w-ai` marketplace.

**Claude Code**

```text
/plugin marketplace add ww-w-ai/marketplace
```

Then install `better-rea` through `/plugin`. (Or add the repo directly: `/plugin marketplace add ww-w-ai/better-rea`.)

**Codex**

```text
codex plugin marketplace add ww-w-ai/marketplace
codex plugin add better-rea@ww-w-ai
```

(Or add the repo directly: `codex plugin marketplace add ww-w-ai/better-rea` then `codex plugin add better-rea@better-rea`.)

Repository: <https://github.com/ww-w-ai/better-rea>

## Usage

After install, ask the agent in plain language. The skill triggers on requests like:

- "How does this app work?"
- "Draw its architecture."
- "Explain this feature well enough to rebuild it."

The agent runs REA, keeps a claim ledger, loops until its claims are confirmed, runs the validator, and returns a report in the required format. It works best when REA and its analysis engines (for example Ghidra for native binaries) are available to the agent. Without them there is little evidence to cite, and by the loop's rules those parts stay "unknown" rather than being filled with a guess.

## Intended use

Use this skill on apps you have the right to analyze: your own apps, or apps you are authorized to inspect.

## Layout

```text
SKILL.md                     the skill instructions the agent loads
references/loop.md           the evidence-and-limits loop
references/methods.md        the methods reference
assets/report-format.md      the required report format
assets/ledger-template.md    the claim ledger template
scripts/check-ledger.mjs     the ledger validator
```

## License

MIT. See `LICENSE`.
