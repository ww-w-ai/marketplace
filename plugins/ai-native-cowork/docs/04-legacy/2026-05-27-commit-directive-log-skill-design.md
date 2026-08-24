> 상태: FROZEN (2026-06-06) — SUPERSEDED. cowork-commit 스킬로 구현 완료. 현재 진실 = skills/cowork-commit/SKILL.md + src/cli.ts

# Commit Directive Log — recap-commit Integration Design Spec

> 2026-05-27. Integrate a per-commit **verbatim directive-log file** into the existing
> `recap-commit` skill, so one run produces **both** artifacts: the curated recap in the
> commit message (existing) **and** a full verbatim transcription file under
> `docs/commit-log/` (new), committed together.

---

## 1. Intent

The user already built `recap-commit` (a plugin, not built-in). It scans sessions since
the last commit and embeds a **curated summary** (2-3 key prompts + assessment) into the
commit message. The new requirement: **also** emit a **full verbatim transcription** of
the directives that led to the commit, as a tracked file — learnable, re-typable, not a
summary. Both artifacts come from one engine scan and land in the same commit.

- **Commit message** → curated `<details>` recap block (existing behavior, unchanged).
- **`docs/commit-log/<ts>-<slug>.md`** → full verbatim directive script (new).

This supersedes the earlier idea of a standalone skill + Python scripts: the recap engine
already does session discovery + prompt extraction, so we extend it instead of duplicating.

---

## 2. Where it lives

- **Plugin project**: `/Users/taehyoungkim/Downloads/1d1cc/`
  - Symlinked into `~/.claude/skills/recap` and `~/.claude/skills/recap-commit`.
  - Engine: `src/` (Bun + TypeScript). Entry: `src/cli.ts`.
  - Skill prompt: `skills/recap-commit/SKILL.md`.
- **Runtime deps**: `bun` (already used by the engine) + `git`. No new dependency.
- Output/transcript paths derive from the current working directory, so it works in any
  project the user commits in.

---

## 3. Engine capabilities already present (reuse, don't rebuild)

From reading `src/cli.ts`, `src/recap-engine.ts`, `src/session-scanner.ts`:

- `cli.ts recap-commit` → `git log -1 --format=%cI` → `runCommitRecapPipeline(sinceISO)`
  → outputs `userPrompts: [{ text (≤1000 chars), timestamp }]` + metrics for the window
  since the last commit.
- `cli.ts scan --from --to` → `runRecapPipeline({from,to})` → same `userPrompts` plus
  `git.recentCommits` for an arbitrary date range. This is the building block for backfill.
- `session-scanner.ts` has `parseSessionFile` (full messages incl. assistant),
  `extractPromptsFromFile` (lightweight user-only), and `formatTranscript` (full transcript).
- The engine reads JSONL **from disk** — the LLM never loads raw transcripts. Token cost
  stays in the distilled JSON only.

**Gap for the full format**: `userPrompts` is user text only, truncated to 1000 chars,
with no preceding-assistant context. The verbatim format needs reactive-turn pairing.
→ requires an engine enhancement (Section 5).

---

## 4. The commit-hash paradox → hash-free filenames

A commit hash is a deterministic SHA over (tree + parents + author/committer + timestamp
+ message). A commit **cannot contain its own hash** (writing it into a tracked file
changes the tree → changes the hash → infinite regress). So a log file committed *in the
same commit it documents* must not contain that hash.

**Resolution:** filenames + bodies are **hash-free**. Mapping key = **timestamp**.

```
docs/commit-log/YYYYMMDD-HHMMSS-<slug>.md
                └ timestamp = documented commit's committer time (KST)
                              forward: "now" at write time (≈ commit time, within seconds)
                              backfill: the commit's %cI
                └ slug = slugify(commit subject)
```

Doc ↔ commit link:
- **forward**: git itself — `git log --diff-filter=A -- <doc>` finds the adding commit
  (= the documented commit, since the doc is committed *with* it).
- **backfill**: timestamp in filename matches the documented commit's time; hash MAY be
  written inside the body (those commits already exist, no paradox).

---

## 5. Engine enhancement: `commit-log` subcommand (full-depth extraction)

Add one subcommand to `src/cli.ts` that emits structured, full-depth directive data for a
time window. Powers **both** modes (forward = no range / since last commit; backfill =
explicit `--from`/`--to`).

```
bun run src/cli.ts commit-log [--from ISO] [--to ISO]
```

Output (JSON, ordered by timestamp across all overlapping sessions):

```jsonc
{
  "window": { "from": "...", "to": "..." },
  "turns": [
    {
      "ts": "2026-05-27T01:07:35Z",
      "sessionId": "1604d9e3",
      "line": 831,                       // L{n} in the JSONL → source traceability
      "userText": "<full verbatim, higher truncation e.g. 3000 chars>",
      "isReactive": true,                // short reply / choice following an assistant turn
      "precedingAssistant": "<truncated assistant proposal>",  // only when isReactive
      "options": ["...", "..."],         // when the preceding turn was AskUserQuestion
      "decision": "<chosen option>"      // resolved user choice, when applicable
    }
  ]
}
```

Extraction logic (in `session-scanner.ts` / a new helper, **script-level, no LLM**):

1. Discover sessions whose `[start,end]` overlaps the window (engine already scopes to
   cwd project; refine day-level filter to **second-level** by timestamp).
2. Walk each session's messages in order; keep user messages inside the window.
3. **Reactive-turn heuristic**: a user message is reactive when it is short and/or the
   immediately preceding assistant message asked a question / presented options
   (AskUserQuestion or a "A / B / C" proposal). For reactive turns, attach the preceding
   assistant text (truncated) + options + the resolved decision.
4. **Noise filter**: drop standalone acks (`ok`, `go`, `y`, one-word) **unless** they are
   reactive replies to a proposal (those are meaningful — they record a decision). This is
   the exact distinction the user demanded in the prior session.
5. **Synthetic-message filter** (critical): many `type:'user'` JSONL entries are not human
   directives — `<command-*>`, `<bash-input|stdout|stderr>`, `<user-prompt-submit-hook>`,
   `Caveat: The messages below were generated...`, and real messages carrying trailing
   `<system-reminder>…</system-reminder>` blocks. Drop whole-message synthetics; strip embedded
   reminder/hook blocks. Keep `Your questions have been answered:` (decision signal).
6. **Project targeting**: discovery + `git log` must key off the **user's repo**, not wherever
   the engine lives. The subcommand takes `--path <dir>` (default `process.cwd()`) used as
   `scanSessionFiles` basePath AND the `git log` child-process cwd; the skill invokes the engine
   by absolute path without `cd`-ing away from the repo, passing `--path "$PWD"`.
7. Merge all sessions, sort by `ts`.

The LLM/SubAgent then arranges `turns` into the verbatim doc; the engine supplies the
verbatim text, so authoring is mechanical formatting (slug, light grouping).

---

## 6. Forward flow (default — at commit time, BOTH artifacts)

Modify `skills/recap-commit/SKILL.md`:

```
1. Run engine `recap-commit` (existing) → userPrompts + metrics  [for the message block]
2. Run engine `commit-log` (new, no range) → full-depth turns     [for the log file]
3. Select 2-3 key prompts + assessment → format recap <details> block  (existing)
4. NEW: write docs/commit-log/<now-ts>-<slug>.md from `turns` (verbatim transcription
   format), update docs/commit-log/README.md index, `git add` both
5. Commit: message = recap block (existing) + the staged log file rides in the SAME commit
```

`slug` = slugify(commit subject the skill is about to use). Skill stages but the commit
itself is created by the existing Step 5 (HEREDOC). Secrets never staged.

---

## 7. Backfill flow (secondary — past undocumented commits)

New invocation path (e.g. `recap-commit backfill [<range>]` handled in SKILL.md, or a
sibling skill prompt). Steps:

1. `git log --format='%H %cI %s' --no-merges` → all commits.
2. Documented set = timestamps parsed from existing `docs/commit-log/` filenames.
3. Undocumented = commits whose time has no matching doc. If **> 8**, list them and ask
   the user to select which to document.
4. For each target commit C: window = (prev commit %cI, C %cI]. Run engine
   `commit-log --from <prev> --to <C>` → turns.
5. Write `docs/commit-log/<C-ts>-<slug>.md` (hash MAY appear in body — commit exists).
6. Update README index.
7. Commit the docs as a **separate** commit (they document past commits; can't ride along).

Time normalization: compare/sort everything in epoch to erase KST(git)/UTC(transcript) skew.

---

## 8. Output format (both modes)

Reuse the proven verbatim layout (see existing `docs/commit-log/*.md`):

- Header: commit subject, KST time, session id(s).
- Legend: `>` = user verbatim, 🤖 = preceding assistant (truncated, only on reactive turns).
- Chronological entries with `[sessionId Ln]` source markers.
- Reactive turns show the assistant proposal / option list + the user's choice.
- README index table: time (KST) · subject · doc link. Updated, not rewritten.
- Output dir: `docs/commit-log/` (default; overridable).

---

## 9. Edge cases

- **Window spans multiple sessions / `/clear`** → handled: engine discovers all
  overlapping sessions and merges by time (forward included — work since last commit can
  cross sessions).
- **rebase / amend** changes hash + time → README note; backfill re-maps by new time.
- **Manual commit, no AI session** → empty `turns` → skip the log file (still allow the
  message recap to no-op gracefully).
- **First commit** (no parent) → backfill window start = beginning of available transcript.
- **Long directive > truncation** → `commit-log` uses higher truncation (≈3000) than the
  message-block path (1000), since the file is the learnable artifact.
- **Existing hash-named docs** (this project's current 11) → left as-is; new docs use the
  hash-free scheme. Backfill detects them as documented via timestamp match.

---

## 10. Files touched in `~/Downloads/1d1cc`

| File | Change |
|------|--------|
| `src/cli.ts` | add `commit-log` subcommand (parse `--from`/`--to`, no-range = since last commit) |
| `src/session-scanner.ts` (or new `commit-log.ts`) | full-depth extractor: reactive-turn pairing, options/decision capture, second-level window filter, `[sessionId Ln]` |
| `skills/recap-commit/SKILL.md` | forward: add Steps to run `commit-log`, write file, stage, update index; add `backfill` invocation path |
| `skills/recap-commit/references/commit-log-format.md` (new) | the verbatim transcription template + reactive/noise rules |

No change to `recap` skill, html-report, facet-cache, metrics-extractor.

---

## 11. Resolved decisions

- Integrate into `recap-commit` (not a standalone skill); reuse the TS engine. ✓
- Produce **both** artifacts from one scan: message recap + log file. ✓
- **Full-depth** transcription (assistant proposal + options + decision on reactive turns)
  → engine enhancement required. ✓
- **Backfill included now** via `commit-log --from --to` per commit + separate commit. ✓
- Hash-free `YYYYMMDD-HHMMSS-<slug>.md`; timestamp maps doc↔commit. ✓
- Zero new runtime deps (bun + git already required). ✓
