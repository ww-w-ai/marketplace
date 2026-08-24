# Sprint Consolidated Report — {initiative} ({date})

> Status: FROZEN (work snapshot). {N} sprints / {M} commits ({first}…{last}) / Deploy: {summary}.

<!-- RULE: Write for the reader (user). If "so what about X?" comes up right after reading, §4 has failed.
     Prefer screen/product language over code identifiers. -->

## 1. Per-sprint results

| Sprint | What shipped (one line, product language) | QA | Commit |
|---|---|---|---|
| {SP-1} | {…} | PASS / PASS+fixed({n}) / deferred | `{hash}` |

Defects caught by adversarial review and fixed before commit: {n} — {one-line list, or "none" if none}

## 2. QA coverage table (consolidated from sprint reports)

<!-- RULE: One row per shipped feature/behavior. An unchecked row with no stated reason means the QA gate should have FAILed. -->

| Feature/behavior | Proof | Status | Notes |
|---|---|---|---|
| {…} | test runner `{name}` / manual probe / live check | checked | |
| {…} | deferred-to-deploy | deferred | {reason: needs real key/real environment, etc.} |

Summary: checked {n} / deferred {n} / total {n}

## 3. Pending gates — what's blocked and how to unblock it

| Gate | Description | What unblocks it |
|---|---|---|
| Deploy | {list of migrations/workers/queues/redeploys} | User deploy approval session |
| External dependency | {e.g. API key issuance} | {…} |
| Follow-up (reindex, etc.) | {…} | {…} |

## 4. Anticipated questions, answered up front

<!-- RULE: Come up with 3-5 questions a reader would ask right after reading this report, and answer them.
     Mining candidates: QA depth ("was this verified live?"), cost, why not deployed, next steps, risk. -->

- **Q. {…}?** — {answer}
- **Q. {…}?** — {answer}

## 5. Deferred decisions — things postponed during execution instead of stopping

<!-- RULE: Copy deferred decisions recorded in Plan/Check artifacts. These are decisions that were
     ambiguous or important but not irreversible, resolved with a reasonable default without stopping execution —
     for the user to review and possibly reverse.
     (Distinct from the irreversible-action gates above — those belong in §3 Pending gates.) -->

| Decision | Default chosen | Reason (why deferred) | Reversible |
|---|---|---|---|
| {…} | {…} | {…} | {yes/hard} |

(If none: "No deferred decisions.")

## 6. Carry items

| Item | Explicit reason | Next |
|---|---|---|
| {…} | {…} | {…} |

## 7. Suggested next actions

1. {…} (recommended — {one-line reason})
2. {…}
