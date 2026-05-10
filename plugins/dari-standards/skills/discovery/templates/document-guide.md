# Master Plan Document Structure

> Defines the structure of the master plan document produced in Phase 6,
> its required/tracking sections, the research file naming convention,
> and the operation of the draft directory.

## Required sections (5 + roadmap)

### 1. Executive Summary

A one-page summary of the entire project.

Include:
- **Project name** and one-line description
- **Problem being solved** (2-3 sentences)
- **Target user** (core persona)
- **Core value proposition** (differentiation vs. competitors)
- **Timeline** (M1, M2, M3 milestones)
- **Estimated cost** (total investment size)
- **Go/No-Go judgment** (consolidated C-Suite opinion)

```markdown
# Summary

## [Project name]
[one-line description]

### Problem
[state the problem to solve in 2-3 sentences]

### Target user
[core persona -- who, in what situation, what problem]

### Value proposition
[differentiation vs. competitors -- "previously [X], but we offer [Y]"]

### Timeline and cost
| Milestone | Duration | Estimated cost |
|-----------|----------|----------------|
| M1: MVP | N weeks | $/amount |
| M2: Beta | N weeks | $/amount |
| M3: Launch | N weeks | $/amount |

### Overall judgment
[Go/Conditional Go/No-Go] -- [one-line rationale]
```

### 2. Discovery log

Record the Phase 0-2 research process and key findings.

Include:
- Research date
- Core insights per category (3 each)
- Validated hypotheses vs. unvalidated hypotheses
- Surprising findings
- Skipped categories and reasons

```markdown
# Discovery log

## Research overview
- Date: YYYY-MM-DD
- Total searches: N
- Sources referenced: N (S-tier: N, A-tier: N, B-tier: N)

## Core insights per category

### 1. User/problem
1. [insight] -- source: [source name, tier]
2. ...
3. ...

### 2. Market
...

## Surprising findings
- [unexpected finding 1]
- [unexpected finding 2]

## Skipped categories
- [category name]: [reason for skipping]
```

### 3. C-Suite analysis

Consolidate the 10-perspective analysis results from Phase 3.

Include:
- Per-perspective summary (c-suite-analysis.md output format)
- Consolidated matrix (support/concern/conditional)
- Conflict records and resolution outcomes
- Final consensus

```markdown
# C-Suite analysis consolidated

## Consolidated matrix

| Perspective | Judgment | Core opinion |
|-------------|:--------:|--------------|
| CEO | Support | [one sentence] |
| CFO | Conditional | [one sentence + condition] |
| ... | ... | ... |

## Conflict resolution records
[recorded per the conflict protocol]

## Final consensus
[overall judgment and rationale]
```

### 4. Sub-plan map

Structure the scope-breakdown results from Phase 5.

Include:
- Feature priorities (MoSCoW)
- Features placed per milestone
- Inter-feature dependencies
- Areas that can be parallelized

```markdown
# Sub-plan map

## Feature priorities

### Must-have (M1)
1. [Feature A] -- estimated effort: N days
2. [Feature B] -- estimated effort: N days

### Should-have (M2)
1. [Feature C] -- estimated effort: N days

### Could-have (M3+)
1. [Feature D] -- estimated effort: N days

### Won't-have (out of scope for this project)
1. [Feature E] -- reason: [YAGNI rationale]

## Dependencies

```
[Feature A] -> [Feature B] -> [Feature C]
                           \-> [Feature D] (parallelizable)
```

## Milestone timeline

| Milestone | Duration | Features | Verification criteria |
|-----------|----------|----------|-----------------------|
| M1 | W1-W4 | A, B | [criteria] |
| M2 | W5-W8 | C, D | [criteria] |
```

### 5. Deliverables list

List every deliverable the project produces.

Include:
- Technical deliverables (code, infrastructure, API)
- Documentation deliverables (design docs, API docs, user guides)
- Design deliverables (wireframes, prototypes, design system)
- Operations deliverables (monitoring dashboards, alert configuration, deployment pipelines)

```markdown
# Deliverables list

| # | Deliverable | Type | Owner | Milestone | Status |
|---|-------------|------|-------|-----------|:------:|
| 1 | REST API server | Technical | Backend | M1 | Planned |
| 2 | Frontend SPA | Technical | Frontend | M1 | Planned |
| 3 | API documentation | Docs | Backend | M1 | Planned |
| 4 | Deployment pipeline | Ops | DevOps | M1 | Planned |
```

## Tracking sections (2, included in 00-master-plan.md)

### Change log

Tracks document change history.

```markdown
# Change log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| YYYY-MM-DD | 1.0 | Initial draft | [name] |
| YYYY-MM-DD | 1.1 | C-Suite conflict resolution reflected | [name] |
```

### Assumptions register

Tracks every assumption and manages its validation status.

```markdown
# Assumptions register

| ID | Assumption | Confidence | Impact | Validation method | Validation point | Status |
|----|------------|:----------:|:------:|-------------------|------------------|:------:|
| A1 | [assumption] | Low | High | [method] | M1 | Unvalidated |
| A2 | [assumption] | Medium | Medium | [method] | M1 | Validated |
| A3 | [assumption] | High | Low | [method] | M2 | Unvalidated |
```

Priority matrix:
```
              High impact     Low impact
Low confidence   Validate now   Validate in M2
High confidence  Monitor        Can be ignored
```

## docs/00-discovery/ directory structure

### Principle: master plan (table of contents) + detailed chapters + evidence

```
docs/00-discovery/
├── 00-master-plan.md       <- consolidated summary + roadmap (read this alone to grasp the whole)
├── 01~05-*.md              <- detailed chapters (when details are needed)
└── research/               <- evidence. Never delete.
```

- **00-master-plan.md**: summary + roadmap (Alpha -> Beta -> MVP -> Release) + core summary of each chapter (01-05) + links
- **01-05**: detailed content of each Phase. Chapters separated when the master plan grows long
- **research/**: raw research per category and depth, individual C-Suite raw outputs -- **evidence, so never delete**

### docs/00-discovery/ root (6 files)

| File | Content | Notes |
|------|---------|-------|
| `00-master-plan.md` | consolidated summary + roadmap (Alpha -> Beta -> MVP -> Release) + 01-05 links | **main document** |
| `01-idea.md` | idea structuring (problem/target/value/scope) | Phase 1 |
| `02-research.md` | core insights from 8 categories consolidated | Phase 2 (consolidates research/ raw) |
| `03-csuite-analysis.md` | 10-perspective consolidated analysis | Phase 3 (consolidates research/ individual raw) |
| `04-solution-yagni.md` | YAGNI filtering results (MoSCoW classification) | Phase 4 |
| `05-sub-plan-map.md` | **full project scope** -- defines domain-level scope of sub-plans | Phase 5 |

**05-sub-plan-map.md** defines the "full project scope."
The **detailed spec** of each sub-plan is authored separately in the PDCA Plan (`docs/01-plan/features/*.plan.md`), not in discovery.

```
05-sub-plan-map.md (discovery)         -> "Which domains exist, and what is each domain's scope?"
    |
docs/01-plan/features/*.plan.md (PDCA) -> "Concretely, how do we build that domain?"
```

**00-master-plan.md structure**:
```markdown
# {Project name} Master Plan

## Summary
[grasp the project at a glance -- problem/target/value/Go/No-Go]

## Roadmap (~ v1.0)

Plan through the v1.0 release. Adjust versions and stages to fit the project.

| Version | Stage | Goal | Core features |
|---------|-------|------|---------------|
| v0.1 | Alpha | [goal] | [core features] |
| v0.x | Alpha | [goal] | [core features] |
| v0.x | Beta | [goal] | [core features] |
| v0.x | MVP | [goal] | [core features] |
| v1.0 | Release | [goal] | [core features] |

> **Post v1.0**: propose directions based on expansion possibilities discovered in research (Phase 2).
> Actual scope is decided by the user based on market response, pricing strategy, and business conditions.

## 1. Idea -> [details](01-idea.md)
[3-line core summary]

## 2. Research -> [details](02-research.md)
[one-line insight per category]

## 3. C-Suite analysis -> [details](03-csuite-analysis.md)
[consolidated matrix + conflict resolution]

## 4. YAGNI review -> [details](04-solution-yagni.md)
[Must/Should/Could/Won't summary]

## 5. Sub-plan map -> [details](05-sub-plan-map.md)
[N domains, M total items -- sub-plan details in PDCA Plan]

## Assumptions register
[assumptions requiring validation -- confidence x impact matrix]

## Change log
[document change history]
```

### research/ (evidence repository)

**Never delete. Every claim in the master plan and detailed chapters relies on these files as evidence.**

```
docs/00-discovery/research/
|
|  -- Phase 0: Context scan --
|
├── context.md                       <- project context (tech stack, structure, existing documentation)
|
|  -- Phase 2: per-category x per-depth research (up to 24 files) --
|
├── 01-user-problem-depth1.md        <- broad search
├── 01-user-problem-depth2.md        <- deep search
├── 01-user-problem-depth3.md        <- verification search
├── 02-market-depth1.md
├── 02-market-depth2.md
├── 02-market-depth3.md
├── 03-competition-depth1.md
├── ...
├── 08-legal-regulation-depth3.md
|
|  -- Phase 3: C-Suite individual analysis raw (10 files) --
|
├── csuite-raw-ceo.md
├── csuite-raw-cfo.md
├── csuite-raw-cto.md
├── csuite-raw-cmo.md
├── csuite-raw-coo.md
├── csuite-raw-cro.md
├── csuite-raw-cpo.md
├── csuite-raw-clo.md
├── csuite-raw-chro.md
├── csuite-raw-cso.md
|
|  -- Other work records --
|
├── search-log.md                    <- search keyword/result log
└── brainstorm-notes.md              <- idea notes
```

### Research file naming (within research/)

```
{NN}-{category}-depth{N}.md
```

| Field | Description | Example |
|-------|-------------|---------|
| NN | category number (01-08) | 01, 02, ... |
| category | English category slug | user-problem, market |
| depth | research depth (1=broad, 2=deep, 3=verification) | 1, 2, 3 |

### Standard category slugs

| Number | Category | Slug |
|:------:|----------|------|
| 01 | User/problem | user-problem |
| 02 | Market | market |
| 03 | Competition | competition |
| 04 | Solution | solution |
| 05 | Technology | technology |
| 06 | Content/data | content-data |
| 07 | Business model | business-model |
| 08 | Legal/regulation | legal-regulation |

### research/ rules

1. **Never delete** -- every master plan claim uses research/ files as evidence
2. Not in .gitignore -- the research process is also under version control
3. No date prefix needed -- track via Git history
4. When the master plan references research/, use a relative path: `[source](research/01-user-problem-depth2.md)`
5. Even early-terminated categories must have depth1 present -- record "terminated with sufficient information"

### Full structure example

```
docs/00-discovery/
├── 00-master-plan.md                    <- consolidated summary + roadmap (main)
├── 01-idea.md                           <- idea structuring
├── 02-research.md                       <- research consolidation
├── 03-csuite-analysis.md                <- C-Suite consolidation
├── 04-solution-yagni.md                 <- YAGNI filtering
├── 05-sub-plan-map.md                   <- full project scope (sub-plan map)
└── research/                            <- evidence. Never delete.
    ├── context.md                       <- Phase 0 context
    ├── 01-user-problem-depth1.md
    ├── 01-user-problem-depth2.md
    ├── 01-user-problem-depth3.md
    ├── 02-market-depth1~3.md
    ├── ...                              <- 8 categories x 3 depths
    ├── 08-legal-regulation-depth3.md
    ├── csuite-raw-ceo.md
    ├── ...                              <- 10 perspectives
    ├── csuite-raw-cso.md
    ├── search-log.md
    └── brainstorm-notes.md
```
