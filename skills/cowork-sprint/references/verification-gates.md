# Verification Gates — on-demand measurable checkpoints

> **Philosophy**: the Leader (main) keeps the drive, judgment, and ordering. This is a
> **catalog of measurable (number + threshold + audit) checkpoints the Leader reaches for
> when it wants them** — NOT an enforced FSM or phase gate. Layer numbers + an audit trail
> on top of cowork's prose adversarial review when the stakes warrant it.
>
> **Provenance**: the gate mechanism (routing contract + balanced-JSON parse + threshold) is
> adapted from bkit (`popup-studio-ai/bkit-claude-code`, Apache-2.0) `measure-router.js`.
> See the repo `THIRD-PARTY-NOTICES.md`. bkit's FSM / phase enforcement / Stop-hook are NOT
> included — only the definitions + code, tuned to cowork lenses.

## When to open this
- At cowork-sprint's natural gates (QA phase, before an irreversible/deploy action) when the
  Leader wants **a scored pass/fail + an audit line**, not just prose findings.
- Not every task. Low-risk work runs on the normal loop (adversarial review) — skip these.

## The 4-element gate contract (per invocation)
1. **backing** — an agent OR a deterministic command (who measures).
2. **structured numeric return** — agent gates must return `{ value, details, evidence[] }`
   (structured output), never prose (code consumes it).
3. **threshold** — resolution order: **repo override (`<repo>/.cowork-gates.json`) > catalog
   default (`scripts/gates/gates.config.json`) > hardcoded fallback**.
4. **audit** — a one-line PASS/FAIL + value + threshold into the report / commit trailer /
   sprint state (a trace for re-deploy / re-work decisions).

## Catalog (bkit M-gates tuned to cowork lenses)

| Gate | Measures | Threshold | Backing | bkit origin | When |
|---|---|---|---|---|---|
| **G-BUILD** | typecheck 0 + full test suite green | pass=100% | deterministic cmd | M8 | every slice / before deploy |
| **G-CONTRACT** | advertised-contract-surface drift (schema↔validate↔output↔guide↔consumers) | drift=0 | `gap-detector` | M4 | any contract change |
| **G-MATCH** | design/spec ↔ shipped matchRate | ≥ 90 | `gap-detector` | M5 | spec-driven build verify |
| **G-CRIT** | adversarial multi-lens Critical count | 0 | `code-analyzer` | M6 | before irreversible/prod action |
| **G-MIGRATE** | destructive-statement scan on migration diff | 0 | deterministic grep | (cowork rule) | DB migration / db push |
| **G-INTENT** | intent-fit (served the intent, not just literal) | PASS | `cowork-intent-auditor` | (M9 adjacent) | after QA, before deliver |
| **G-DOCSYNC** | docs=code drift (incl. status-claim labels) | 0 | `/cowork-doc-sync` | M10 | after deploy (closing) |

## Run it (the actual tool — `scripts/gates/`)
```bash
G="$CLAUDE_PLUGIN_ROOT/skills/cowork-sprint/scripts/gates/cli.mjs"   # or the skill-relative path
node "$G" list                                       # catalog table
# deterministic gate: exec + evaluate (exit 0 = pass, 1 = fail)
node "$G" run G-BUILD  --cwd <repo>                   # runs tsc + test; both exit 0 → value=100
node "$G" run G-MIGRATE --cwd <repo>                  # staged-diff destructive-keyword count
# agent gate: emit the structured prompt → Leader dispatches the Agent → eval its output
node "$G" prompt G-CONTRACT --target "..." --repo <r> # prints the JSON-schema prompt to dispatch
node "$G" eval   G-CONTRACT --output-file <agent.json>  # balanced-JSON parse → threshold → audit
node "$G" eval   G-CRIT --value 0                    # feed a value directly
```
Programmatic: import `gate-lib.mjs` (`runDeterministicGate`, `buildGatePrompt`,
`parseAgentOutput`, `evaluateGate`, `formatAudit`).

Per-repo override: drop a `.cowork-gates.json` in the repo (shallow per-gate merge) to set the
real commands/thresholds — e.g. G-BUILD = web tsc + build + the repo's actual runner count.

## Anti-patterns
- Treating this as a **mandatory ordered track** → that recreates bkit's FSM friction. Gates are
  tools the Leader picks, not a track.
- Firing every gate on every task → overkill. Only at the "When" triggers.
- Letting an agent gate return prose → code can't consume it. Structured output required.
