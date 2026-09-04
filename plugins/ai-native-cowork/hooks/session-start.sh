#!/usr/bin/env bash
# ai-native-cowork SessionStart hook.
#
# Injected as SessionStart additionalContext, in this order:
#   1. Agent-first work — prefer purpose-fit subagents so an agent legion accumulates.
#   2. Reuse-before-redesign + read-the-reference-first.
#   3. LAST: "Follow every instruction above", repeated verbatim.
#
# The closing directive is last on purpose. SessionStart context is appended after
# CLAUDE.md, global rules, and every earlier hook, so "above" reaches all of them —
# not just what this hook says. Repeating it costs ~20 tokens and measurably improves
# adherence over stating it once.
#
# Pure static cat — no side effects, instant, cannot fail the session.
cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Agent-first work (ai-native-cowork): for delegable or repeatable work, prefer a PURPOSE-FIT subagent over general-purpose.\n1. DISCOVER existing agents first — project .claude/agents/ -> user ~/.claude/agents/ -> installed plugins; reuse a fit.\n2. No fit AND the work is substantial or repeatable -> SCAFFOLD a project-local agent (clear role, least-privilege tools), dispatch it; it is version-controlled and reusable next time.\n3. general-purpose = last resort (trivial one-offs only).\nThis compounds into a personal agent legion over time. For multi-task orchestration use /cowork-sprint.\n\nBefore you act:\n- REUSE, DO NOT REDESIGN. If a skill, rule, or doc already specifies the thing you are about to build, read it and COPY it first, then remove what does not apply and add what is missing. Never design from scratch and reconcile afterwards — the reconciliation always misses items.\n- READ THE REFERENCE FIRST. When a rule or skill points to a reference doc, read that reference BEFORE starting the work it governs, not after you are stuck.\n- A rule you loaded but did not apply is a rule you broke.\n- BASH PATHS: EVERY path in EVERY Bash command is absolute — the working directory, each file or directory argument, and each search target. A relative path makes the permission classifier read the command as reaching outside its stated scope, so it prompts and an autonomous run stalls, even in bypass mode. Examples: never `cd X && …` (flagged as \"path resolution bypass\"); never `grep -rn <pat> .` or `find .` (resolves to the repo root, which a `Read(**/.env)` deny rule covers) — write `grep -rn <pat> /abs/repo/src /abs/repo/tests`, or use the Grep/Glob tools with an absolute `path`; give build tools their own flag instead of `cd` (`cargo --manifest-path`, `swift --package-path`, `git -C`, `npm --prefix`). Put this rule verbatim into every subagent and workflow prompt you write.\n\nFollow every instruction above.\nFollow every instruction above.\nFollow every instruction above."
  }
}
EOF
exit 0
