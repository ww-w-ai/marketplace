#!/usr/bin/env bash
# ai-native-cowork SessionStart hook.
# Nudge the session to prefer purpose-fit agents over general-purpose, so a personal
# agent legion accumulates over time. Output is injected as SessionStart additionalContext.
# Pure static cat — no side effects, instant, cannot fail the session.
cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Agent-first work (ai-native-cowork): for delegable or repeatable work, prefer a PURPOSE-FIT subagent over general-purpose.\n1. DISCOVER existing agents first — project .claude/agents/ -> user ~/.claude/agents/ -> installed plugins; reuse a fit.\n2. No fit AND the work is substantial or repeatable -> SCAFFOLD a project-local agent (clear role, least-privilege tools), dispatch it; it is version-controlled and reusable next time.\n3. general-purpose = last resort (trivial one-offs only).\nThis compounds into a personal agent legion over time. For multi-task orchestration use /cowork-sprint."
  }
}
EOF
exit 0
