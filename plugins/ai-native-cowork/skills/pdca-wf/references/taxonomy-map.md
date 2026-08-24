# pdca-wf — taxonomy map, document lifecycle, cowork-doc-sync handoff

Document outputs follow the cowork-doc-sync taxonomy. Status labels: LIVING / ACTIVE-PLAN / FROZEN.

## PDCA phase → taxonomy

| Phase | Folder | Filename | Status |
|---|---|---|---|
| Research | `06-research/` | `<dt>-<feature>.md` | dated snapshot |
| Plan | `02-planned/` | `<dt>-<feature>-plan.md` | ACTIVE-PLAN |
| Design | `02-planned/` | `<dt>-<feature>-design.md` | ACTIVE-PLAN (single input to Do) |
| Check | `05-reports/` | `<dt>-<feature>-check.md` | dated snapshot |
| Report | `05-reports/` | `<dt>-<feature>-report.md` | dated snapshot |
| as-built | `01-built/` | `<feature>.md` | LIVING (single authority) |

`<dt>` = `YYYY-MM-DD-HHmm`, stamped by MAIN via `date '+%Y-%m-%d-%H%M'` and injected through `args.dt`. Never generated inside a Workflow (sandbox `Date` throws). Datetime prefix gives sortable order + history.

**Status labels apply only to LIVING/PLAN docs.** `02-planned/*` carry `> Status: ACTIVE-PLAN`; `01-built/*` carry `> Status: LIVING` + `> Last updated: ...`. Dated snapshots (`05-reports/*`, `06-research/*`) carry **no status line** — the datetime filename IS the marker.

**Re-stamp per writing re-entry.** Do NOT reuse the Phase-0 `<dt>` for everything: each main re-entry that writes a dated/last-updated artifact stamps a fresh `date`. Check snapshot uses `<dt2>` (Phase-5 time); Report + the `01-built` `Last updated` header use `<dt3>` (Phase-6 time). The `Last updated` header is `YYYY-MM-DD HH:MM` (space+colon) — reformat from the dashed `<dt>`.

## Document lifecycle (on build completion)

DONE predicate (code-checkable; gates the irreversible delete, NOT the raw LLM float):
`done := every WorkList item present in built result AND no blocker/major gaps`.

```
done == true (all built):
  01-built/<feature>.md                 ← as-built, CLEAN. Section-scoped MERGE (replace only this cycle's sections, never whole-file wipe). Superseded sections deleted, not struck.
  02-planned/<dt>-<feature>-design.md   ← DELETE the file (no strikethrough on a doomed file; git holds history).
  02-planned/<dt>-<feature>-plan.md     ← superseded → cowork-doc-sync deletes / moves to 04-legacy.

done == false (residual after max 5):
  01-built/<feature>.md                 ← as-built of implemented parts only, CLEAN (section-scoped merge).
  02-planned/<dt>-<feature>-design.md   ← KEEP. Strike through implemented items; un-struck = residual.
                                           ≥50% struck AND struck ≥3 → DELETE struck items (keep residual + one-line pointer); <3 struck = keep (small-doc guard). 100% = done case.
  02-planned/<dt>-<feature>-plan.md     ← KEEP (still active).
  05-reports/<dt3>-<feature>-report.md  ← residual gap list (re-pursue as a NEW dated 02-planned plan).
```

Resume guard: design doc persists through Check; delete only in Phase 6 (terminal, idempotent). If design absent AND `01-built/<feature>.md` present → cycle complete, do NOT re-run Check.

### Strikethrough / deletion rules

| Doc | Strikethrough | History in body |
|---|---|---|
| `01-built` (LIVING) | **NEVER** — current truth only | NO — delete old text, git preserves it |
| `02-planned` | **YES** — mark planned items that got built (cancellation marker). Noise cap: ≥50% struck AND struck ≥3 → delete the struck items, keep residual only (small-doc guard: <3 struck = keep) | keep file if residual, delete if all done |
| `05-reports` / `06-research` | — | the dated files ARE the history |

- 01-built header carries `> Last updated: <YYYY-MM-DD HH:MM>` (stamped by main).
- Strikethrough is a "planned→built" cancellation marker (narrow, inline) — NOT preservation of superseded text. Preservation-by-strikethrough is forbidden (delete instead; git is the history layer).
- Re-pursuing a residual → fresh dated `02-planned` plan; never edit the old struck design in place.

## cowork-doc-sync handoff (end of Phase 6)

After writing report + 01-built, hand off to `/cowork-doc-sync` for final alignment:
- migrates fully-superseded `02-planned` design → delete or `04-legacy` per its rules,
- confirms `01-built` is the single LIVING authority,
- updates CLAUDE.md summary line.

Do NOT run cowork-doc-sync mid-cycle (piecemeal doc edits are forbidden while decisions still churn) — only once, at completion.
