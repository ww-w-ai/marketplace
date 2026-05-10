---
name: validate-cc
description: Validates CC configuration quality based on discovery (PASS/FAIL + statistics)
triggers:
  - validate-cc
  - quality check
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
---

# validate-cc -- CC Configuration Quality Validation

Corresponding rules: `docs/specs/rule-writing.md`, `docs/specs/skill-design.md`, `docs/specs/agent-design.md`, `docs/specs/settings-design.md`

## Purpose

Validates only the items that exist in the project. Categories that do not exist are automatically omitted from the report. For categories that do exist, provides PASS/FAIL results and statistics per category.

## Input

- Target directory: current project root (auto-detected)
- No additional input required

## Verification criteria

> Categories whose target directory does not exist (e.g., `.claude/agents/` missing) are automatically omitted from the report.

### 1. CLAUDE.md

| Item | Verification method | Evidence type |
|------|--------------------|:-------------:|
| Existence (EXISTS) | CLAUDE.md file present | CC_OFFICIAL |
| Structure (STRUCTURE) | includes Tech Stack or Architecture patterns | EMPIRICAL |
| Technical depth (DEPTH) | 3 or more `## ` sections | EMPIRICAL |

- EXISTS: CC automatically loads CLAUDE.md into context at session start (CC_OFFICIAL)
- STRUCTURE: Tech Stack/Architecture sections prevent Claude from guessing the tech stack (EMPIRICAL)
- DEPTH: 3 or more sections provide sufficient project orientation (EMPIRICAL)

### 2. Rules

| Item | Verification method | Evidence type |
|------|--------------------|:-------------:|
| Directory (DIR) | `.claude/rules/` present | CC_OFFICIAL |
| File count (FILES) | 2 or more .md files | EMPIRICAL |
| WHY/CONSTRAINT (META) | ratio of rules that contain WHY or CONSTRAINT | EMPIRICAL |
| Scoping (SCOPING) | `paths:` or `scope:` or applicable-scope specified | EMPIRICAL |

- DIR: CC auto-loads .md files from the rules/ directory (CC_OFFICIAL)
- FILES: a meaningful rule system requires at least 2 files (EMPIRICAL)
- META: WHY/CONSTRAINT enable rule-priority judgment and awareness of violation severity (EMPIRICAL)
- SCOPING: explicit scope prevents indiscriminate rule application (EMPIRICAL)

### 3. Skills

| Item | Verification method | Evidence type |
|------|--------------------|:-------------:|
| Directory (DIR) | `.claude/skills/` present | CC_OFFICIAL |
| Frontmatter (FRONTMATTER) | SKILL.md has YAML frontmatter (name, description) | CC_OFFICIAL |
| Rule-Skill ratio (RULE_SKILL_RATIO) | ratio of skill directories to rule files | EMPIRICAL |
| Gate (GATE) | SKILL.md contains "Do not proceed" or "Mandatory Output" or "Pre-Output Checklist" | EMPIRICAL |

- DIR: CC recognizes SKILL.md in the skills/ directory (CC_OFFICIAL)
- FRONTMATTER: without frontmatter, CC cannot recognize the skill (CC_OFFICIAL)
- RULE_SKILL_RATIO: Rules without a Skill cannot be automatically validated (EMPIRICAL)
- GATE: skills without execution gates allow the AI to skip verification depth (EMPIRICAL)
- **Methodology rule exception**: Rules marked [M] (methodology rules such as c-suite-analysis, question-principles, research) are excluded from the Rule-Skill ratio calculation. These rules define analysis/research methodologies consumed by skills like /discovery, not CC behavior constraints requiring a dedicated validation skill.

### 4. Agents

| Item | Verification method | Evidence type |
|------|--------------------|:-------------:|
| Directory (DIR) | `.claude/agents/` present | CC_OFFICIAL |
| File count (FILES) | 1 or more .md files | EMPIRICAL |
| Allowed Tools (ALLOWED_TOOLS) | agent defines allowed_tools or allowed-tools | CC_OFFICIAL |

- DIR: CC recognizes agent definitions in the agents/ directory (CC_OFFICIAL)
- FILES: at least 1 agent is required for automated code review/analysis (EMPIRICAL)
- ALLOWED_TOOLS: allowed_tools restricts the agent's tool scope (CC_OFFICIAL)

### 5. Settings

| Item | Verification method | Evidence type |
|------|--------------------|:-------------:|
| Existence (EXISTS) | `.claude/settings.json` present | CC_OFFICIAL |
| Deny (DENY) | deny key + contains .env or rm -rf | CC_OFFICIAL |
| Hook (HOOK) | PreToolUse or PostToolUse present | CC_OFFICIAL |

- EXISTS: settings.json controls tool permissions and hooks (CC_OFFICIAL)
- DENY: deny takes precedence over allow, reliably blocking dangerous operations (CC_OFFICIAL)
- HOOK: PreToolUse/PostToolUse hooks automate verification before and after tool execution (CC_OFFICIAL)

### 6. README.md

| Item | Verification method | Evidence type |
|------|--------------------|:-------------:|
| Existence (EXISTS) | README.md file present | INDUSTRY_STD |
| Content (CONTENT) | 3 or more `## ` sections | INDUSTRY_STD |

- EXISTS: README.md is the project entry point providing installation/run guidance (INDUSTRY_STD)
- CONTENT: at least 3 sections are required to cover basic guidance such as install, run, and test (INDUSTRY_STD)

### 7. Commands

| Item | Verification method | Evidence type |
|------|--------------------|:-------------:|
| Directory (DIR) | `.claude/commands/` present | CC_OFFICIAL |
| Naming (NAMING) | self-descriptive name (warn on abbreviations, "and") | EMPIRICAL |
| Single action (SINGLE_ACTION) | no branching/looping logic (if/else, for each) | EMPIRICAL |

- DIR: CC recognizes commands in the commands/ directory (CC_OFFICIAL)
- NAMING: the action should be immediately inferable from the name alone (EMPIRICAL)
- SINGLE_ACTION: with branching/looping present, conversion to a skill is recommended (EMPIRICAL)

### Mandatory output: Category verification matrix

Output the following matrix before grade calculation. Every cell must be filled. If any cell is empty, do not proceed to grading.

| Category | Status | Items Checked | Pass | Warn | Fail | Evidence |
|----------|:------:|:-------------:|:----:|:----:|:----:|----------|
| CLAUDE.md | ? | ? | ? | ? | ? | {tools, files checked} |
| Rules | ? | ? | ? | ? | ? | {tools, files checked} |
| Skills | ? | ? | ? | ? | ? | {tools, files checked} |
| Agents | ? | ? | ? | ? | ? | {tools, files checked} |
| Settings | ? | ? | ? | ? | ? | {tools, files checked} |
| README.md | ? | ? | ? | ? | ? | {tools, files checked} |
| Commands | ? | ? | ? | ? | ? | {tools, files checked} |

Status values: PASS (verified clean), NOT_APPLICABLE (category directory not found -- omitted from report), SKIPPED (plugin issue), SHALLOW (partial check)

## Grade criteria

| Condition | Grade | Meaning |
|-----------|:-----:|---------|
| 0 failures, 0 warnings | Excellent | CC configuration is mature enough for consistent AI collaboration |
| 0 failures | Good | basic structure is in place but some areas need reinforcement |
| 1-2 failures | Needs Improvement | core configuration is lacking, AI behavior is inconsistent |
| 3+ failures | Poor | CC configuration is nearly absent, AI must guess everything |

## Execution logic

1. Detect current project root (search for CLAUDE.md or .claude/ via Glob)
2. Discover existing categories (omit categories that do not exist)
3. Verify category-specific items using Read/Glob/Grep:
   - `Glob` to confirm file/directory existence
   - `Read` to read file contents
   - `Grep` for pattern matching (WHY, CONSTRAINT, paths:, etc.)
4. PASS/WARN/FAIL determination and statistics aggregation per item
5. Determine grade
6. Generate improvement suggestions

## Output

Produce the validation report in the user's conversation language.

Output the validation results in the following format:

```
CC Configuration Quality Report
==================================================

[PASS] CLAUDE.md (3/3)
  [v] Existence
  [v] Structure
  [v] Technical depth

[WARN] Rules (3/4)
  [v] Directory
  [v] File count
  [!] WHY/CONSTRAINT -- 50% coverage
  [v] Scoping

[PASS] Skills (3/3)
  [v] Directory
  [v] Frontmatter
  [v] Rule-Skill ratio

[PASS] Settings (3/3)
  [v] Existence
  [v] Deny
  [v] Hook

[PASS] README.md (2/2)
  [v] Existence
  [v] Content

--------------------------------------------------
Total: 14/15 passed | 1 warning | 0 failures
Grade: Good

Improvement suggestions: 1
  - Add WHY metadata to rules
```

> In the example above, the Agents category is automatically omitted because the `.claude/agents/` directory does not exist.

### Icon convention

| Icon | Meaning | Condition |
|:----:|---------|-----------|
| `[PASS]` | overall pass | 0 failed items |
| `[WARN]` | warnings present | 0 failures, 1+ warnings |
| `[FAIL]` | failures present | 1+ failed items |
| `[v]` | item pass | status == pass |
| `[!]` | item warning | status == warn |
| `[x]` | item failure | status == fail |

### Pre-output checklist (required before final output)

Verify every item before drafting the report. If any item is unchecked, go back and complete it.

- [ ] Every category has a Status value assigned (no empty Status cells)
- [ ] Every category whose Status != NOT_APPLICABLE has an Evidence value
- [ ] Categories that do not exist have Status NOT_APPLICABLE
- [ ] Grade calculation matches the grade criteria table
- [ ] Report language matches the user's conversation language

### Schema compliance check (required before persisting to .ww-w-ai/standards/)

Verify the JSON output before writing to `.ww-w-ai/standards/validate-cc/`:
- [ ] All "required" fields in schema.json are present and non-empty
- [ ] categories[] array length matches the number of categories checked
- [ ] summary.total == summary.passed + summary.warnings + summary.failures

## Output persistence

After generating the validation report, persist results to `.ww-w-ai/standards/validate-cc/`:

1. Create the `.ww-w-ai/standards/validate-cc/` directory if it does not exist
2. Write `latest.json` -- structured result following `templates/schema.json`
3. Write `latest.md` -- human-readable report following `templates/report.template.md`
4. Archive to `history/` -- copy latest.json to `.ww-w-ai/standards/validate-cc/history/{timestamp}.json`

`latest.md` is produced in the user's conversation language. JSON field names remain in English regardless of language.
The JSON output enables machine-parseable history tracking and cross-run comparison.
The history/ directory preserves prior runs for trend analysis.

## Permission rationale

- **Write**: restricted to `.ww-w-ai/standards/` output persistence. No modification of project source.
- **Bash**: restricted to read-only git/system queries. No file modification.

## Notes

- Bash is permitted for directory creation (`mkdir -p .ww-w-ai/standards/validate-cc/history`) and Grep pattern matching.
- Detailed improvement guidance is provided by the /audit skill.

## Spec references

Detailed verification criteria, evidence tables, examples:
- Corresponding rule specs: `../../docs/specs/rule-writing.md`, `../../docs/specs/skill-design.md`, `../../docs/specs/agent-design.md`, `../../docs/specs/settings-design.md`, `../../docs/specs/claude-md-design.md`, `../../docs/specs/readme-design.md`, `../../docs/specs/commands-design.md`
- Evidence index: `../../docs/evidence/evidence-registry.md`
