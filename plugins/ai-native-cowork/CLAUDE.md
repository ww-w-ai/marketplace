# ai-native-cowork

Claude Code plugin that records AI collaboration history per commit.

## Project Overview

- **Type**: Claude Code and Codex plugin (skills + TypeScript engine)
- **Version**: 1.18.7
- **Runtime**: Bun (TypeScript, no package.json — uses manifest.json)
- **Skills**: `/cowork-commit` (per-commit AI recap), `/cowork-insights` (session reports), `/cowork-sprint` (plan→execute sprint orchestrator; QA-table gate + self-evolution retrospective), `/pdca-wf` (single-feature PDCA, verify-to-100; execution phases fan out through native `Workflow` once the user says `ultracode`, otherwise flat `Agent` calls — on Codex the word is `goal` and it unlocks a persistent Goal instead), `/cowork-doc-sync` + `/cowork-doc-init` (docs/ organization)
- **Agents**: `cowork-intent-auditor` (fixed, fresh-perspective Tier-2 intent audit)
- **Hooks**: SessionStart agent-first guidance (`hooks/`)

## Architecture

```
manifest.json              # Plugin metadata (name, version, skills, agents, hooks, scripts)
.claude-plugin/plugin.json # CC plugin registry entry
skills/
  cowork-commit/SKILL.md   # Per-commit AI recap + directive log
  cowork-insights/SKILL.md # Session insight reports
  cowork-sprint/           # Plan→execute sprint orchestrator (SKILL.md + references/ + templates/{agent,sprint-report,retrospective})
  pdca-wf/                 # Single-feature PDCA; Workflow engine once `ultracode` is said, flat Agent calls before that (SKILL.md + references/ + docs/01-built)
  cowork-doc-sync/         # docs/ alignment (SKILL.md + references/ + scripts/)
  cowork-doc-init/SKILL.md # One-time docs/ taxonomy bootstrap
agents/
  cowork-intent-auditor.md  # Fixed Tier-2 intent auditor (fresh-perspective, read-only)
  cowork-facet-extractor.md # Fixed per-session facet extractor (cowork-insights)
  # dev-profile vendored expert legion (Apache-2.0 from bkit — see THIRD-PARTY-NOTICES.md):
  gap-detector · code-analyzer · design-validator · security-architect ·
  qa-test-planner · qa-test-generator · qa-debug-analyst · frontend-architect · infra-architect ·
  enterprise-expert · bkend-expert(optional, bkend.ai-only)
hooks/
  hooks.json               # SessionStart wiring
  session-start.sh         # Agent-first guidance injected as additionalContext
src/
  cli.ts                   # Entry point — engine subcommands: cowork-commit, commit-log, summarize, scan, render-report
  recap-engine.ts          # Session scanner + metrics aggregator
  session-scanner.ts       # ~/.claude/projects/ JSONL discovery + getClaudeHome
  commit-log.ts            # Conversation turn extraction from JSONL
  metrics-extractor.ts     # Tool counts, tokens, response times from JSONL
  git-analyzer.ts          # Per-commit git insertion/deletion stats
  facet-cache.ts           # Per-session metrics cache
  generate-narrative.ts    # cowork-insights pipeline driver (summarize → LLM → render)
  html-report.ts           # HTML + Markdown report renderer
docs/commit-log/           # Directive-log files (conversation + recap per commit)
docs/01-built~99-misc/     # cowork-doc-sync taxonomy (legacy plans/specs → 04-legacy)
evals/                     # Skill trigger accuracy tests
```

## Key Patterns

- Engine runs via `bun run src/cli.ts <subcommand> --path <target-repo>`
- Engine targets the user's repo, not this plugin dir — always pass `--path "$PWD"`
- Session discovery: scans `~/.claude/projects/<hash>/` for JSONL transcripts
- Project hash = `path.replace(/[^a-zA-Z0-9]/g, '-')` — directory renames break hash linkage
- Facet cache: `~/.claude/recap-data/facet-cache/` — per-session metrics JSON, keyed by sessionId

## Running Tests

```bash
bun test src/commit-log.test.ts
```

## Commit Language

All commit messages, directive-log recaps, and documentation in **English**.

```
/cowork-commit --language en
```
