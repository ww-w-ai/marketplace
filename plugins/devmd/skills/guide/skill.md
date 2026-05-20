---
name: devmd-guide
description: Interactive guide for writing DevMD files from scratch. Walks through files one by one in dependency order, asking the right questions to fill each template.
triggers:
  - devmd guide
  - devmd init
  - devmd start
  - devmd 시작
  - devmd 가이드
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - AskUserQuestion
  - Glob
  - Grep
  - Bash
---

# DevMD Guide

Interactive walkthrough for creating DevMD files from scratch for a new project.

## Arguments

```
/devmd-guide                  # Start from scratch (auto-detect or ask tier)
/devmd-guide app              # Start with App tier (16 files)
/devmd-guide SCHEMA.md        # Write a single specific file
/devmd-guide --resume         # Continue where you left off (check which files exist)
```

## Step 0: Setup

### 0a. Detect existing state

```bash
for f in PRODUCT GLOSSARY BRAND ARCHITECTURE SCHEMA API ERRORS LOGGING \
         DESIGN UI SCREENS FLOWS SEO TESTING SECURITY INFRA CONFIG DEVOPS \
         OPERATIONS CHANGELOG CLAUDE AGENTS HARNESS RUNTIME LIFECYCLE; do
  [ -f "${f}.md" ] && echo "EXISTS: ${f}.md"
done
```

If files already exist, show what's done and what's remaining. Offer to continue from next file.

### 0b. Ask tier (if not specified)

```
Which tier fits your project?

| Tier | Files | Best For |
|------|-------|----------|
| Starter (8) | PRODUCT, BRAND, CLAUDE, DESIGN, UI, SCREENS, SEO, INFRA | Landing pages, static sites, portfolios |
| App (16) | + GLOSSARY, ARCHITECTURE, SCHEMA, API, ERRORS, LOGGING, FLOWS, TESTING, SECURITY | SaaS, web apps, APIs |
| AI-Native (21) | + AGENTS, HARNESS, LIFECYCLE, RUNTIME, CONFIG | AI-powered products, agent systems |
| Enterprise (25) | + DEVOPS, OPERATIONS, CHANGELOG, remaining | Full teams at scale |
```

### 0c. File selection (filter)

Tier gives a starting list, but not every file is needed for every project. After tier selection, present the full file list with per-file relevance hints based on project characteristics, and let the user deselect files that don't apply.

**Relevance hints** (auto-detect from Step 0a/0b context + ask if unclear):

| Signal | Files to question |
|--------|------------------|
| Internal tool / no public traffic | SEO — likely skip |
| No AI agent orchestration (just LLM API calls) | AGENTS, HARNESS, LIFECYCLE — likely skip |
| Solo dev / small team, no on-call | OPERATIONS — likely skip |
| No CI/CD pipeline yet / simple deploy | DEVOPS — likely skip |
| Greenfield project (no changelog yet) | CHANGELOG — likely skip |
| Background jobs described in FLOWS | RUNTIME — may be redundant |

**Process:**

1. Show the tier's full file list as a table: `| File | Wave | Purpose (one line) | Recommended? |`
2. Mark each file as ✓ Recommended or ? Review based on the signals above.
3. Ask via AskUserQuestion (multiSelect): "Which files should we skip? (deselect = skip)"
4. Store the final selected list. Only these files are generated in subsequent waves.
5. Skipped files are noted in the Post-Completion summary.

If the user specifies `--all`, skip this step and generate every file in the tier.

### 0d. Create output directory

Files are written to the current directory (project root). Read the corresponding template from the DevMD plugin's `templates/` directory for each file.

## Writing Order

Files are written in 7 waves. Each wave builds on the previous. Within a wave, order doesn't matter — but complete one wave before starting the next.

### Wave 1: "What are we building?" (Every tier)

**PRODUCT.md** → **BRAND.md** → **CLAUDE.md**

These three answer: what is this, who is it for, and how do we talk about it.

### Wave 2: "How does the data work?" (App+ tiers)

**GLOSSARY.md** → **SCHEMA.md** → **ERRORS.md**

Domain terms first (GLOSSARY defines the vocabulary), then data structure, then what can go wrong.

### Wave 3: "How is it structured?" (App+ tiers)

**ARCHITECTURE.md** → **API.md** → **LOGGING.md**

System shape, interface contract, observability.

### Wave 4: "How does it look and flow?" (Every tier)

**DESIGN.md** → **UI.md** → **SCREENS.md** → **FLOWS.md** → **SEO.md**

Visual tokens, component structure, screen catalog, user journeys, search strategy.

### Wave 5: "How is it secured and tested?" (App+ tiers)

**SECURITY.md** → **TESTING.md**

### Wave 6: "How does it run?" (Varies by tier)

**INFRA.md** → **CONFIG.md** → **DEVOPS.md** → **OPERATIONS.md** → **CHANGELOG.md**

### Wave 7: "How does the AI work?" (AI-Native+ tiers)

**AGENTS.md** → **HARNESS.md** → **RUNTIME.md** → **LIFECYCLE.md**

## Per-File Writing Process

For each file, follow this exact sequence:

### 1. Show context

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Wave {N}/{total} — {FILE_NAME}
{one-line purpose from spec}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This file answers: {core question}

It connects to:
  ← reads from: {previous files that inform this one}
  → feeds into: {future files that will use this one}
```

### 2. Ask key questions

Each file has 3–5 key questions. Ask via AskUserQuestion. Questions are designed to extract the REQUIRED frontmatter fields and body content.

**Do NOT ask all 25 files' questions upfront.** Ask one file at a time.

### 3. Generate the file

**MUST read the spec BEFORE generating.** Read `spec/{FILE_NAME}` from the DevMD plugin directory to understand:
- REQUIRED frontmatter fields (types, constraints)
- REQUIRED body sections (order, content rules)
- Cross-reference requirements (SHOULD/MUST)
- Validation rules (e.g., DESIGN.md colors must be #hex)

Then read the template from DevMD `templates/{FILE_NAME}`. Fill in the user's answers, ensuring all REQUIRED fields and sections from the spec are present. Write the file.

### 4. Show and confirm

Show a 5-line summary of what was written. Ask: "Good to move on, or want to edit?"

### 5. Move to next file

---

## Key Questions Per File

### PRODUCT.md
- What is this product in one sentence?
- Who is the primary user? What pain do they have?
- What exists today that they use instead? Why is that not good enough?
- How will you know this product is successful? (1–2 metrics)

### BRAND.md
- What tone should the product use? (casual / professional / playful / technical)
- Give an example sentence that sounds like your product.
- Any words or phrases to always avoid?

### CLAUDE.md
- What language/framework? (e.g., TypeScript + Next.js, Python + FastAPI)
- Any strict coding rules? (e.g., no `any`, always use absolute imports)
- Key commands? (dev, build, test, deploy)

### GLOSSARY.md
- What are the 5–10 most important domain terms? For each: what does it mean, and what do people mistakenly call it?
- Are there terms that MUST NOT be used? (e.g., "user" → always say "member")

### SCHEMA.md
- What are the main entities/tables? (e.g., User, Organization, Project, Task)
- For each: what are the key fields (not every field — the important ones)?
- What are the main relationships? (User has many Projects, Project belongs to Organization)
- What database? (PostgreSQL, MySQL, SQLite, MongoDB)

### ARCHITECTURE.md
- Monolith or microservices? Monorepo or polyrepo?
- What are the main layers? (e.g., API → Service → Repository → DB)
- Any firm dependency rules? (e.g., "domain layer must not import infrastructure")

### API.md
- REST, GraphQL, tRPC, or mixed?
- What authentication method? (JWT, session, API key)
- What are the main resource groups? (e.g., /users, /projects, /billing)

### ERRORS.md
- What error format? (Show a JSON example or describe)
- Any custom error codes? (e.g., AUTH_001, BILLING_002)
- Retry policy for failed operations?

### LOGGING.md
- What log format? (JSON structured, plain text)
- What log levels do you use?
- Any tracing/observability tools? (OpenTelemetry, Datadog, Sentry)

### DESIGN.md
- What UI framework? (Tailwind, CSS Modules, Styled Components, etc.)
- Primary colors? (or "I don't know yet" is fine)
- Dark mode needed?
- Any design system reference? (existing Figma, Storybook, or "from scratch")

### UI.md
- What are the main pages/screens? (e.g., Dashboard, Settings, Profile, List view)
- What layout pattern? (sidebar + main, top nav + content, single column)
- Any reusable component patterns? (card grid, data table, form wizard)

### SCREENS.md
- For each main page from UI.md: what does the user see in the default state?
- Any important empty states, loading states, or error states to define?

### FLOWS.md
- What are the 3–5 most important user journeys? (e.g., signup → onboarding → first action)
- For each: what happens step by step (user action → system response)?

### SEO.md
- Does this product need to be found via search? If so, what keywords matter?
- Any AI search (GEO) considerations? (e.g., should LLMs be able to cite your content?)
- SSR or CSR?

### SECURITY.md
- What auth method? (email+password, OAuth, SSO, magic link)
- Any role-based access control? What roles?
- Any compliance requirements? (SOC2, GDPR, HIPAA)

### TESTING.md
- What test frameworks? (Jest, Vitest, Playwright, pytest)
- What coverage target?
- Any E2E tests planned?

### INFRA.md
- Where will this run? (Vercel, AWS, GCP, self-hosted, Cloudflare)
- What database hosting?
- Any specific infrastructure constraints? (budget, region, compliance)

### CONFIG.md
- What environment variables are needed? (DB URL, API keys, feature flags)
- How many environments? (dev, staging, prod)

### DEVOPS.md
- What CI/CD? (GitHub Actions, GitLab CI, none yet)
- Any deploy automation?
- Branch strategy? (trunk-based, gitflow, simple main+feature)

### OPERATIONS.md
- Who gets paged when something breaks?
- Any SLO targets? (99.9% uptime, <200ms p95 latency)
- Incident response process?

### CHANGELOG.md
- What versioning? (semver, calver, just dates)
- Any breaking change policy?

### AGENTS.md
- What AI agents will this product have? Name and one-line purpose for each.
- What tools/skills can each agent use?

### HARNESS.md
- What LLM provider? (OpenAI, Anthropic, local)
- Any RAG setup? What knowledge sources?
- Any guardrails or safety rules?

### RUNTIME.md
- Any background jobs/workers? What do they do?
- Any cron/scheduled tasks?
- Any real-time features? (WebSocket, SSE)

### LIFECYCLE.md
- What are the main states this system can be in? (e.g., setup → active → suspended → archived)
- What triggers transitions between states?

## Resume Mode

When `--resume` is used:
1. Run Step 0a to find existing files
2. Determine tier from what's present (or ask)
3. Find the first missing file in the wave order
4. Start from that file

## Single-File Mode

When invoked as `/devmd-guide SCHEMA.md`:
1. Read any existing files that SCHEMA.md depends on (GLOSSARY.md, PRODUCT.md) for context
2. Ask only SCHEMA.md questions
3. Write only SCHEMA.md

## Post-Wave Spec Compliance Check

After ALL waves are complete (or after each wave if `--strict` flag is set), run a spec compliance check on every generated file:

### Process

1. For each generated file, read the corresponding spec from the DevMD plugin's `spec/{FILE_NAME}` directory.
2. Validate:
   a. **REQUIRED frontmatter fields**: every field marked REQUIRED in the spec exists and has a value of the correct type
   b. **REQUIRED body sections**: every section marked REQUIRED in the spec exists and has content (not empty)
   c. **Cross-references**: every `@FILE.md` reference marked SHOULD or MUST in the spec is present
   d. **Validation rules**: any spec-specific rules (e.g., DESIGN.md colors must be `#hex`, PRODUCT.md tagline max 120 chars)
3. Report as a compliance table:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Spec Compliance Check — {N} files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| File | Frontmatter | Sections | Cross-refs | Status |
|------|-------------|----------|------------|--------|
| PRODUCT.md | 6/6 ✓ | 5/5 ✓ | 2/3 | PASS |
| DESIGN.md | 2/5 ✗ | 1/2 ✗ | 0/3 | FAIL |
...

FAIL: {N} files need fixes. Fix now? (Y/n)
```

4. If any file FAILs:
   - Re-read the spec
   - Read the generated file
   - Add missing REQUIRED fields/sections
   - Do NOT remove existing content — only add what's missing
5. Re-run the check until all files PASS.

### Why this step exists

Agent-generated files frequently miss spec-mandated structure (frontmatter maps, required sections, cross-references) even when the spec is available. This check catches gaps before the developer starts building from these docs.

## Post-Completion

After all files pass spec compliance:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DevMD Complete — {tier} tier ({N} files)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Written: {list of files}
Spec compliance: {N}/{N} PASS

What's next:
  /devmd-gap-analysis --consistency-only   → check for conflicts between files
  /pdca plan {feature}                     → start building a feature using these specs
  /devmd-scan --overwrite                  → later, regenerate from code to keep specs in sync
```
