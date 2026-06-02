---
name: cowork-insights
allowed-tools:
  - Bash
  - Read
  - Glob
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
| `--path` | specific folder if mentioned, else the user's repo | **always pass `"$PWD"`** — never omit (the engine's own cwd is the plugin dir, so omitting scans the wrong project) |
| `--exclude-path` | folders to exclude (repeatable) | omit |
| `--tz` | timezone if mentioned | `Asia/Seoul` |
| `--format` | "full recap" → `full`, "quick" → `standard`, "minimal" / "standup" → `minimal`. Auto: 20+ sessions → `full`, 1-19 → `standard` | auto |
| `--language` | **auto-detect from the user's conversation language** (the language THEY are writing to you in), unless they explicitly request another. Pass the BCP-47-ish short code: `ko`, `en`, `ja`, `zh-Hans`, etc. | auto-detect (fallback `en`) |
| `--output` | output path base | omit (auto) |

**Language detection (do this, don't default blindly):** look at the language the user is actually
writing in *this* conversation and pass it as `--language`. Korean prompts → `ko`, English → `en`,
Japanese → `ja`. Only override when the user explicitly asks for a specific output language
("리포트는 영어로" → `en`). Use the SAME language for the facet step (Step 1.5) and the report so the
two layers match.

## Step 1.5: Generate the qualitative layer (facets) — BEFORE rendering

The report has two layers: **quantitative** (commits, tokens, tools — always present) and
**qualitative** (outcomes, friction patterns, verbatim key prompts, memories). The qualitative layer
comes from per-session **facets**. `generate-narrative.ts` only *loads* cached facets — it never
creates them. **If no facets exist, the report silently degrades to bare metrics** (this is the
single biggest quality failure of this skill). So generate them first, automatically — do not ask.

1. **List the sessions that still need a facet** (deterministic — never compute the project hash
   yourself):

   ```bash
   bun run "${CLAUDE_PLUGIN_ROOT}/src/cli.ts" list-uncached \
     --from <FROM> --to <TO> --scope <SCOPE> --path "$PWD" --tz <TZ>
   ```

   Output: `{ facetsDir, analyzed, cached, subagentsSkipped, uncachedCount, uncached: [{sessionId, path}] }`.
   (Subagent sessions are pre-skipped; `list-uncached` already matches the report's analyzed set, so
   you never over-generate.)

2. **If `uncachedCount === 0`** → skip to Step 2 (facets already cached; re-runs are free).

3. **If `uncachedCount > 0`** → dispatch the **`cowork-facet-extractor`** agent **once per uncached
   session, all in parallel** (bundle the Agent calls in a SINGLE message so they run concurrently —
   not one at a time). Do NOT inline a giant facet prompt; the agent already owns the schema, enum
   constraints, and CC-derived analysis guidelines. Pass only the three variables:

   ```
   Agent(subagent_type="cowork-facet-extractor"), one per session, with prompt:

     SESSION_ID: <uncached[i].sessionId>
     JSONL_PATH: <uncached[i].path>
     LANGUAGE:   <the --language you resolved in Step 1>
     facetsDir:  <facetsDir from list-uncached>

     Extract this session's facet and write it to <facetsDir>/<SESSION_ID>.json per your spec.
   ```

   Each agent reads its own transcript (off your context — it never bloats the main session) and
   writes one JSON file. They reply only `DONE <id> …`.

4. **Wait for all to finish**, then proceed to Step 2. The generator will now load them and render
   the full qualitative layer (target: `analyzed === cached`, all 7 sections succeed).

> Scale note: for very large ranges (`--scope all`, months) `uncachedCount` can be dozens+. That is
> expected and fine — they run in parallel and the cache is permanent (facets survive even after the
> original session files are deleted). Don't cap or sample silently; if you must bound it, say so.

## Step 2: Run the Generator

Run a **single command**. This handles everything: data collection, parallel LLM generation, assembly, and rendering.

```bash
bun run "${CLAUDE_PLUGIN_ROOT}/src/generate-narrative.ts" \
  --from <FROM> --to <TO> \
  --scope <SCOPE> --path "$PWD" \
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

## Notes

- **Facets are now generated up front (Step 1.5), not as an afterthought.** The qualitative layer is
  part of the deliverable, not optional — never render a facet-empty report and call it done. If
  `generate-narrative` logs `Facets: 0` while `analyzed > 0`, Step 1.5 was skipped — go back and run
  it. (Verify with the generator's `Step 1 done … Facets: N` line: `N` should equal the analyzed
  session count, minus any skipped subagents.)
- **The facet schema + analysis rules live in the `cowork-facet-extractor` agent**, not here — one
  source of truth. If the schema changes, edit the agent and `src/facet-cache.ts` together.
- **Cost**: facet extraction uses Sonnet by default (the agent's `model:`), parallel and cached, so
  the qualitative layer is cheap to add and free to re-render afterward.
