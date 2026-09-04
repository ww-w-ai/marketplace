#!/usr/bin/env python3
"""Behavioral parity checks for cowork-sprint host mappings and state docs."""

import importlib.util
import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
SHARED = ROOT.parents[1] / "shared" / "references" / "cowork-method.md"
RUNTIMES = {
    "claude": ROOT / "references" / "runtime-claude-code.md",
    "codex": ROOT / "references" / "runtime-codex.md",
}
BEHAVIORS = (
    "roadmap-review", "brief", "plan-review", "design-review", "targeted-test",
    "gap-check", "qa-diff", "intent-audit", "sprint-commit", "state-checkpoint",
    "cluster-regression", "full-regression", "doc-sync", "completion-report",
    "bounded-five", "approval-boundary",
)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def contract_rows(text: str) -> list[tuple[str, list[str]]]:
    rows = []
    for line in text.splitlines():
        match = re.match(r"^\|\s*`([^`]+)`\s*\|(.*)\|$", line)
        if match and match.group(1) in BEHAVIORS:
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            rows.append((match.group(1), cells))
    return rows


class RuntimeParityTests(unittest.TestCase):
    def test_entrypoint_is_thin_capability_router(self):
        text = read(ROOT / "SKILL.md")
        self.assertLess(len(text.splitlines()), 90)
        for token in ("update_plan", "Workflow", "TodoWrite", "runtime-claude-code.md", "runtime-codex.md", "ambiguous", "unsupported"):
            self.assertIn(token, text)
        self.assertNotIn("PHASE 0", text)

    def test_shared_method_owns_every_observable_gate(self):
        text = read(SHARED)
        phrases = (
            "independent roadmap review", "Sprint Brief", "independent Plan review",
            "independent Design review", "Targeted tests", "gap check", "intent audit",
            "QA diff question", "own commit", "initiative's user intent once", "sprint artifacts", "user actually intervened", "checkpoint", "adjacent regression",
            "full regression", "documentation synchronization", "completion report",
            "five fix-and-recheck", "explicit user approval",
        )
        for phrase in phrases:
            self.assertIn(phrase, text)

    def test_both_runtimes_cover_behavior_matrix(self):
        for host, path in RUNTIMES.items():
            text = read(path)
            rows = contract_rows(text)
            self.assertEqual(list(BEHAVIORS), [row[0] for row in rows], f"{host} runtime gate drift")
            for _, cells in rows:
                self.assertEqual(3, len(cells))
                self.assertTrue(all(cells))
            self.assertIn("cowork-method.md", text)
            self.assertIn("schedule.py", text)
            self.assertIn("state.py", text)
            self.assertIn("sprint-provenance mode", text)
            self.assertIn("real user intervention", text)
            self.assertIn("sprint provenance exist", text)

    def test_sprint_commit_routes_to_artifact_provenance(self):
        commit_skill = read(ROOT.parent / "cowork-commit" / "SKILL.md")
        self.assertIn("Sprint provenance mode", commit_skill)
        self.assertIn("initiative intent", commit_skill)
        self.assertIn("User Intervention Delta", commit_skill)
        self.assertTrue((ROOT.parent / "cowork-commit" / "references" / "sprint-provenance-format.md").is_file())

    def test_matrix_detects_a_removed_gate(self):
        text = read(RUNTIMES["codex"])
        mutated = "\n".join(line for line in text.splitlines() if not line.startswith("| `gap-check` |"))
        self.assertNotEqual(list(BEHAVIORS), [row[0] for row in contract_rows(mutated)])
        self.assertNotIn("gap-check", [row[0] for row in contract_rows(mutated)])

    def test_host_native_mechanisms_remain_distinct(self):
        claude, codex = read(RUNTIMES["claude"]), read(RUNTIMES["codex"])
        for token in ("TodoWrite", "Agent", "Workflow", "CLAUDE.md"):
            self.assertIn(token, claude)
        for token in ("Goal", "update_plan", "explorer", "collaboration", "AGENTS.md"):
            self.assertIn(token, codex)

    def test_each_host_names_its_own_opt_in_word(self):
        """Structured fan-out is gated on a word the user types, and the word differs by host.

        A host reference that names the mechanism but not the word leaves a leader knowing the
        capability exists without knowing what turns it on — which ends as either never using it
        or using it uninvited. Both read as a judgment call rather than a missing sentence, which
        is why this is a test and not a style note.
        """
        claude, codex = read(RUNTIMES["claude"]), read(RUNTIMES["codex"])
        self.assertIn("ultracode", claude, "the Claude Code reference must name its opt-in word")
        self.assertIn("goal", codex, "the Codex reference must name its opt-in word")

    def test_each_host_states_what_runs_before_the_word(self):
        """The gate withholds the mechanism, never the work.

        Without this sentence a leader reads the pre-opt-in state as 'blocked' and either stalls
        or opens the gate itself to get moving.
        """
        claude, codex = read(RUNTIMES["claude"]), read(RUNTIMES["codex"])
        for name, text in (("claude", claude), ("codex", codex)):
            self.assertRegex(
                text.lower(),
                r"before the word is said|until the word is said|until that word is said",
                f"the {name} reference must say what runs before the opt-in word",
            )

    def test_neither_host_offers_the_other_hosts_word_as_its_own(self):
        """Cross-host leak: the two words are not interchangeable.

        Each file may MENTION the other host's word — that contrast is deliberate and useful — but
        only alongside the other host's name, so it can never be read as this host's trigger.
        """
        claude, codex = read(RUNTIMES["claude"]), read(RUNTIMES["codex"])
        for line in claude.splitlines():
            if "goal" in line.lower() and "ultracode" not in line.lower():
                self.assertIn(
                    "codex", line.lower(),
                    f"Claude Code reference mentions a goal without naming Codex: {line[:120]}",
                )
        for line in codex.splitlines():
            if "ultracode" in line.lower():
                self.assertIn(
                    "claude", line.lower(),
                    f"Codex reference mentions ultracode without naming Claude Code: {line[:120]}",
                )

    def test_documented_state_example_is_validator_legal(self):
        method = read(ROOT / "references" / "sprint-method.md")
        section = method.split("## 6. status.json schema", 1)[1].split("## 6A.", 1)[0]
        document = json.loads(re.search(r"```json\n([\s\S]*?)\n```", section).group(1))
        state_path = ROOT / "scripts" / "state" / "state.py"
        spec = importlib.util.spec_from_file_location("cowork_state", state_path)
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        self.assertIs(module.validate(document), document)

    def test_legacy_report_fields_are_not_state_instructions(self):
        texts = "\n".join(read(path) for path in (
            ROOT / "SKILL.md",
            ROOT / "references" / "sprint-method.md",
            ROOT / "references" / "plan-review-panel.md",
        ))
        forbidden = ("qaTable", "deferredDecisions", "agentEvolutions", "cyclePhase", "executionOrder")
        for field in forbidden:
            self.assertNotIn(field, texts)


if __name__ == "__main__":
    unittest.main()
