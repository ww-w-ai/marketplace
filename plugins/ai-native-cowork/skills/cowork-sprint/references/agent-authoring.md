# Agent authoring — how to scaffold a high-performance project-local agent

> Read this before writing a `.claude/agents/<role>.md` from `templates/agent.template.md`.
> Synthesized from the official Claude Code subagent docs + the top high-star community
> collections (verified star counts, 2026-06). Domain-agnostic: the same skeleton works
> for dev, marketing, research, ops, data, design.

## Sources (authority order)

1. **Official** — Create custom subagents: https://code.claude.com/docs/en/sub-agents (authoritative; verify here first).
2. **wshobson/agents** — ~36k★ — https://github.com/wshobson/agents (minimal frontmatter, long capability bodies, "Use PROACTIVELY" triggers).
3. **VoltAgent/awesome-claude-code-subagents** — ~21k★ — https://github.com/VoltAgent/awesome-claude-code-subagents (heavily sectioned bodies, explicit workflows).
4. **contains-studio/agents** — ~12k★ — https://github.com/contains-studio/agents (rich `<example>` trigger blocks; proves non-dev domains use the same shape).

When official docs and a collection disagree, **official wins** (the docs reflect the current runtime; collections may lag or target multiple harnesses).

## Where agents live

- **Project**: `.claude/agents/<name>.md` — version-controllable, team-shared. **Default for cowork-sprint scaffolds.**
- **User**: `~/.claude/agents/<name>.md` — all projects.
- Scanned recursively; **identity comes from the `name` field, not the path**.
- The subagent gets ONLY its own system prompt + basic env (cwd) — not the full session prompt. So make the body self-contained.

## Frontmatter fields

| Field | Req | Notes |
|---|---|---|
| `name` | ✅ | kebab-case, unique. Filename need not match. This is the invocation id. |
| `description` | ✅ | **Drives auto-delegation.** See rules below. |
| `tools` | – | Allowlist. **Omit ⇒ inherits ALL tools.** Scope to least privilege. |
| `disallowedTools` | – | Denylist; applied before/over the allowlist. |
| `model` | – | `haiku`\|`sonnet`\|`opus`\|full id\|`inherit`. Defaults to `inherit`. |
| `color` | – | red\|blue\|green\|yellow\|purple\|orange\|pink\|cyan (task-list display). |
| `memory` | – | `user`\|`project`\|`local` — cross-session learning. |
| `skills` | – | Preload skills (prefer this over pasting big domain text into the body). |
| others | – | `permissionMode`, `maxTurns`, `mcpServers`, `hooks`, `background`, `effort`, `isolation`, `initialPrompt`. (Plugin subagents ignore `hooks`/`mcpServers`/`permissionMode` for security.) |

## The `description` field (highest leverage)

This is the single field Claude reads to decide whether to delegate. Get it right:

- **Lead with the specialty**, then **concrete when-to-use triggers**.
  - ✅ `"Expert code review specialist. Use immediately after writing or modifying code."`
  - ❌ `"Reviews code."` (no trigger → won't fire reliably)
- **Proactive firing**: add `"Use PROACTIVELY for ..."` / `"Use immediately after ..."` ONLY when you want it to auto-fire without being asked. Omit for explicit-only agents.
- **Sharpen with `<example>` blocks** (contains-studio pattern) for ambiguous triggers:
  ```
  <example>Context: user just finished a feature.
  user: "done with the upload flow"
  assistant: "Let me run the code-reviewer agent over the new code."
  <commentary>Post-implementation review is exactly this agent's trigger.</commentary></example>
  ```

## System-prompt body (convergent high-quality shape)

The official examples and the top collections converge on:

1. **Role / identity** — one strong sentence: *"You are a senior X specializing in Y."*
2. **When invoked** — a numbered first-steps procedure so the agent orients itself and starts immediately.
3. **Core responsibilities** — focused list (cap ~5-8; quality over exhaustiveness).
4. **Approach & standards** — methodology + quality bar (checklists welcome).
5. **Process** — ordered phases for multi-step work (analyze → execute → verify). Drop for single-shot agents.
6. **Output format** — explicit: *the parent only sees the returned summary*, so specify exactly what to return (priority buckets, required fields, file paths).
7. **Constraints / anti-patterns** — what NOT to do; reinforce least privilege.

## Tool scoping by role (least privilege)

- read-only / review / analysis → `Read, Grep, Glob`
- research → `+ WebFetch, WebSearch`
- editor / builder / fixer → `Read, Write, Edit, Bash, Glob, Grep`
- Omit `tools` entirely **only** when the agent genuinely needs everything (rare — do it intentionally).

## Length & focus  (HARD CAP — mechanically enforced)

- Simple agents: stay near the official **~150-250 words** (role → when-invoked → checklist → output → principle). Works great.
- Deep experts: 500-1400 words is fine **if every line earns it**. Rule: *as long as needed to be unambiguous, no longer.*
- **HARD CAP: the system-prompt body (everything after the closing frontmatter `---`) must be ≤ 1500 words.** Check it mechanically before saving and after every evolution:
  ```bash
  # body = lines after the 2nd '---'; fail if > 1500 words
  awk 'f{print} /^---$/{c++} c==2{f=1}' .claude/agents/<role>.md | wc -w
  ```
- **The cap forces compaction, not accretion.** If a change would push the body over 1500 words, you may NOT just append — first **re-organize and compress** existing lines (dedup, merge overlapping bullets, cut filler) to make room. A longer agent is not a better agent.
- **One agent = one job.** A sprawling generalist is worse than two focused agents. If you can't stay under the cap without dropping real responsibilities, that is a signal to **split the role into two focused agents**, not to raise the ceiling.
- Don't paste reference manuals into the body — use the `skills:` field for heavy domain knowledge.

## Self-evolution — evaluate the output, then refine the agent (bounded)

A scaffolded agent is a **first draft**, not a final artifact. After it runs, judge its output and, when the shortfall is in the *definition* (not the task), rewrite the agent so the whole roster sharpens over the sprint. This compounds: the improved `.md` is version-controlled and reused next sprint.

**Scope — what may be evolved:** ONLY project-local `.claude/agents/*.md` that **cowork-sprint owns** (scaffolded this run, or a prior cowork-sprint scaffold). **Never rewrite** plugin-provided, user-global, or fixed shipped agents (`cowork-intent-auditor`, `cowork-facet-extractor`) — those are borrowed read-only.

```
Per owned agent, max 2 evolution rounds per sprint (EVOLVE_CAP). Then escalate, don't keep churning.

1. EVALUATE — reuse signals you ALREADY have: the chunk's exit-predicate (real exit code), the QA
   gate result, the intent-audit verdict, /simplify findings. Do NOT add a heavy new eval pass — piggyback.
2. DIAGNOSE  (metacognition gate — the crux) — is the gap a DEFINITION defect or a one-off?
     DEFINITION defect  → would RECUR on similar tasks: vague role, missing constraint, wrong/loose
                          output-format, over-broad scope, missing first-step. → evolve the agent.
     ONE-OFF            → task-specific difficulty, flaky input, an honest hard case. → just fix the
                          WORK; leave the agent definition alone.
   Churning the agent on one-off noise is reward-hacking the loop — resist it. When the call is
   genuinely unclear, trust the RESET-perspective signal (the intent-audit was done by a fresh agent)
   over your own "it's basically fine."
3. REFINE — rewrite the .md targeting the SPECIFIC defect, nothing else:
     missing constraint → add to Constraints ·  weak/ambiguous output → sharpen Output format
     mis-fires / won't trigger → fix the description triggers ·  wrong tools → adjust the allowlist
   Stay ≤ the 1500-word HARD CAP → compact existing lines to make room (never append past it).
   If the role keeps failing across rounds, it is MIS-SCOPED → SPLIT into two focused agents
   (and re-assign the chunks), do not inflate one agent.
4. RE-DISPATCH the same chunk (or the next same-role chunk) with the evolved agent.
5. RECORD in status.json → agentEvolutions[]{ name, round, reason, wordCount } (audit trail + proof
   the cap held). The evolved .md persists = compounding roster quality across sprints.
6. After EVOLVE_CAP rounds still failing the predicate → AUTO-PAUSE (AGENT_EVOLUTION_EXHAUSTED) and
   report: the role is likely wrong-scoped or the task needs human input. Never emit a false "done".
```

- This is a generator→evaluator→refine loop on the **agent definition itself** — the same Evaluator-Optimizer shape used for code, applied one level up.
- It runs inside PHASE 1's cycle, off the QA/intent-audit signals — see SKILL.md *Dynamic local agents* and the *AGENT_EVOLUTION_EXHAUSTED* auto-pause trigger.

## Model selection (cost-aware)

- `haiku` — cheap/fast lookups, classification, mechanical extraction.
- `sonnet` — default implementation / structured work.
- `opus` / `inherit` — hard reasoning, architecture, judgment.

## Quick checklist before saving a scaffolded agent

- [ ] `name` kebab-case + unique
- [ ] `description` leads with specialty + concrete triggers (+ proactive cue iff wanted)
- [ ] `tools` least-privilege (or intentionally omitted)
- [ ] `model` chosen by task weight
- [ ] body has role → when-invoked → responsibilities → output-format → constraints
- [ ] output-format makes the returned summary self-contained for the Leader
- [ ] one job, unambiguous, no filler
- [ ] **body ≤ 1500 words** (`awk`/`wc -w` check above) — compact, don't append, to fit
- [ ] (after a run) evaluated output → evolved the agent iff the gap was a DEFINITION defect (not a one-off)
