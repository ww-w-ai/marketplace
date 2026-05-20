---
name: devmd-scan
description: Analyze an existing codebase and generate DevMD spec files. Supports single-file or full-project mode. Language-aware discovery with self-verification.
triggers:
  - devmd scan
  - devmd generate
  - reverse document
  - 역문서화
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Agent
  - AskUserQuestion
---

# DevMD Scan

Analyzes an existing codebase and generates DevMD specification files.

## Arguments

```
/devmd-scan                      # Full project scan (auto-detect tier)
/devmd-scan SCHEMA.md            # Single file only
/devmd-scan SCHEMA.md,API.md     # Multiple specific files
/devmd-scan --tier app           # Force tier (starter|app|ai-native|enterprise)
/devmd-scan --overwrite          # Overwrite existing DevMD files (default: preserve)
```

## Phase 0: Project Reconnaissance

Run once before any file generation. Results are shared with all subsequent Agents.

### 0a. Language detection

```bash
if [ -f package.json ]; then LANG="JS/TS"
elif [ -f pyproject.toml ] || [ -f setup.py ] || [ -f requirements.txt ]; then LANG="Python"
elif [ -f go.mod ]; then LANG="Go"
elif [ -f Cargo.toml ]; then LANG="Rust"
elif [ -f pom.xml ] || [ -f build.gradle ] || [ -f build.gradle.kts ]; then LANG="Java/Kotlin"
else LANG="Unknown"; fi
echo "LANG=${LANG}"
```

### 0b. Project scale

```bash
FILE_COUNT=$(find . -type f -not -path '*node_modules*' -not -path '*.git*' -not -path '*vendor*' -not -path '*venv*' -not -path '*__pycache__*' -not -path '*dist*' -not -path '*build*' | wc -l)
echo "FILE_COUNT=${FILE_COUNT}"
```

- **Small** (< 200 files): Read freely, no sampling needed
- **Medium** (200–1,000): Read top-level structure + representative files per directory
- **Large** (1,000+): Directory tree only + targeted Grep/Glob per file type. Read max 3 files per DevMD file generation.

### 0c. Existing docs inventory

```bash
for f in README.md CLAUDE.md AGENTS.md DESIGN.md CHANGELOG.md; do
  [ -f "$f" ] && echo "EXISTS: $f ($(wc -l < "$f") lines)"
done
```

### 0d. Directory structure (depth 2)

```bash
find . -maxdepth 2 -type d -not -path '*node_modules*' -not -path '*.git*' -not -path '*vendor*' | sort
```

### 0e. Tier auto-detection

```
Has AGENTS.md + agent/skill files + LLM env vars?    → AI-Native (21)
  + Has CI/CD + k8s/terraform + ops runbooks?         → Enterprise (25)
Has DB (migrations/ORM) + API (routes) + auth?        → App (16)
Otherwise                                             → Starter (8)
```

### 0f. File selection (filter)

Tier gives a starting list, but not every file is needed for every project. After tier detection, present the full file list with per-file relevance hints and let the user deselect files that don't apply.

**Relevance hints** (auto-detect from recon context):

| Signal | Files to question |
|--------|------------------|
| Internal tool / no public traffic | SEO — likely skip |
| No AI agent orchestration (just LLM API calls) | AGENTS, HARNESS, LIFECYCLE — likely skip |
| Solo dev / small team, no on-call | OPERATIONS — likely skip |
| No CI/CD pipeline yet / simple deploy | DEVOPS — likely skip |
| Greenfield project (no changelog yet) | CHANGELOG — likely skip |
| Background jobs described in FLOWS | RUNTIME — may be redundant |

**Process:**

1. Show the tier's full file list as a table: `| File | Phase | Purpose (one line) | Recommended? |`
2. Mark each file as ✓ Recommended or ? Review based on the signals above.
3. Ask via AskUserQuestion (multiSelect): "Which files should we skip? (deselect = skip)"
4. Store the final selected list. Only these files are generated in subsequent phases.
5. Skipped files are noted in the Post-Scan Summary.

If invoked with specific file names (`/devmd-scan SCHEMA.md,API.md`) or `--all`, skip this step.

### 0g. Compile recon summary

Store as a text block (do NOT write to file). This summary is passed to every Agent prompt in subsequent phases.

```
RECON:
  lang: JS/TS
  scale: Medium (487 files)
  tier: App (16)
  existing_docs: README.md (45 lines), CLAUDE.md (120 lines)
  top_dirs: src/, tests/, prisma/, docker/, .github/
  package_manager: pnpm
  framework: NestJS + React
```

## Phase 1–6: File Generation

Files are grouped into phases by dependency. Within each phase, files are generated in parallel via Agent calls.

**Tier determines which files to generate:**

| Tier | Files |
|------|-------|
| Starter (8) | PRODUCT, DESIGN, UI, SEO, BRAND, CLAUDE, SCREENS, INFRA |
| App (16) | + SCHEMA, API, ERRORS, SECURITY, TESTING, LOGGING, FLOWS, ARCHITECTURE |
| AI-Native (21) | + AGENTS, HARNESS, LIFECYCLE, RUNTIME, CONFIG |
| Enterprise (25) | + DEVOPS, OPERATIONS, CHANGELOG, remaining |

### Phase 1: Foundation (parallel — no dependencies)
- PRODUCT.md
- GLOSSARY.md
- BRAND.md

### Phase 2: Structure (parallel — reads Phase 1 outputs)
- ARCHITECTURE.md
- SCHEMA.md
- API.md
- ERRORS.md
- LOGGING.md

### Phase 3: Interface (parallel — reads Phase 1–2 outputs)
- DESIGN.md
- UI.md
- SCREENS.md
- FLOWS.md
- SEO.md

### Phase 4: Quality (parallel — reads Phase 2–3 outputs)
- TESTING.md
- SECURITY.md

### Phase 5: Operations (parallel — reads Phase 2 outputs)
- INFRA.md
- CONFIG.md
- DEVOPS.md
- OPERATIONS.md
- CHANGELOG.md

### Phase 6: AI & Control (reads Phase 2–5 outputs)
- CLAUDE.md
- AGENTS.md
- HARNESS.md
- RUNTIME.md
- LIFECYCLE.md

## Agent Prompt Template

Every Agent receives this exact structure. Fill in `{variables}` before dispatch.

```
You are generating {FILE_NAME} for an existing codebase.

## Recon
{RECON_SUMMARY from Phase 0}

## Discovery Patterns
Use these patterns to find relevant source files. The project language is {LANG}.

{PATTERNS from skills/common/patterns.md — only the section for this FILE_NAME and detected LANG}

## Steps

1. Run ALL Detect Glob/Grep patterns above (including subsections like "Enum/Value Object Discovery" for SCHEMA.md). List all hits.
2. If hits > 5, pick the 3 largest files per subsection. If hits = 0, report "N/A — no relevant source found" and stop.
3. Read each selected file (use offset/limit for files > 200 lines — read first 100 + last 50).
3a. For SCHEMA.md specifically: MUST read both ORM model files AND domain-layer enum/value-object files. When values differ between layers, use domain layer as authoritative and note the discrepancy.
4. {If Phase 2+}: Read these already-generated DevMD files for cross-reference context:
   {LIST of Phase N-1 output file paths}
5. **MUST read the spec file BEFORE generating.** Read `spec/{FILE_NAME}` from the DevMD plugin directory. This is non-negotiable — generating without reading the spec produces non-compliant output.

6. Generate {FILE_NAME} following the spec:

### Required Frontmatter Fields
{Extracted from spec/{FILE_NAME} — REQUIRED fields only, with types}

### Required Body Sections (in order)
{Extracted from spec/{FILE_NAME} — REQUIRED sections only}

### Optional Body Sections (include if source evidence exists)
{Extracted from spec/{FILE_NAME} — OPTIONAL sections}

6. Include cross-references using @FILE.md#section syntax where relevant.
7. Self-verify:
   a. Every REQUIRED frontmatter field is present and has a value
   b. Every REQUIRED body section exists and has content (not empty)
   c. Every @FILE.md reference points to a file that exists or will be generated in this scan
   If any check fails, fix before outputting.

## Output
Write the file to {OUTPUT_PATH}/{FILE_NAME}.
Do NOT write anything else. No summary, no explanation.
```

## Existing File Policy

- If `{FILE_NAME}` already exists at output path AND `--overwrite` is NOT set:
  - Read the existing file
  - Preserve its content as the base
  - Add missing REQUIRED fields/sections from spec
  - Do NOT remove existing content
  - Add a comment `<!-- DevMD scan: merged {date} -->` at the top
- If `--overwrite` IS set: generate fresh, ignore existing

## Single-File Mode

When invoked as `/devmd-scan SCHEMA.md`:
1. Run Phase 0 (recon) — always needed
2. Skip tier detection — generate only the requested file(s)
3. Skip phase ordering — run immediately (but still read existing DevMD files if present for cross-refs)
4. Run self-verification on the single file

## Post-Scan Spec Compliance Check

After all files are generated, run spec compliance on each:

1. For each generated file, read `spec/{FILE_NAME}` from the DevMD plugin.
2. Validate: REQUIRED frontmatter fields, REQUIRED body sections, cross-references, spec-specific rules.
3. Report compliance table (same format as guide skill).
4. Auto-fix FAIL files: re-read spec, add missing REQUIRED fields/sections without removing content.
5. Re-run until all PASS.

## Post-Scan Summary

After all files pass spec compliance, output exactly:

```
DevMD Scan Complete
  Project: {project name from package.json or directory name}
  Language: {LANG}
  Scale: {Small|Medium|Large} ({FILE_COUNT} files)
  Tier: {tier} ({N} files)
  Generated: {N} files
  Preserved: {N} existing files (use --overwrite to regenerate)
  Skipped: {N} files (no relevant source found)
  Spec compliance: {N}/{N} PASS

Next: run /devmd-gap-analysis to verify against source code
```
