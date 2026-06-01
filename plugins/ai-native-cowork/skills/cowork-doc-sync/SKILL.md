---
name: cowork-doc-sync
description: "Ongoing doc-sync skill that aligns a project's docs/ with the current code/decision state. Call once at the very end, after implementation/refactoring is complete. Enforces a numbered taxonomy (00-reference~99-misc) + status model (LIVING/ACTIVE/FROZEN) + migration rules. To fit an existing project into this structure for the first time, use /cowork-doc-init. Triggers: cowork-doc-sync, /cowork-doc-sync, sync docs, align docs, organize docs, doc sync, doc alignment"
---

# /cowork-doc-sync — Ongoing Doc Sync

## What / When

Call at the **very end**, once implementation/refactoring/decisions are done. Align docs/ to the current truth:
- Update LIVING docs (`01-built` as-built) to the current code/decision state
- Built-complete ACTIVE-PLAN → fold into LIVING, then FROZEN
- Superseded docs → move to `04-legacy` (+tombstone)
- New reports/research → file by date in `05-reports`/`06-research`

**Anti-pattern (the reason this skill exists)**: piecemeal doc edits during multi-step implementation = wasted churn from reversals. Implementation done → verify → **cowork-doc-sync in one pass**.

## Required read (every call)

- `references/taxonomy.md` — taxonomy + status + migration + tool separation + vault boundary (single spec)
- Target repo's `docs/CONVENTION.md` (if present) — per-project override

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
         Replay all sessions since last_sync_at via the /continue engine (zero-LLM transcript replay).
         = claude-code-token-saver scripts (list-sessions.js → filter lastMsgTimestamp>last_sync → preprocess.js → read compact.txt).
         Path discovery: ~/.claude/plugins/cache/**/claude-code-token-saver/*/scripts/.
         If plugin absent, graceful fallback → current session + git diff only.
     · Code drift: git diff <last_sync_commit>..HEAD.
```

## Workflow

```
1. Scan: cross-check the conversation decisions + code drift collected in 0-c above against the current state of docs/.
2. Detect drift — current code/decisions vs LIVING docs:
   if (LIVING doc diverges from current) → update to current truth (reflect verbatim facts, no speculation).
   if (ACTIVE-PLAN is built-complete) → fold current truth into 01-built → move plan to 04-legacy (+tombstone).
   if (doc is superseded) → move to 04-legacy + tombstone header.
3. Classify: file the artifacts this work produced into the taxonomy.
   work reports (PDCA/gap/review) → 05-reports/YYYYMMDD-*.md
   research results → 06-research/YYYYMMDD-*.md (but product/business research = vault, §5 boundary)
4. Apply migration rules (taxonomy §3): move/delete/tombstone. Minimize strikethrough. git is the history.
5. Maintain single LIVING authority: verify the "current truth = 01-built" invariant. Check status label headers.
6. Report: summarize what was updated/moved/filed.
7. Update marker: scripts/sync-state.sh set <docs_dir> (now + HEAD). → starting point for the next sync.
```

## Boundaries / Safety

- **Do not fill LIVING docs with speculation** — only facts confirmed from code/decisions. If unknown, confirm with the user.
- Tool-generated artifacts (commit-log, bkit/*) are not absorbed into the taxonomy (taxonomy §4).
- git is the safety net for moves/deletes — but if it feels irreversible, confirm with the user.
- If a new folder scaffold is needed, use `scripts/init-doc-tree.sh <docs_dir>`.
