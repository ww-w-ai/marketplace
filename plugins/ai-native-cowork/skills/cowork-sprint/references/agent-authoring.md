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

## Length & focus

- Simple agents: stay near the official **~150-250 words** (role → when-invoked → checklist → output → principle). Works great.
- Deep experts: 500-1400 words is fine **if every line earns it**. Rule: *as long as needed to be unambiguous, no longer.*
- **One agent = one job.** A sprawling generalist is worse than two focused agents.
- Don't paste reference manuals into the body — use the `skills:` field for heavy domain knowledge.

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
