---
name: validate-git
description: Validates Git branch naming, commit messages, and protection rule compliance
triggers:
  - validate git
  - check git
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
---

# validate-git -- Git Rule Compliance Validation

Corresponding rule: `docs/specs/git.md`

## Bash permission rationale

Requires read-only git commands such as `git branch` and `git log`. Only queries Git history; no modification commands are executed.

## Input

- Current Git repository (auto-detected)
- No additional input required

## Execution logic

1. **Check current branch** (`git branch --show-current`)
   - Warn if working on a protected branch (main, master, develop)
   - Protected branch list: `main`, `master`, `develop`

2. **Validate branch naming**
   - Allowed prefixes: `feature/`, `fix/`, `hotfix/`, `refactor/`, `chore/`, `docs/`
   - Warn on branches without a prefix (protected branches excluded)

3. **Validate the last 5 commit messages** (`git log -5 --format="%s"`)
   - Match Conventional Commits `{type}({scope}): {subject}` format
   - Allowed types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`
   - `{type}: {subject}` form without scope is accepted (with warning)

4. **Check for committed secret files** (`git log --all --diff-filter=A --name-only`)
   - Detection patterns: `.env`, `.env.*`, `credentials*`, `*.pem`, `*.key`, `secrets*`
   - On detection, verdict is FAIL

### Mandatory output: Git verification matrix

Output the following matrix before generating the final report. Do not proceed until every item has been checked.

| Item | Status | Result | Detail | Evidence |
|------|:------:|:------:|--------|----------|
| Current branch | ? | PASS/WARN | branch name | {Bash: git branch} |
| Branch naming | ? | PASS/WARN | prefix check | {Bash: git branch -a} |
| Commit 1 | ? | PASS/WARN/FAIL | message | {Bash: git log -5} |
| Commit 2 | ? | PASS/WARN/FAIL | message | |
| Commit 3 | ? | PASS/WARN/FAIL | message | |
| Commit 4 | ? | PASS/WARN/FAIL | message | |
| Commit 5 | ? | PASS/WARN/FAIL | message | |
| Secret files | ? | PASS/FAIL | detection result | {Bash: git log --diff-filter=A} |

Status values: PASS (verified clean), NOT_APPLICABLE (not a git repository), SKIPPED (git not used), SHALLOW (partial check)

### Pre-output checklist (required before final output)

Verify every item before drafting the report. If any item is unchecked, go back and complete it.

- [ ] Every item has a Status value assigned (no empty Status cells)
- [ ] Every item whose Status != SKIPPED has an Evidence value
- [ ] All four steps of the execution logic were performed
- [ ] Every WARN/FAIL item includes a specific detail
- [ ] Report language matches the user's conversation language

### Schema compliance check (required before persisting to .ww-w-ai/standards/)

Verify the JSON output before writing to `.ww-w-ai/standards/validate-git/`:
- [ ] All "required" fields in schema.json are present and non-empty
- [ ] findings[] array includes every detected item
- [ ] summary aggregates match the actual number of findings

## Output

Produce the validation report in the user's conversation language.

Output the validation results in the following format:

```
Git Rule Compliance Report
==================================================

| Item | Status | Detail |
|------|:------:|--------|
| Current branch | PASS | feature/user-auth |
| Branch prefix | PASS | feature/ prefix confirmed |
| Commit message 1 | PASS | feat(auth): add token renewal logic |
| Commit message 2 | WARN | fix: bug fix -- scope missing |
| Commit message 3 | FAIL | fixed stuff -- does not follow Conventional Commits |
| Secret files | PASS | no secret files detected |

--------------------------------------------------
Total: 4/6 passed | 1 warning | 1 failure
```

## Output persistence

After generating the Git validation report, persist results to `.ww-w-ai/standards/validate-git/`:

1. Create the `.ww-w-ai/standards/validate-git/` directory if it does not exist
2. Write `latest.json` -- structured result following `templates/schema.json`
3. Write `latest.md` -- human-readable report following `templates/report.template.md`
4. Archive to `history/` -- copy latest.json to `.ww-w-ai/standards/validate-git/history/{timestamp}.json`

`latest.md` is produced in the user's conversation language. JSON field names remain in English regardless of language.
The JSON output enables machine-parseable history tracking and cross-run comparison.
The history/ directory preserves prior runs for trend analysis.

## Permission rationale

- **Write**: restricted to `.ww-w-ai/standards/` output persistence. No modification of project source.
- **Bash**: restricted to read-only git/system queries. No file modification.

## Notes

- This skill is read-only. It only queries Git history and does not execute modifying commands such as branch creation/deletion, commit, or push.
- Warnings about working on a protected branch do not force a checkout. The decision is left to the user.
- Secret file detection is filename-pattern based; content-based secret detection is not performed.

## Spec references

Detailed verification criteria, evidence tables, examples:
- Corresponding rule spec: `../../docs/specs/git.md`
- Evidence index: `../../docs/evidence/evidence-registry.md`
