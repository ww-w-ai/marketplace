---
name: audit
description: Comprehensive project audit — runs all available validation skills, identifies gaps, and provides specific improvement recommendations
triggers:
  - audit
  - gap analysis
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
---

# audit -- Comprehensive Project Audit

Corresponding rules: `docs/specs/rule-writing.md`, `docs/specs/skill-design.md`, `docs/specs/agent-design.md`, `docs/specs/settings-design.md`, `docs/specs/claude-md-design.md`, `docs/specs/readme-design.md`, `docs/specs/documentation.md`, `docs/specs/git.md`

Cross-plugin rules (when dari-devtools is installed): `dari-devtools:rules/security.md`, `dari-devtools:rules/architecture.md`, `dari-devtools:rules/testing.md`

## Purpose

A comprehensive project audit that dynamically discovers and sequentially runs every available validation skill (standards + devtools plugins). Identifies categories with failures or warnings, then references the design guide rules to propose specific improvement steps.

Where the individual validate-*/scan-* skills show **"what is missing"**, /audit orchestrates all of them and guides **"how to improve"**.

## Input

- Target directory: current project root (auto-detected)
- No additional input required

## Execution Flow

### Step 1: Discover and run all validation skills (full execution required)

Dynamically discover and sequentially run every available validation skill.
Each skill must execute at full depth -- not just a simple pattern grep.

#### Per-skill execution protocol (required for every skill)

For each discovered skill, run the following steps in order.
Do not skip any step. Do not proceed to the next skill until all steps complete.

1. Read the skill's **entire** SKILL.md via the Read tool
2. **Resolve** the skill's target directory (use Dynamic Target Resolution if the skill defines it)
3. Execute **all** verification criteria defined in the skill's Execution Logic section
4. **Output** the skill's mandatory output matrix with Status and Evidence columns populated
5. **Assign** a per-category status: PASS / NOT_APPLICABLE / SKIPPED / SHALLOW
6. **Inter-skill gate**: Before moving to the next skill, confirm the current skill's matrix has no empty Status or Evidence cells

#### 1a. Skill discovery

Scan for validation skills by naming convention:
- Standards plugin: skills matching `validate*` pattern
- Devtools plugin: skills matching `validate*` or `scan-*` pattern

Discovery is automatic -- future skills that follow these naming patterns are included without changes to SKILL.md.

#### 1b. Availability check

For each discovered skill:
- Skill's plugin is installed and accessible -> add to execution queue
- Skill's plugin is not installed -> record as SKIPPED with reason

#### 1c. Execution order

1. validate-cc (CC configuration baseline -- always first)
2. Other standards validate-* skills (alphabetical)
3. Dev validate-*/scan-* skills (alphabetical)

#### 1d. Graceful skipping

Skills from uninstalled plugins are skipped gracefully:
```
[SKIPPED] scan-security -- dari-devtools plugin not installed
[SKIPPED] validate-architecture -- dari-devtools plugin not installed
[SKIPPED] validate-tests -- dari-devtools plugin not installed
```

Skipped skills do not affect the overall grade calculation.

### Step 1e: Mandatory output -- Validation Execution Matrix

Output the following matrix before proceeding to Step 2.
Every cell must be filled, including Status, Evidence, and Depth Proof columns.
Do not proceed if any cell is empty.
"PASS" status with 0 items checked is invalid -- use NOT_APPLICABLE or SHALLOW instead.

**Skill Execution Matrix:**

| Skill | Status | Items Checked | Pass | Warn | Fail | Evidence | Depth Proof |
|-------|:------:|:-------------:|:----:|:----:|:----:|----------|-------------|
| validate-cc | ? | ? | ? | ? | ? | {tools, files} | SKILL.md read: Y/N, all criteria: Y/N |
| validate-docs | ? | ? | ? | ? | ? | {tools, files} | SKILL.md read: Y/N, all criteria: Y/N |
| validate-git | ? | ? | ? | ? | ? | {tools, files} | SKILL.md read: Y/N, all criteria: Y/N |
| scan-security | ? | ? | ? | ? | ? | {tools, files} | SKILL.md read: Y/N, all criteria: Y/N |
| validate-architecture | ? | ? | ? | ? | ? | {tools, files} | SKILL.md read: Y/N, all criteria: Y/N |
| validate-tests | ? | ? | ? | ? | ? | {tools, files} | SKILL.md read: Y/N, all criteria: Y/N |

**Status values:** PASS (verified clean), NOT_APPLICABLE (no target), SKIPPED (plugin not installed), SHALLOW (target resolution failed)

**Per-category audit matrix** (by relevant category):

Rules verification matrix (per rule file):

| File | WHY | CONSTRAINT | Scope | Good/Bad | DEPENDS | Exceptions |
|------|:---:|:----------:|:-----:|:--------:|:-------:|:----------:|
| {file} | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ |

Settings verification matrix:

| Item | Check | Result |
|------|-------|:------:|
| deny: .env | present? | ✓/✗ |
| deny: rm -rf | present? | ✓/✗ |
| deny: push --force | present? | ✓/✗ |
| deny: reset --hard | present? | ✓/✗ |
| allow: no Bash(*) | confirmed? | ✓/✗ |
| hook: PreToolUse | present? | ✓/✗ |
| hook: PostToolUse | present? | ✓/✗ |

Commands verification matrix (per command file):

| File | Self-descriptive name | Single action | $ARGUMENTS guidance |
|------|:--------------------:|:-------------:|:-------------------:|
| {file} | ✓/✗ | ✓/✗ | ✓/✗/N/A |

### Step 2: Identify weak areas

Sort all results by priority:
- Category-based results (validate-cc): sort by failure count, then by warning count
- Finding-based results (validate-docs, validate-git, scan-security, validate-architecture, validate-tests): sort by severity (CRITICAL > HIGH > ERROR > MEDIUM > WARN), then by count
- Merge into a consolidated priority list

### Step 2.5: Per-category deep audit (required)

After all validation skills complete and before referencing the design rules, perform the following category-specific audit directly. This is an additional check beyond what the individual validate-* skills cover.

Do not skip this step. Every criteria table must have Status and Evidence fully populated.

#### Rules audit criteria

Read each `.claude/rules/*.md` file and verify:

| Item | Verification pattern | Reference rule | Evidence type |
|------|---------------------|----------------|:-------------:|
| WHY present | `> WHY:` or `## Why` | rule-writing.md section 1 | EMPIRICAL |
| CONSTRAINT present | `CONSTRAINT` or `## Constraint` | rule-writing.md section 2 | EMPIRICAL |
| paths scoping | `paths:` or `scope` or `applicable scope` | rule-writing.md section 3 | EMPIRICAL |
| Good/Bad examples | `### Good` and `### Bad` | rule-writing.md section 6 | EMPIRICAL |
| DEPENDS | `DEPENDS` or `## Dependencies` | rule-writing.md section 4 | EMPIRICAL |
| Exceptions | `## Exceptions` | rule-writing.md section 5 | EMPIRICAL |

#### Skills audit criteria

| Item | Verification pattern | Reference rule | Evidence type |
|------|---------------------|----------------|:-------------:|
| frontmatter 4 fields | name, description, triggers, allowed-tools | skill-design.md section 2 | CC_OFFICIAL |
| Corresponding Rule reference | rules/ path reference in body | skill-design.md section 1 | EMPIRICAL |
| Input/Output spec | Input/Output section | skill-design.md section 3 | EMPIRICAL |
| Reference implementation | includes execution result example | skill-design.md section 3 | EMPIRICAL |

#### Agents audit criteria

| Item | Verification pattern | Reference rule | Evidence type |
|------|---------------------|----------------|:-------------:|
| Single concern | concern clarity in description | agent-design.md section 1 | EMPIRICAL |
| allowed_tools restriction | warn if Bash, Write, Edit included | agent-design.md section 2 | CC_OFFICIAL |
| Output format | structured format defined (table/JSON) | agent-design.md section 3 | EMPIRICAL |
| Model selection | model field present (haiku/sonnet/opus) | agent-design.md section 4 | CC_OFFICIAL |

#### Settings audit criteria

| Item | Verification pattern | Reference rule | Evidence type |
|------|---------------------|----------------|:-------------:|
| deny adequacy | .env, rm -rf, push --force, reset --hard | settings-design.md section 2 | CC_OFFICIAL |
| allow granularity | no `Bash(*)` or `allow: ["*"]` | settings-design.md section 1 | CC_OFFICIAL |
| Hook design | PreToolUse/PostToolUse present | settings-design.md sections 3-4 | CC_OFFICIAL |

#### Commands audit criteria

| Item | Verification pattern | Reference rule | Evidence type |
|------|---------------------|----------------|:-------------:|
| Self-descriptive name | abbreviated (<= 2 chars), contains "and" | commands-design.md sections 5, 2 | EMPIRICAL |
| Single action | if/else, for each, conditional branching patterns | commands-design.md section 1 | EMPIRICAL |
| $ARGUMENTS guidance | usage stated when $ARGUMENTS is used | commands-design.md section 3 | EMPIRICAL |

### Step 3: Reference design rules

For each weak item, Read the corresponding design rule and extract specific improvement steps:

| Source skill | Category | Reference rule | Evidence type |
|--------------|----------|----------------|:-------------:|
| validate-cc | CLAUDE.md | `docs/specs/claude-md-design.md` | CC_OFFICIAL |
| validate-cc | Rules | `docs/specs/rule-writing.md` | EMPIRICAL |
| validate-cc | Skills | `docs/specs/skill-design.md` | CC_OFFICIAL |
| validate-cc | Agents | `docs/specs/agent-design.md` | CC_OFFICIAL |
| validate-cc | Settings | `docs/specs/settings-design.md` | CC_OFFICIAL |
| validate-cc | README.md | `docs/specs/readme-design.md` | INDUSTRY_STD |
| validate-docs | Documentation | `docs/specs/documentation.md` | INDUSTRY_STD |
| validate-git | Git | `docs/specs/git.md` | INDUSTRY_STD |
| scan-security | Security | `dari-devtools:rules/security.md` | INDUSTRY_STD |
| validate-architecture | Architecture | `dari-devtools:rules/architecture.md` | INDUSTRY_STD |
| validate-tests | Testing | `dari-devtools:rules/testing.md` | INDUSTRY_STD |

When a reference rule file is absent (plugin not installed), provide default guidance based on the finding type and general best practices.

### Step 3e: Pre-output checklist (required before final output)

Verify every item before drafting the report. If any item is unchecked, go back and complete it.

- [ ] Every category audit criteria table entry has a result (none skipped)
- [ ] Every FAIL/WARN item has a reference rule section + evidence type
- [ ] Every improvement action has a code example or before/after comparison
- [ ] Report language matches the user's conversation language
- [ ] Improvement priority list is sorted by severity (CRITICAL > HIGH > ERROR > WARN)

### Step 4: Output improvement recommendations

Output current status per category + specific improvement actions + expected result changes.
Each recommendation includes the specific section of the reference design rule and the evidence type.

## Output

Produce the audit report in the user's conversation language.

Output the audit results in the following format:

```
Comprehensive Audit Report
==================================================
Total: 25/40 passed | 5 warnings | 10 failures
Skills executed: 6 | Skills skipped: 1
Grade: Needs Improvement
==================================================

--- Part 1: CC configuration (from /validate-cc) ---

  Current status:
    [v] Directory exists
    [v] 2 files
    [x] WHY/CONSTRAINT: only 1 of 2 included (50%)
    [x] paths scoping absent

  Improvement actions:
    1. Add WHY (FAIL -> PASS)
       Add a WHY paragraph at the top of each rule file.
       Evidence: rule-writing.md section 1 [EMPIRICAL]

       Example:
       > WHY: By default Claude does X.
       > Without this rule, Y occurs.

    2. Add CONSTRAINT (FAIL -> PASS)
       State the specific consequence of a violation.
       Evidence: rule-writing.md section 2 [EMPIRICAL]

       Example:
       ### CONSTRAINT
       - On violation: [specific consequence, e.g., build failure, security vulnerability exposure]

    3. Add paths scoping (FAIL -> PASS)
       Specify applicable scope with a glob pattern.
       Evidence: rule-writing.md section 3 [EMPIRICAL]

       Example:
       ## Applicable Scope
       - paths: src/**/*.ts

  Expected change: 2 failures -> 0 failures

--- Part 2: Code documentation (from /validate-docs) ---

  Findings:
    [ERROR] src/auth/login.ts:42 -- function missing JSDoc comment
    [WARN]  src/utils/helper.ts:17 -- TODO without issue reference

  Improvement actions:
    1. Add JSDoc to undocumented functions (ERROR -> PASS)
       Evidence: documentation.md section 2 [EMPIRICAL]

  Expected change: 1 error -> 0 errors

--- Part 3: Git compliance (from /validate-git) ---

  Findings:
    [ERROR] branch "fix-login" -- does not follow naming convention
    [WARN]  commit "fixed stuff" -- missing Conventional Commits type

  Improvement actions:
    1. Rename branch per convention (ERROR -> PASS)
       Evidence: git.md section 1 [EMPIRICAL]

  Expected change: 1 error -> 0 errors

--- Part 4: Security (from /scan-security) ---

  Findings:
    [CRITICAL] src/api/user.ts:88 -- SQL injection pattern detected
    [HIGH]     src/config/db.ts:12 -- hardcoded credential

  Improvement actions:
    1. Replace raw SQL with parameterized queries (CRITICAL -> PASS)
       Evidence: dari-devtools:rules/security.md [INDUSTRY_STD]

  Expected change: 1 critical -> 0 critical

--- Part 5: Architecture (from /validate-architecture) ---

  Findings:
    [HIGH] src/ui/UserCard.tsx -- imports data layer directly

  Improvement actions:
    1. Access data through the service layer (HIGH -> PASS)
       Evidence: dari-devtools:rules/architecture.md [INDUSTRY_STD]

  Expected change: 1 high -> 0 high

--- Part 6: Tests (from /validate-tests) ---

  Findings:
    [WARN] src/__tests__/auth.test.ts -- tests implementation details instead of behavior

  Improvement actions:
    1. Rewrite tests to verify observable behavior (WARN -> PASS)
       Evidence: dari-devtools:rules/testing.md [INDUSTRY_STD]

  Expected change: 1 warning -> 0 warnings

--- Skipped skills ---
[SKIPPED] validate-tests -- dari-devtools plugin not installed

==================================================
Improvement priority (consolidated)
==================================================

  Priority 1 [CRITICAL] Security    -- SQL injection (scan-security)
  Priority 2 [HIGH]     Security    -- hardcoded credential (scan-security)
  Priority 3 [HIGH]     Architecture -- cross-layer import (validate-architecture)
  Priority 4 [ERROR]    Rules       -- missing WHY/CONSTRAINT (validate-cc)
  Priority 5 [ERROR]    Git         -- branch naming violation (validate-git)
  Priority 6 [WARN]     Tests       -- implementation detail testing (validate-tests)

==================================================
Expected grade after all improvements: Needs Improvement -> Excellent
==================================================
```

## Expected result change calculation

Calculate whether each improvement action can convert a FAIL into a PASS:

```
Expected change = current failures/warnings - improvable items
```

- File creation/addition: converts the item from FAIL to PASS
- Pattern addition (WHY, CONSTRAINT, etc.): ratio-based item reaches 100% and converts to PASS
- Expected grade after all improvements: regrade after resolving all failures/warnings

## Evidence type legend

Meaning of the evidence type shown with each improvement recommendation:

| Evidence type | Meaning | Confidence |
|---------------|---------|:----------:|
| CC_OFFICIAL | Behavior confirmed in Claude Code official documentation | High |
| CC_SCHEMA | Confirmed in the Claude Code settings file schema | High |
| ANTHROPIC_DOCS | Anthropic official guidelines | High |
| INDUSTRY_STD | Industry standard (Clean Architecture, OWASP, etc.) | Medium |
| EMPIRICAL | Pattern validated through team experiments/experience | Medium |

### Schema compliance check (required before persisting to .ww-w-ai/standards/)

Verify the JSON output before writing to `.ww-w-ai/standards/audit/`:
- [ ] All "required" fields in schema.json are present and non-empty
- [ ] categories[] array length matches the number of categories checked
- [ ] findings[] array length matches the total number of findings
- [ ] improvementPriority[] array is sorted by the priority field
- [ ] summary.total == summary.passed + summary.warnings + summary.failures

## Output persistence

After generating the audit report, persist results to `.ww-w-ai/standards/audit/`:

1. Create the `.ww-w-ai/standards/audit/` directory if it does not exist
2. Write `latest.json` -- structured result following `templates/schema.json`
3. Write `latest.md` -- human-readable report following `templates/report.template.md`
4. Archive to `history/` -- copy latest.json to `.ww-w-ai/standards/audit/history/{timestamp}.json`

`latest.md` is produced in the user's conversation language. JSON field names remain in English regardless of language.
The JSON output enables machine-parseable history tracking and cross-run comparison.
The history/ directory preserves prior audit runs for trend analysis.

## Permission rationale

- **Write**: restricted to `.ww-w-ai/standards/` output persistence. No modification of project source.
- **Bash**: restricted to read-only git/system queries. No file modification.

## Notes

- Bash is permitted for directory creation (`mkdir -p .ww-w-ai/standards/audit/history`) and Grep pattern matching.
- Improvement work is performed by the user directly.
- If design guide files are absent, default guidance is provided.
- Items of EMPIRICAL evidence type are experience-based and adjustable to project context.

## Spec references

Detailed verification criteria, evidence tables, examples:
- Corresponding rule specs: `../../docs/specs/rule-writing.md`, `../../docs/specs/skill-design.md`, `../../docs/specs/agent-design.md`, `../../docs/specs/settings-design.md`, `../../docs/specs/claude-md-design.md`, `../../docs/specs/readme-design.md`, `../../docs/specs/documentation.md`, `../../docs/specs/git.md`, `../../docs/specs/commands-design.md`
- Evidence index: `../../docs/evidence/evidence-registry.md`
