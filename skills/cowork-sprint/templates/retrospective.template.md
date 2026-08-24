# Sprint Retrospective — {initiative} ({date})

> Status: FROZEN (retrospective snapshot). cowork-sprint PHASE 2 output — PROPOSALS ONLY, only apply-gate-selected items are applied.
> {N} sprints, {M} commits ({first}…{last}). Deploy: {deployed|local commits only}.

<!-- RULE: every section ends in an evolution proposal OR an explicit "no change needed — {why}".
     Do NOT re-summarize the work here (that is the consolidated report's job). -->

## 1. Agent evolution (A)

| Agent (owned scaffolds only) | Dispatches | QA pass | Fix rounds | Unblock evolutions | Verdict |
|---|---|---|---|---|---|
| {name or "(none scaffolded)"} | {n} | {n}/{n} | {n} | {n}/2 | keep / evolve / split / retire |

- If scaffolded agents = 0, you must answer the following:
  - Was reuse (general-purpose/plugin) sufficient? {yes — why / no — which role should have been scaffolded}
  - Candidate to scaffold next run: {role name + one-line charter, or "none"}
- DEFINITION-defect diffs (recurring only): {agent}.md — {exact change}, or "none"

## 2. Self-assessment → evolution backlog (B)

### What went well
| # | What went well | Evidence (signal/number) |
|---|---|---|
| 1 | {…} | {…} |

### What went poorly (mined from friction signals: user corrections/interrupts, questions right after the report, gates that fired late or not at all)
| # | What went poorly | Evidence | Tag | Target file (FIXABLE only) | Proposed change |
|---|---|---|---|---|---|
| 1 | {…} | {user quote / event} | [FIXABLE-PROMPT] | {SKILL.md §…/agent.md} | {one-line diff intent} |
| 2 | {…} | {…} | [FIXABLE-SCRIPT] | {script/schema path} | {…} |
| 3 | {…} | {…} | [PROCESS] | — | → Carry/open question |

## 3. Lessons → rule promotion (C)

| # | Non-obvious learning | Promote to rule/template? | Where |
|---|---|---|---|
| 1 | {…} | yes / no — {why} | {SKILL.md §… / templates/… / docs/00-reference/…} |

- Reusable-asset promotion candidates: {prompt/script/agent → destination, or "none"}

## 4. Carry (E) — execution leftovers only (do not mix in evolution items)

| Carry item | Why it wasn't finished now (explicit) | Next |
|---|---|---|
| {…} | {…} | {…} |

---

## APPLY-GATE — select by number below (e.g. "apply 1,3" / "all" / "hold")

<!-- RULE: Present this table to the user as-is. Each item maps 1:1 to a FIXABLE/promotion/scaffold proposal from the sections above. Only approved items are applied. -->

| # | Proposal | Source | Target file | Effort |
|---|---|---|---|---|
| 1 | {…} | B-1 | {…} | S/M/L |
| 2 | {…} | C-1 | {…} | S |

If there is no response or an interrupt occurs: record this table as Carry and end (no silent drop).
