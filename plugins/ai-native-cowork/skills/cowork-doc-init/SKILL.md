---
name: cowork-doc-init
description: "One-time bootstrap of an existing project's docs/ into the cowork-doc-sync taxonomy. Trigger on init doc structure, relocate docs, organize existing docs, doc bootstrap, /cowork-doc-init, or implicit cues like \"my docs/ is a mess, set up a structure\", \"fit this project into the doc standard\". After a gap analysis: Phase 1 = relocation only (move existing docs/sections, no new creation), Phase 2 = analyze source to create new docs (only after user approval). DO NOT use for ongoing maintenance of an already-structured docs/ (use /cowork-doc-sync) — this is first-time setup only."
---

# /cowork-doc-init — Bootstrap existing docs/source into the cowork-doc-sync structure (one-time)

For fitting an existing project to the cowork-doc-sync taxonomy for the first time. For ongoing maintenance afterward, use `/cowork-doc-sync`.

## Required read (every call)

- `../cowork-doc-sync/references/taxonomy.md` — target spec (taxonomy/status/migration/tool separation/vault boundary)
- Target repo's `docs/CONVENTION.md` (if present)

## Safety principles (MUST)

- **Phase 1 = relocation only. No new content creation, no rewriting existing content.** Content is **verbatim move** only (summary/polish = Phase 2's domain).
- **Phase 2 = source→new-doc creation. Only proceed after user approval.** (Hallucination risk — code-grounded only, no speculation.)
- git is the safety net — but present a **plan first** before bulk moves. If it feels irreversible, confirm.
- Delete only **pure clutter** (taxonomy §3). If unsure, do not delete — use `99-misc` or `04-legacy`.

## Phase 1 — gap analysis + relocation (no new creation)

```
1. Inventory: enumerate all docs in docs/ + grasp the structure. (Source = only light cross-reference, to judge LIVING/stale)
2. Classify — each doc, and each major section within a doc:
   → which bucket (00~06/99)?  + which status (LIVING/ACTIVE/FROZEN)?
   Must view at the section level: if one doc mixes LIVING (current), FROZEN (past), and other topics, split it.
   e.g. a "current architecture" section inside a plan doc → move to 01-built (LIVING) / the rest of the plan → keep in 02-planned.
3. Write a gap-analysis report (current → proposed mapping: destination per doc/section + rationale + move/delete/tombstone action).
   → Present to the user. Get a nod before executing bulk/risky moves.
3-b. fold-check (for each legacy candidate): has the current truth been absorbed into as-built (LIVING)?
     ★ **If LIVING cites that plan as the "detail spec"** = only summarized = **not-folded → must not legacy it.** (taxonomy §3.)
3-c. built-vs-legacy split for SHIPPED docs (taxonomy **§3-a** — MUST read it; the most-missed call):
     `if shipped AND it is a design/spec (the detail)` → **`01-built/design-specs/`** (relabel `LIVING (as-built detail spec)`, body verbatim)
     `elif shipped AND it is a process artifact (roadmap/sprint plan/PRD/kickoff)` → **`04-legacy`** + tombstone (consumed; history = 05-reports)
     `elif superseded/abandoned (never built, or built differently)` → **`04-legacy`** + tombstone
     ⛔ **Nothing shipped may stay in `02-planned`** — a label cannot rescue a doc filed under "planned"; folder beats label. Goal: `02-planned` = only genuinely unstarted work.
4. Execute relocation (taxonomy §3 rules):
   - Whole doc superseded (fully-folded) → move to 04-legacy + tombstone
   - Section move → cut verbatim and paste into the destination doc. Delete the original location + a 1-line pointer if needed.
   - Pure clutter → delete. Tool-generated artifacts (commit-log etc.) → do not touch (§4).
   - ★ **Update inbound references (MUST)**: before moving, check blast radius (`grep -rn <basename>.md`). After moving, **fix broken LIVING/ACTIVE/manual → MOVED links** (if the plan was "current," redirect to as-built). intra-legacy/frozen internal links = preserve (history).
   - ★ **Prove the repair (MUST — taxonomy §3)**: rewrite links from a **filesystem scan of where files actually are**, then verify by resolving every LIVING-layer reference against the filesystem. **Never verify with the same loop that did the repair** — that reports false green (real case: a sed loop silently matched nothing, its twin grep loop said "0 broken," 18 links were dead).
5. Establish single LIVING authority: consolidate the current truth into 01-built. Assign status label headers.
6. File the report as 05-reports/YYYYMMDD-cowork-doc-init.md (work record + skill defects found).
```

**Relocation principle**: you are **moving, not rewriting**. Preserve facts = verbatim. "This section is stale, should I fix it?" → in Phase 1 **do not fix it**; if it is LIVING, move it as-is to 01-built and only flag "needs update" in the report (actual update happens via /cowork-doc-sync or user instruction).

## Phase 2 — source analysis → new doc creation (user approval required)

```
1. Source gap analysis: identify areas the code does that no doc covers
   (e.g. missing as-built architecture, missing manual, missing handover for a core module).
2. Proposal: list which new docs to create (in which bucket) + rationale.
3. ⛔ Create only the items the user has been asked about and approved. (Creation = code-grounded, no speculation.)
4. Artifacts → the appropriate bucket. as-built=01-built (LIVING), manual=03-manual, handover=03-manual.
```

## Output

- Phase 1: relocated docs/ + a gap-analysis/relocation report in `05-reports/`.
- Phase 2 (if approved): code-grounded new docs.
- After completion, advise: for ongoing maintenance afterward, use `/cowork-doc-sync`.
