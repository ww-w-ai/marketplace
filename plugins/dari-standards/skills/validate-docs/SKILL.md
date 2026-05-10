---
name: validate-docs
description: Validates code comment quality and TODO/FIXME formatting
triggers:
  - validate docs
  - check docs
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
---

# validate-docs -- Code Documentation Quality Validation

Corresponding rule: `docs/specs/documentation.md`

## Input -- Dynamic Target Resolution

Resolve the target directory in the following order:
1. CLAUDE.md "Project Structure" section -- extract source code directories
2. If CLAUDE.md is absent or has no structure: Glob source files (`**/*.{ts,tsx,js,jsx,py,java,go,rs}`) -- use the top-level directory containing matches
3. If no source files exist: report status as SHALLOW with reason

Default exclusions: node_modules/, .git/, dist/, build/, coverage/
Skill-specific exclusions: `*.generated.*`, `*.g.dart`, `*.freezed.dart` (auto-generated code)

### Mandatory output: Target resolution result

Output the following before proceeding to validation. Do not proceed until resolved.

| Step | Result |
|------|--------|
| CLAUDE.md check | found/not found |
| Resolved directories | {list or "none"} |
| Source files found | {count} |
| Resolution method | CLAUDE.md / Glob fallback / SHALLOW |

## Execution logic

1. **Validate TODO/FIXME formatting**
   - Grep for the `TODO` or `FIXME` keywords
   - Valid format: `TODO(@assignee, YYYY-MM): description` or `FIXME(@assignee, YYYY-MM): description`
   - Warn when the `(@` + `, ` + 4-digit year pattern is absent
   - TODOs/FIXMEs without an assignee/deadline cannot be tracked and risk permanent neglect

2. **Validate HACK removal conditions**
   - Grep for the `HACK` keyword
   - Warn when no removal condition or date (`YYYY`, `vN`, `#issue-number`) is present
   - A HACK without a removal condition causes temporary code to become permanent

3. **Prefix usage report**
   - Prefix list: `WHY`, `CONSTRAINT`, `DEPENDS`, `SECURITY`, `PERF`, `MIGRATION`
   - Grep the usage count of each prefix
   - Generate a prefix usage ratio report (informational only, no PASS/FAIL verdict)

4. **Detect self-evident comments** (low confidence)
   - Detection patterns: `// declare variable`, `// increment i`, `// call function`, `// return`, `// loop`, `// declare`
   - Patterns where the comment restates what the code already expresses
   - High false-positive rate, so marked as "suspected items" only (not FAIL)

### Mandatory output: Findings verification matrix

Output the following matrix before generating the final report. Do not proceed until every category has been checked.

| Category | Status | Items Checked | Pass | Warn | Fail | Evidence |
|----------|:------:|:-------------:|:----:|:----:|:----:|----------|
| TODO/FIXME format | ? | ? | ? | ? | ? | {tools, files, patterns} |
| HACK conditions | ? | ? | ? | ? | ? | {tools, files, patterns} |
| Prefix usage | ? | ? | - | - | - | {tools, files, patterns} |
| Self-evident comments | ? | ? | - | - | - | {tools, files, patterns} |

Status values: PASS (verified clean), NOT_APPLICABLE (no source files found), SKIPPED (plugin issue), SHALLOW (target resolution failed)

### Pre-output checklist (required before final output)

Verify every item before drafting the report. If any item is unchecked, go back and complete it.

- [ ] Every validation category has a Status value assigned (no empty Status cells)
- [ ] Every category whose Status != SKIPPED has an Evidence value
- [ ] Every WARN item includes a file path and line number
- [ ] Report language matches the user's conversation language

### Schema compliance check (required before persisting to .ww-w-ai/standards/)

Verify the JSON output before writing to `.ww-w-ai/standards/validate-docs/`:
- [ ] All "required" fields in schema.json are present and non-empty
- [ ] findings[] array includes every detected item
- [ ] summary aggregates match the actual number of findings

## Output

Produce the validation report in the user's conversation language.

Output the validation results in the following format:

```
Documentation Quality Report
==================================================

### TODO/FIXME format

| File:line | Type | Description |
|-----------|:----:|-------------|
| src/auth.ts:42 | WARN | TODO without assignee/deadline: `// TODO: fix later` |
| src/order.ts:15 | PASS | `// TODO(@kim, 2026-06): implement pagination` |
| src/payment.ts:88 | WARN | FIXME without assignee: `// FIXME: intermittent timeout` |

### HACK removal conditions

| File:line | Type | Description |
|-----------|:----:|-------------|
| src/legacy.ts:23 | WARN | HACK without removal condition: `// HACK: don't touch` |

### Prefix usage summary

| Prefix | Count |
|--------|:-----:|
| WHY | 5 |
| CONSTRAINT | 3 |
| DEPENDS | 2 |
| SECURITY | 1 |
| PERF | 0 |
| MIGRATION | 0 |

### Suspected items (self-evident comments)

| File:line | Content |
|-----------|---------|
| src/utils.ts:10 | `// declare the variable` |
| src/calc.ts:25 | `// increment i by 1` |

> Suspected items have a high false-positive rate. Check the context to decide whether the comment is truly unnecessary.

--------------------------------------------------
Total: 3 warnings | 2 suspected items
```

## Output persistence

After generating the documentation quality report, persist results to `.ww-w-ai/standards/validate-docs/`:

1. Create the `.ww-w-ai/standards/validate-docs/` directory if it does not exist
2. Write `latest.json` -- structured result following `templates/schema.json`
3. Write `latest.md` -- human-readable report following `templates/report.template.md`
4. Archive to `history/` -- copy latest.json to `.ww-w-ai/standards/validate-docs/history/{timestamp}.json`

`latest.md` is produced in the user's conversation language. JSON field names remain in English regardless of language.
The JSON output enables machine-parseable history tracking and cross-run comparison.
The history/ directory preserves prior runs for trend analysis.

## Permission rationale

- **Write**: restricted to `.ww-w-ai/standards/` output persistence. No modification of project source.
- **Bash**: restricted to read-only git/system queries. No file modification.

## Notes

- This skill is read-only. It does not modify or add comments.
- Self-evident comment detection is based on string pattern matching and has a high false-positive rate. Results are marked as "suspected items" only and the final judgment is the user's.
- Auto-generated code (`*.generated.*`, etc.) is excluded from the search scope.
- The prefix usage summary is informational; a low usage ratio does not lead to a FAIL verdict.
- English-only detection patterns are used. In non-English projects, detection accuracy (especially for self-evident comment detection) may vary.

## Spec references

Detailed verification criteria, evidence tables, examples:
- Corresponding rule spec: `../../docs/specs/documentation.md`
- Evidence index: `../../docs/evidence/evidence-registry.md`
