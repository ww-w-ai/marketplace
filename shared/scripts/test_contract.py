#!/usr/bin/env python3
"""Focused parity checks for the shared cowork method and host seams."""

from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[2]
SHARED = ROOT / "shared" / "references" / "cowork-method.md"
CLAUDE = ROOT / "shared" / "references" / "runtime-claude-code.md"
CODEX = ROOT / "shared" / "references" / "runtime-codex.md"
ENTRYPOINTS = (ROOT / "skills" / "cowork-sprint" / "SKILL.md", ROOT / "skills" / "pdca-wf" / "SKILL.md")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    shared = SHARED.read_text(encoding="utf-8")
    claude = CLAUDE.read_text(encoding="utf-8")
    codex = CODEX.read_text(encoding="utf-8")

    forbidden_shared_tools = (
        "TodoWrite",
        "Workflow",
        "update_plan",
        "collaboration agents",
        "CLAUDE.md",
        "AGENTS.md",
    )
    for tool in forbidden_shared_tools:
        require(tool not in shared, f"shared method contains host mechanism: {tool}")

    required_role_parts = ("Base role", "Sprint role delta", "Evidence contract", "Explicit exclusions")
    for part in required_role_parts:
        require(shared.count(part) == 1, f"dynamic-role part must appear once: {part}")

    require("0..3" in shared and "4..6" in shared and "7..10" in shared, "risk thresholds missing")
    require("never waives core gates" in shared, "risk non-waiver missing")
    require("always require explicit user approval" in shared, "safety non-waiver missing")

    shared_sections = set(re.findall(r"^## (.+)$", shared, flags=re.MULTILINE))
    for host_path, host_text in ((CLAUDE, claude), (CODEX, codex)):
        require("cowork-method.md" in host_text, f"{host_path.name} does not consume shared method")
        host_sections = set(re.findall(r"^## (.+)$", host_text, flags=re.MULTILINE))
        require(not shared_sections.intersection(host_sections), f"{host_path.name} redefines shared sections")

    for entrypoint in ENTRYPOINTS:
        text = entrypoint.read_text(encoding="utf-8")
        require("../../shared/references/cowork-method.md" in text, f"{entrypoint} lacks shared contract link")
        require("runtime-claude-code.md" in text and "runtime-codex.md" in text, f"{entrypoint} lacks runtime links")
        normalized = " ".join(text.replace("*", "").split())
        require("what is here that no WorkList item asked for?" in normalized, f"{entrypoint} lost QA diff question")
        require("not a separate agent or review phase" in text, f"{entrypoint} makes TRIM a separate gate")
        require("TRIM pass" not in text and "Trim pass" not in text, f"{entrypoint} retains mandatory TRIM pass")

    print("shared cowork contract checks passed")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print(f"contract check failed: {error}", file=sys.stderr)
        raise SystemExit(1)
