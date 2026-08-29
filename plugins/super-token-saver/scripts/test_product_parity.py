#!/usr/bin/env python3
"""Parity gate for the dual-host product surface.

Adapted from ai-native-cowork's scripts/test_product_parity.py — the house
pattern for a plugin that ships to both Claude Code and Codex. The failure it
exists to prevent: one manifest is bumped and the other is not, so a host
installs a version that does not exist, or a skill is added on one side only.
"""
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_SKILLS = {"s-continue", "s-compact", "usage-view", "report-limit", "setup-statusline", "setup-git-lite"}
# Skills that read or write transcripts on BOTH hosts. The rest are Claude Code
# specific (statusline, dashboards, rate-limit reporting) and stay single-host.
DUAL_HOST_SKILLS = {"s-continue", "s-compact"}

skills = {path.parent.name for path in (ROOT / "skills").glob("*/SKILL.md")}
assert skills == EXPECTED_SKILLS, f"skill parity drift: {skills ^ EXPECTED_SKILLS}"

claude = json.loads((ROOT / ".claude-plugin" / "plugin.json").read_text())
codex = json.loads((ROOT / ".codex-plugin" / "plugin.json").read_text())
legacy = json.loads((ROOT / "manifest.json").read_text())

assert len({claude["name"], codex["name"], legacy["name"]}) == 1, "plugin name differs between manifests"
assert len({claude["version"], codex["version"], legacy["version"]}) == 1, (
    f"version drift: claude={claude['version']} codex={codex['version']} manifest={legacy['version']}"
)
assert codex["skills"] == "./skills/"
assert codex["hooks"] == "./hooks/hooks-codex.json"

# Codex must not load Claude Code's prompt-cache, statusline, or git-context
# contracts. It keeps only the Codex architecture injection and the shared
# post-compaction restore instruction.
codex_hooks_path = ROOT / "hooks" / "hooks-codex.json"
codex_hooks = json.loads(codex_hooks_path.read_text())
expected_codex_hooks = {
    "hooks": {
        "SessionStart": [
            {
                "hooks": [
                    {
                        "type": "command",
                        "command": 'sed "s|__PLUGIN_ROOT__|${CLAUDE_PLUGIN_ROOT}|g" "${CLAUDE_PLUGIN_ROOT}/hooks/session-architecture-codex.md"',
                        "timeout": 5,
                    }
                ]
            },
            {
                "matcher": "compact",
                "hooks": [
                    {
                        "type": "command",
                        "command": '"${CLAUDE_PLUGIN_ROOT}/hooks/s-continue-after-compact.sh"',
                        "timeout": 10,
                    }
                ],
            },
        ]
    }
}
assert codex_hooks == expected_codex_hooks, "Codex hook registry drifted from its host-specific allowlist"
codex_hooks_text = codex_hooks_path.read_text()
for excluded in ("UserPromptSubmit", "cache-expiry-check", "statusline-version-check", "git-context-lite"):
    assert excluded not in codex_hooks_text, f"Claude Code-only hook leaked into Codex: {excluded}"

codex_architecture_path = ROOT / "hooks" / "session-architecture-codex.md"
codex_architecture = codex_architecture_path.read_text()
for excluded in ("claude -p", "SubTask", "Sonnet", "~/.claude", "$10/MTok", "$6.25/MTok", "settings.json"):
    assert excluded not in codex_architecture, f"Claude Code-only architecture leaked into Codex: {excluded}"
for required in ("## Codex Session Architecture", "collaboration agents", "Minimize tool round-trips", "__PLUGIN_ROOT__", "After `/s-continue`"):
    assert required in codex_architecture, f"Codex architecture is missing required guidance: {required}"

# Exercise the exact installed-hook command shape against a cache-like copy.
with tempfile.TemporaryDirectory(prefix="super-token-saver-codex-hook-") as temp_dir:
    installed_root = Path(temp_dir) / "super-token-saver" / codex["version"]
    installed_hooks = installed_root / "hooks"
    installed_hooks.mkdir(parents=True)
    shutil.copy2(codex_architecture_path, installed_hooks / codex_architecture_path.name)
    env = os.environ.copy()
    env["CLAUDE_PLUGIN_ROOT"] = str(installed_root)
    architecture_command = codex_hooks["hooks"]["SessionStart"][0]["hooks"][0]["command"]
    emitted = subprocess.run(architecture_command, shell=True, env=env, text=True, capture_output=True)
    assert emitted.returncode == 0, emitted.stderr
    assert "## Codex Session Architecture" in emitted.stdout
    assert str(installed_root) in emitted.stdout
    (installed_hooks / codex_architecture_path.name).unlink()
    missing = subprocess.run(architecture_command, shell=True, env=env, text=True, capture_output=True)
    assert missing.returncode != 0, "missing Codex architecture document failed silently"

for name in sorted(EXPECTED_SKILLS):
    text = (ROOT / "skills" / name / "SKILL.md").read_text()
    assert text.startswith("---\n"), f"missing frontmatter: {name}"

# A dual-host skill must not hardcode one host's plugin-root variable: Codex
# does not always export CODEX_PLUGIN_ROOT and Claude Code never exports it, so
# a bare ${CLAUDE_PLUGIN_ROOT} in a command silently resolves to nothing.
for name in sorted(DUAL_HOST_SKILLS):
    text = (ROOT / "skills" / name / "SKILL.md").read_text()
    for line in text.splitlines():
        if line.lstrip().startswith("node ") and "PLUGIN_ROOT" in line:
            assert "${PLUGIN_ROOT}" in line, f"{name}: command hardcodes a host plugin root: {line.strip()}"
    assert "codex" in text.lower(), f"{name}: dual-host skill never mentions Codex"

codex_readmes = [ROOT / "README-CODEX.md", ROOT / "README-CODEX.ko.md", ROOT / "README-CODEX.ja.md", ROOT / "README-CODEX.zh-Hans.md"]
required_commands = {
    "codex plugin marketplace add ww-w-ai/marketplace",
    f"codex plugin add {codex['name']}@ww-w-ai",
    "codex plugin marketplace upgrade ww-w-ai",
    "codex plugin list",
}
for readme in codex_readmes:
    assert readme.exists(), f"missing Codex README: {readme.name}"
    missing = required_commands - set(readme.read_text().splitlines())
    assert not missing, f"Codex README command drift in {readme.name}: {sorted(missing)}"

print(
    f"parity passed: {len(EXPECTED_SKILLS)} skills, 3 manifests at {claude['version']}, "
    f"{len(codex_readmes)} Codex READMEs, isolated Codex hooks"
)
