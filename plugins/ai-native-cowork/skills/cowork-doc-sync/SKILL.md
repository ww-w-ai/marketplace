---
name: cowork-doc-sync
description: "Aligns a project's docs/ with the current code/decision state — call once at the very end, after implementation or refactoring is complete. Trigger on sync docs, align docs, organize docs, doc sync, /cowork-doc-sync, or implicit cues like \"clean up the docs now that we're done\", \"docs are out of sync with the code\", \"update docs to match what we built\". Enforces a numbered taxonomy (00-reference~99-misc) + status model (LIVING/ACTIVE/FROZEN) + migration rules; replays decisions since the last sync marker + git diff. DO NOT use to first-time bootstrap an unstructured docs/ (use /cowork-doc-init), to write one standalone doc, or piecemeal mid-implementation (run only after work is complete)."
---

# /cowork-doc-sync — Ongoing Doc Sync

## What / When

Call at the **very end**, once implementation/refactoring/decisions are done. Align docs/ to the current truth:
- Update LIVING docs (`01-built` as-built) to the current code/decision state
- Built-complete ACTIVE-PLAN → fold into LIVING, then FROZEN
- Superseded docs → move to `04-legacy` (+tombstone)
- New reports/research → file by date in `05-reports`/`06-research`
- Surface code-health observations that emerge while reconciling docs↔source — as a human writing docs naturally spots code deficiencies. By-product of work already done, not a separate audit → lightweight advisory report

**Anti-pattern (the reason this skill exists)**: piecemeal doc edits during multi-step implementation = wasted churn from reversals. Implementation done → verify → **cowork-doc-sync in one pass**.

## Required read (every call)

- `references/taxonomy.md` — taxonomy + status + migration + tool separation + vault boundary + **§6 local-config contract** (single spec)
- The target repo's **local doc-sync config** — `docs/CONVENTION.md` **or** a `## doc-sync scope` section in the repo `CLAUDE.md`/`AGENTS.md`. Per-project must-not-miss (sync surfaces beyond docs/, status-claim verification commands, derived-doc builds) per taxonomy §6. If **absent**, offer to scaffold one from the §6 contract before scanning.

## Determine scope (multi-session awareness — first)

Decisions **span multiple sessions.** Looking at the current session only misses decision drift from prior unsynced sessions. So inspect **the full range since the last sync**.

```
0-a. Structure check: does docs/ have the taxonomy (01-built, etc.)?
     → No = first run with no history → delegate to /cowork-doc-init and exit.
     → Yes = continue ongoing sync.
0-b. Read marker: scripts/sync-state.sh get <docs_dir>  → last_sync_at, last_sync_commit
     → NONE (no marker) = first sync → window = reasonable default (e.g. project start / before HEAD) or confirm with user.
0-c. Collect the full range since the last sync:
     · Decision/intent drift (not in git, in the conversation):
         Replay Claude Code and Codex sessions since last_sync_at via the available continue engine (zero-LLM transcript replay).
         = claude-code-token-saver scripts (list-sessions.js → filter lastMsgTimestamp>last_sync → preprocess.js → read compact.txt).
         Path discovery: ~/.claude/plugins/cache/**/claude-code-token-saver/*/scripts/.
         Prefer codex-token-saver's dual-source parser when available. If no replay engine exists, fall back to current session + git diff only.
     · Code drift: git diff <last_sync_commit>..HEAD.
```

## Workflow

```
1. Scan: cross-check the conversation decisions + code drift collected in 0-c above against the current state of docs/.
2. Detect drift — current code/decisions vs LIVING docs:
   if (LIVING doc diverges from code) → FIRST disambiguate which side is wrong (this is the human judgment):
     · doc is stale, code is the intended truth → update doc to current (verbatim facts, no speculation).
     · code betrays the doc/decision (a wrong fix / regression) → do NOT silently rewrite the doc to match the bad code; flag it in code-health (step 6).
   if (status-claim drift) → docs asserting VCS/deploy/version/release STATE (labels: merged/deployed/pending/unshipped/vN) are high-rot + invisible to content drift → VERIFY against source-of-truth (VCS/CI/prod), never trust the label; relabel if stale. The local config (taxonomy §6 #4) supplies the HOW (which commands); absent it, at least check git merge/tag/branch state.
   if (ACTIVE-PLAN is built-complete) → fold current truth into 01-built → move plan to 04-legacy (+tombstone).
   if (doc is superseded) → move to 04-legacy + tombstone header.
3. Classify: file the artifacts this work produced into the taxonomy.
   work reports (PDCA/gap/review) → 05-reports/YYYYMMDD-*.md
   research results → 06-research/YYYYMMDD-*.md (but product/business research = vault, §5 boundary)
4. Apply migration rules (taxonomy §3): move/delete/tombstone. Minimize strikethrough. git is the history.
5. Maintain single LIVING authority: verify the "current truth = 01-built" invariant. Check status label headers.
6. Code-health observations (by-product of reconciliation — the USER's changed source):
   only if code drift (0-c) has SOURCE changes; docs-only window → skip.
   PRIMARY = step 2's "code betrays the doc/decision" cases (wrong fixes) — flag first, cite both sides.
   SECONDARY = structural: weak/inflexible architecture, duplication/low reuse, clean-arch opportunities (layer leaks, coupling).
   high-confidence + evidence-based, lightweight. → file 05-reports/YYYYMMDD-code-health.md (format below); else one line "none".
7. Report: summarize what was updated/moved/filed + the code-health headline (N findings / none).
8. Update marker: scripts/sync-state.sh set <docs_dir> (now + HEAD). → starting point for the next sync.
```

## Code-health report — format

`05-reports/YYYYMMDD-code-health.md`. FROZEN, advisory, no fixes. Table: `Severity | Type (doc-mismatch/bug/architecture/reuse/clean-arch) | Code file:line | Says-vs-does`. Lead with doc-mismatch rows. file:line evidence only, no speculation. (e.g. "design.md says retry once; api-client.ts:42 retries forever".)

## Boundaries / Safety

- **Do not fill LIVING docs with speculation** — only facts confirmed from code/decisions. If unknown, confirm with the user.
- **Code-health report is advisory, not blocking** — never auto-fix, never let it slow the doc-alignment primary job. Same evidence discipline as docs (file:line, no speculation). Lightweight observation pass, not a full audit.
- Tool-generated artifacts (commit-log etc.) are not absorbed into the taxonomy (taxonomy §4).
- git is the safety net for moves/deletes — but if it feels irreversible, confirm with the user.
- If a new folder scaffold is needed, use `scripts/init-doc-tree.sh <docs_dir>`.
