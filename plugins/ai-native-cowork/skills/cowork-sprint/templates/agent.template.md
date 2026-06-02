---
# REQUIRED. kebab-case, unique across all agents. This is how the agent is invoked.
name: {{AGENT_NAME}}

# REQUIRED — the single highest-leverage field. Claude reads THIS to decide delegation.
# Formula: "<specialty>. Use when <trigger conditions>.<PROACTIVE cue if wanted>"
#   - Lead with what it is expert at, then concrete when-to-use triggers.
#   - Add "Use PROACTIVELY for ..." / "Use immediately after ..." ONLY to make it
#     auto-fire without being asked. Omit for explicit-only agents.
#   - Optional: 2-4 <example> blocks sharpen triggering (contains-studio pattern):
#       <example>Context: {{SITUATION}}
#       user: "{{USER_REQUEST}}"
#       assistant: "{{HOW_THIS_AGENT_HELPS}}"
#       <commentary>{{WHY_THIS_AGENT_FITS}}</commentary></example>
description: {{ONE_LINE_SPECIALTY}}. Use when {{TRIGGER_CONDITIONS}}.{{OPTIONAL_PROACTIVE_CUE}}

# OPTIONAL but RECOMMENDED — least-privilege allowlist. Omit to inherit ALL tools.
#   read-only / review / analysis : Read, Grep, Glob          (+ WebFetch, WebSearch to research)
#   editor / builder / fixer      : Read, Write, Edit, Bash, Glob, Grep
# Delete this line entirely only if the agent genuinely needs every tool.
tools: {{COMMA_SEPARATED_TOOLS}}

# OPTIONAL. haiku = cheap/fast lookups · sonnet = default work · opus = hard reasoning
# · inherit = match the main session. Defaults to "inherit" when omitted.
model: {{haiku|sonnet|opus|inherit}}

# OPTIONAL. task-list display color: red|blue|green|yellow|purple|orange|pink|cyan
# color: {{COLOR}}

# OPTIONAL. cross-session learning store: user | project | local
# memory: project
---

<!-- HARD CAP: keep this body (everything below) ≤ 1500 words. On later refinement, COMPACT existing
     lines to make room — never just append. If you can't fit the real responsibilities under the cap,
     SPLIT into two focused agents. Check: awk 'f{print} /^---$/{c++} c==2{f=1}' <file> | wc -w -->

You are {{ROLE}}, specializing in {{DOMAIN_EXPERTISE}}.

## When invoked
<!-- Numbered first steps so the agent orients itself immediately. Keep concrete. -->
1. {{FIRST_STEP — gather the relevant context / inputs}}
2. {{SECOND_STEP}}
3. {{BEGIN_THE_CORE_WORK}}

## Core responsibilities
<!-- 5-8 focused duties. Quality over breadth. One agent = one job. -->
- {{RESPONSIBILITY_1}}
- {{RESPONSIBILITY_2}}
- {{RESPONSIBILITY_3}}

## Approach & standards
<!-- Methodology, principles, quality bar this agent always applies.
     For heavy domain knowledge, prefer the `skills:` frontmatter field over pasting reference text. -->
- {{PRINCIPLE_OR_BEST_PRACTICE_1}}
- {{PRINCIPLE_OR_BEST_PRACTICE_2}}
- {{CHECKLIST_ITEM_OR_QUALITY_CRITERION}}

## Process
<!-- Ordered phases for multi-step work. DELETE this section for simple single-shot agents. -->
1. **{{PHASE_1_ANALYZE}}** — {{WHAT_HAPPENS}}
2. **{{PHASE_2_EXECUTE}}** — {{WHAT_HAPPENS}}
3. **{{PHASE_3_VERIFY}}** — {{WHAT_HAPPENS}}

## Output format
<!-- CRITICAL: the parent (Leader) only sees the RETURNED summary. Specify exactly what to return. -->
Return:
- {{REQUIRED_OUTPUT_1 — e.g. findings grouped by priority: Critical / Warning / Suggestion}}
- {{REQUIRED_OUTPUT_2 — e.g. concrete examples / exact file paths}}
- {{REQUIRED_OUTPUT_3 — e.g. recommended next steps}}

## Constraints
<!-- What this agent must NOT do. Reinforce least-privilege and scope boundaries. -->
- {{CONSTRAINT_1 — e.g. report only, do not modify files}}
- {{CONSTRAINT_2 — stay in scope; defer unrelated work}}
- {{GUIDING_PRINCIPLE — e.g. fix root causes, not symptoms}}
