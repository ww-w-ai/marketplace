---
name: rea-loop
description: Use whenever someone wants to understand, document or rebuild an app they only have as a built program — "how does this app work", "draw its architecture", "explain this feature well enough to rebuild it" — with REA. Runs REA deep, inside an evidence-and-limits loop, so every conclusion is checked before it is written.
---

# rea-loop — REA inside an evidence-and-limits loop

**Every conclusion is a claim with evidence and a limit. Check the limit before you write the conclusion. Unknown stays unknown.**

REA connects an agent to native analysis engines (Ghidra, IDA, Hopper). Connected and then trusted as-is, its output reads like an answer whether or not it was checked. This skill adds the loop REA's own guide asks for: separate observations, inferences and unknowns, keep the limits, and use each limit to decide the next check.

## Scope

- In scope: software you are allowed to analyze — your own apps, apps you have rights to study, open-source builds. Goals: architecture, component roles, one feature's path at rebuild level, formats and key values.
- The goal is understanding and rebuilding. If the request turns to anything else, stop and ask the user.

## Rules that hold in every step

- Go deep. This kind of analysis pays off in proportion to the effort put in: use the whole time budget, use REA's tools broadly, run the app as often as a question needs, and check each important claim from more than one angle. When you think you are done, look at what is still `unknown` or `narrowed` and dig into it again.
- Run the app with ordinary inputs (normal documents, normal settings). Never create damaged, malformed or deliberately oversized files. Find limits and sizes both in the code and by running ordinary documents.
- Use parallel workers for independent questions when that helps, as REA's guide suggests. Wait for every result before you finish.
- A deliverable never says more than its claims allow (`references/loop.md`, "Writing").

## Steps

Make each step a todo item. Mark it done only when its gate holds. If a gate cannot be met, stop and report why.

### 1. Preflight

if REA's tools are not available in this session (no `reverse-engineer-anything` skill and no REA MCP tools)
  tell the user to install it — `npx rea-agents setup` (https://github.com/morluto/rea) — and stop.
Load REA's `reverse-engineer-anything` skill now and work by it. This skill does not replace REA's guide; it adds the ledger loop on top of it.
Confirm with the user: the app's path, what they want to know, and the time budget. Plan to use all of it.

Gate: `reverse-engineer-anything` skill loaded; REA tools listed; target path exists; goal and budget stated.

### 2. Open the ledger

Copy `assets/ledger-template.md` to `ledger.md` in the working folder. Split the goal into the deliverables the user asked for, and each deliverable into claims: every component, every arrow, every step, every key value is its own claim.

Gate: `ledger.md` exists with at least one claim per deliverable.

### 3. Let the first analysis finish

First open the app as a whole — for a macOS app, the `.app` folder — and use REA's whole-app tools (`inspect_artifact`, `project_apple_application_graph`, `trace_dylib_resolution`, `inspect_plist`) to list its parts and what loads what. Then open the main executable with REA and wait for the engine's first auto-analysis to return. On a large binary this can take 30 minutes or more and is not always cached. Do not start writing claims from guesses while it runs. The work budget starts when it returns.

Gate: the analysis call returned (not a timeout); its evidence ID is recorded in the ledger.

### 4. Loop

Before the first round, read `references/methods.md`: for each kind of question it lists which REA tools to start with and how to follow their results. Then follow `references/loop.md`. After every round, run:

```
node scripts/check-ledger.mjs ledger.md
```

Fix what it reports before the next round. Repeat until no claim has a limit you can still check, or the budget runs out. Then set every claim still `open` to `unknown` and run it with `--closed`.

Gate: `node scripts/check-ledger.mjs ledger.md --closed` exits 0.

### 5. Write the deliverables

Lay every deliverable out with `assets/report-format.md` (observed behavior → hypotheses considered → evidence → actual mechanism → reproduce/verify), and fill each section to the depth shown — a section that only restates the question is not done. Write each deliverable only from the ledger, citing claim IDs (`C-012`). Then run:

```
node scripts/check-ledger.mjs ledger.md --deliverables <file> [<file> ...]
```

It fails if a deliverable cites a claim that does not exist or was refuted.

Gate: the command exits 0, and every deliverable follows `assets/report-format.md` (all five parts present, each filled past a restatement). Report to the user what was confirmed, what stayed an inference, and what stayed unknown.

## When you are tempted to skip the loop

| Thought | Reality |
|---|---|
| "The decompiler output is clear, no need to check" | Clear output is still static. Record what it does not show (runtime path, caller, values) as the limit, then check it. |
| "This claim is obviously right" | High-confidence claims get at least one check that could prove them too broad. |
| "I'll mark it unknown later" | Mark it unknown now. Unknown is a valid final status; a confident guess is not. |
| "Faster to make a weird input and see what breaks" | Find the limit in the code and with ordinary documents. Crafted inputs are out of scope. |
| "That's enough detail" | If budget remains, it isn't. Pick the claim with the widest limit and check it again. |

## Files

| File | Read when |
|---|---|
| `references/methods.md` | Start of step 4 — how to answer each kind of question with REA |
| `references/loop.md` | Step 4 and 5 — the loop and the writing rule |
| `assets/ledger-template.md` | Step 2 — the ledger format the checker reads |
| `scripts/check-ledger.mjs` | Steps 4 and 5 — run it, do not reimplement it |
