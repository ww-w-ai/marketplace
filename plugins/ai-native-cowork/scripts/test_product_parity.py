#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {"cowork-commit", "cowork-doc-init", "cowork-doc-sync", "cowork-insights", "cowork-sprint", "pdca-wf"}

skills = {path.parent.name for path in (ROOT / "skills").glob("*/SKILL.md")}
assert skills == EXPECTED, f"skill parity drift: {skills ^ EXPECTED}"

claude = json.loads((ROOT / ".claude-plugin" / "plugin.json").read_text())
codex = json.loads((ROOT / ".codex-plugin" / "plugin.json").read_text())
legacy = json.loads((ROOT / "manifest.json").read_text())
assert {claude["name"], codex["name"], legacy["name"]} == {"ai-native-cowork"}
assert len({claude["version"], codex["version"], legacy["version"]}) == 1
assert codex["skills"] == "./skills/"

codex_readmes = [
    ROOT / "README-CODEX.md",
    ROOT / "README-CODEX.ko.md",
    ROOT / "README-CODEX.ja.md",
    ROOT / "README-CODEX.zh-CN.md",
]
required_commands = {
    "codex plugin marketplace add ww-w-ai/marketplace",
    "codex plugin add ai-native-cowork@ww-w-ai",
    "codex plugin marketplace upgrade ww-w-ai",
    "codex plugin list",
}
for readme in codex_readmes:
    text = readme.read_text()
    missing = required_commands - set(text.splitlines())
    assert not missing, f"Codex README command drift in {readme.name}: {sorted(missing)}"

for name in EXPECTED:
    text = (ROOT / "skills" / name / "SKILL.md").read_text()
    assert text.startswith("---\n"), f"missing frontmatter: {name}"

print("six-skill, manifest, and Codex README parity passed")
