---
name: cowork-insights
description: Invoke for "/cowork-insights" command or when the user asks to summarize, review, or report on past Claude Code sessions. Analyzes sessions to show key prompts (verbatim), structured assessments (goal/outcome/friction), tool usage patterns, and actionable insights. Produces HTML report + shareable Markdown for Jira/Notion/Slack. Three report formats — full (deep narrative), standard (core insights), minimal (quick team share). Supports --from/--to with absolute (2026-03-01) or relative (7d, 2w, 1m) dates. Trigger on phrases like weekly status update, sprint recap, what did I do with Claude, AI usage patterns, session history, minimal recap, what I worked on today, share with team, cowork-insights. DO NOT invoke for active tasks (debugging, refactoring, code review, project setup) or for commit-time recaps (use cowork-commit instead).
---

You are invoking the cowork-insights report generator. Your job is to:
1. Determine the right parameters from the user's request
2. Run the generator
3. Show the results

## Step 1: Determine Parameters

Parse the user's request to determine these flags:

| Flag | How to decide | Default |
|------|--------------|---------|
| `--from` | "this week" / "7d" / "last month" / "1m" / "2026-03-01" | omit (all time) |
| `--to` | usually omit | omit (now) |
| `--scope` | "this project" → `default`, "with subfolders" → `with-subfolder`, "everything" → `all` | `default` |
| `--path` | specific folder path if mentioned | omit (current dir) |
| `--exclude-path` | folders to exclude (repeatable) | omit |
| `--tz` | timezone if mentioned | `Asia/Seoul` |
| `--format` | "full recap" → `full`, "quick" → `standard`, "minimal" / "standup" → `minimal`. Auto: 20+ sessions → `full`, 1-19 → `standard` | auto |
| `--language` | match conversation language or explicit request | `ko` |
| `--output` | output path base | omit (auto) |

## Step 2: Run the Generator

Run a **single command**. This handles everything: data collection, parallel LLM generation, assembly, and rendering.

```bash
cd /Users/taehyoungkim/Documents/DEV/ww-w-ai/ai-native-cowork && bun run src/generate-narrative.ts \
  --from <FROM> --to <TO> \
  --scope <SCOPE> --path <PATH> \
  --exclude-path <EXCLUDE> \
  --tz <TZ> \
  --format <FORMAT> \
  --language <LANGUAGE> \
  --output <OUTPUT>
```

Omit flags that aren't needed. The generator outputs progress to stderr and the final result (JSON with file paths) to stdout.

**Do NOT run `scan`, `summarize`, or `render-report` separately.** The generator handles the full pipeline internally:
1. Runs `summarize` to collect data (~20KB compact + full scan data)
2. Spawns parallel `claude -p` calls for section generation (~30-40s)
3. Generates At a Glance referencing other sections (~15-20s)
4. Assembles NarrativeData JSON
5. Renders HTML + Markdown

Expected time: **50-130 seconds** depending on data volume and format.

## Step 3: Show Results

After the generator completes, show:
1. One-line summary stats (sessions, messages, hours, commits, lines)
2. Full At a Glance section (read from the generated narrative JSON)
3. 2-3 best key prompts with verbatim quotes
4. Links to both files (HTML + Markdown)

If 0 sessions returned, suggest different date ranges or scope.

## Step 4: Facets (only if uncached sessions exist)

If the generator output mentions uncached sessions, offer to generate facets:

```
There are N uncached sessions. Generate facets for deeper analysis? (This spawns parallel sub-agents to read transcripts)
```

If the user agrees, spawn parallel Agents to generate facets, then re-run the generator.

Facet sub-agent prompt for each uncached session:
```
Read the session transcript at [JSONL_PATH]. Analyze and produce a JSON facet assessment.
Write it to ~/.claude/recap-data/facets/[SESSION_ID].json

The JSON must have this structure:
{
  "sessionId": "[SESSION_ID]",
  "goal": "1 sentence",
  "outcome": "fully_achieved | mostly_achieved | partially_achieved | not_achieved",
  "helpfulness": "essential | very_helpful | moderately_helpful | slightly_helpful | unhelpful",
  "frictionTypes": [],
  "frictionDetail": "",
  "summary": "2-3 sentences",
  "goalCategories": {},
  "sessionType": "iterative_refinement | multi_task | exploration | quick_question | autonomous_pipeline",
  "satisfaction": "frustrated | dissatisfied | likely_satisfied | satisfied | happy",
  "successFactors": [],
  "keyPrompts": [{"verbatim": "exact text", "why": "1 sentence", "impact": "1 sentence"}],
  "repeatedInstructions": [],
  "memoriesCreated": [{"name": "memory name", "type": "feedback|project|user|reference", "summary": "1 sentence of what was learned/decided"}]
}

Write free-text fields in [LANGUAGE]. Enum fields stay in English.
Use ONLY the exact enum values listed above.
Read the FULL transcript. Base assessment on evidence, not guessing.
For memoriesCreated: look for Write tool calls to ~/.claude/projects/*/memory/*.md files in the transcript. Extract the name from frontmatter and summarize the content. Empty array if no memories were saved.
```
