#!/usr/bin/env python3
"""Behavioral parity checks for the two pdca-wf host runtimes."""

from pathlib import Path
import re
import sys
import unittest


SKILL_ROOT = Path(__file__).resolve().parents[1]
REPO_SKILLS = SKILL_ROOT.parent
ENTRYPOINT = SKILL_ROOT / "SKILL.md"
SHARED = REPO_SKILLS.parent / "shared" / "references" / "cowork-method.md"
RUNTIMES = {
    "claude": SKILL_ROOT / "references" / "runtime-claude-code.md",
    "codex": SKILL_ROOT / "references" / "runtime-codex.md",
}

# S2 migrated the public lifecycle from numbered phases (Phase 1..6, Phase 3R) to the
# named phases in PHASES. workflow-scripts.md and taxonomy-map.md were intentionally left
# out of S2 — they preserve legacy internal numbering for Claude-side Workflow mechanics —
# so this sweep is scoped to exactly the support files S2 migrated.
STALE_PHASE_LABEL = re.compile(r"\bphase[ _-]?\d", re.IGNORECASE)
S2_MIGRATED_SUPPORT_FILES = (
    SKILL_ROOT / "references" / "plan-review-panel.md",
    SKILL_ROOT / "references" / "schemas.md",
    SKILL_ROOT / "references" / "doc-templates.md",
    SKILL_ROOT / "references" / "runtime-claude-code.md",
    SKILL_ROOT / "docs" / "01-built" / "pdca-wf.md",
)

PHASES = (
    "research",
    "brief",
    "plan",
    "plan-review",
    "design",
    "design-review",
    "do",
    "targeted-test",
    "gap-check",
    "qa-diff",
    "report",
)

# These are observable behaviors, not required prose. Each host can explain the
# mechanism differently, but it must expose evidence for every contract item.
BEHAVIORS = {
    "fresh_plan_review": (r"fresh", r"plan.review", r"independent"),
    "fresh_design_review": (r"fresh", r"design.review", r"independent"),
    "blocker_only_rerun": (r"blocker", r"only", r"re.run|rerun"),
    "topological_worklist": (r"topolog", r"WorkList"),
    "same_file_serial": (r"same.file", r"serial"),
    "bounded_check_act": (r"five|max(?:imum)?\s+5|max\s*5", r"Check/Act|Check.Act"),
    "real_targeted_tests": (r"targeted", r"exit.code|real.*command|executed"),
    "qa_diff_once": (r"QA.diff", r"once|one time|not a new agent|not a separate"),
    "external_approval": (r"external|irreversible", r"approval"),
    "cowork_commit_owner": (r"cowork-sprint", r"leader", r"commit"),
    "standalone_no_implicit_commit": (
        r"standalone",
        r"no implicit commit|does not commit|never commits|does not infer commit permission",
    ),
    "fixed_execution_return": (
        r"artifacts",
        r"targetedTests",
        r"gapResult",
        r"qaDiff",
        r"done",
        r"commitReady",
    ),
}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def phase_ids(text: str) -> list[str]:
    """Read canonical phase IDs from Markdown table cells."""
    found: list[str] = []
    for line in text.splitlines():
        match = re.match(r"^\|\s*`([^`]+)`\s*\|", line)
        if match and match.group(1) in PHASES:
            found.append(match.group(1))
    return found


def assert_behavior(test: unittest.TestCase, host: str, text: str, name: str) -> None:
    for pattern in BEHAVIORS[name]:
        test.assertRegex(
            text,
            re.compile(pattern, re.IGNORECASE | re.DOTALL),
            f"{host} runtime lacks {name}: /{pattern}/",
        )


def local_markdown_links(path: Path, text: str) -> list[Path]:
    targets: list[Path] = []
    for raw in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
        target = raw.split("#", 1)[0]
        if not target or "://" in target or target.startswith("mailto:"):
            continue
        targets.append((path.parent / target).resolve())
    return targets


class RuntimeParityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.shared = read(SHARED)
        cls.entrypoint = read(ENTRYPOINT)
        cls.runtime_text = {name: read(path) for name, path in RUNTIMES.items()}

    def test_phase_tables_have_same_order_and_complete_rows(self) -> None:
        observed = {name: phase_ids(text) for name, text in self.runtime_text.items()}
        for host, phases in observed.items():
            self.assertEqual(list(PHASES), phases, f"{host} phase table drifted")
            table_lines = [
                line for line in self.runtime_text[host].splitlines()
                if re.match(r"^\|\s*`(?:" + "|".join(map(re.escape, PHASES)) + r")`\s*\|", line)
            ]
            for line in table_lines:
                # ID + inputs + owner + output + exit + fallback = six non-empty cells.
                cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
                self.assertEqual(6, len(cells), f"{host} phase row must have six columns: {line}")
                self.assertTrue(all(cells), f"{host} phase row has an empty contract cell: {line}")

    def test_both_runtimes_cover_observable_behavior_matrix(self) -> None:
        for host, text in self.runtime_text.items():
            for behavior in BEHAVIORS:
                with self.subTest(host=host, behavior=behavior):
                    assert_behavior(self, host, text, behavior)

    def test_modes_are_behaviorally_complete(self) -> None:
        for host, text in self.runtime_text.items():
            for mode in ("interactive", "preplanned", "cowork"):
                with self.subTest(host=host, mode=mode):
                    self.assertRegex(text, re.compile(rf"\b{mode}\b", re.IGNORECASE))

            cowork = re.search(
                r"cowork[\s\S]{0,1000}?(?:start(?:s|ing)? at|starts? at|enter|jump(?:s|ing)? (?:directly )?to)[^\n]*\bDo\b",
                text,
                flags=re.IGNORECASE,
            )
            self.assertIsNotNone(cowork, f"{host} does not make cowork execution-only from Do")

    def test_codex_goal_boundary_is_explicit(self) -> None:
        codex = self.runtime_text["codex"]
        self.assertRegex(codex, re.compile(r"ordinary[^.]{0,120}must not create a Codex Goal", re.I))
        self.assertRegex(codex, re.compile(r"Create a Goal only when the user explicitly requests", re.I))

    def test_shared_method_and_runtime_links_resolve(self) -> None:
        paths = (ENTRYPOINT, SHARED, *RUNTIMES.values())
        for path in paths:
            for target in local_markdown_links(path, read(path)):
                with self.subTest(source=path.name, target=target):
                    self.assertTrue(target.exists(), f"broken local Markdown link: {path} -> {target}")

    def test_entrypoint_routes_by_capability_without_user_switch(self) -> None:
        text = self.entrypoint
        for token in ("update_plan", "Workflow", "TodoWrite", "runtime-codex.md", "runtime-claude-code.md"):
            self.assertIn(token, text, f"entrypoint routing lacks {token}")
        self.assertRegex(text, re.compile(r"ambiguous", re.I))
        self.assertRegex(text, re.compile(r"unsupported", re.I))
        self.assertRegex(text, re.compile(r"Do not ask the user to choose a host", re.I))

    def test_s2_migrated_support_files_have_no_stale_numeric_phase_labels(self) -> None:
        for path in S2_MIGRATED_SUPPORT_FILES:
            with self.subTest(path=path.name):
                text = read(path)
                match = STALE_PHASE_LABEL.search(text)
                self.assertIsNone(
                    match,
                    f"{path.name} still carries a retired numeric phase label: {match.group(0) if match else ''!r}",
                )

    def test_schemas_define_shared_review_result(self) -> None:
        schemas = read(SKILL_ROOT / "references" / "schemas.md")
        self.assertRegex(schemas, re.compile(r"ReviewResult", re.IGNORECASE))
        self.assertRegex(schemas, re.compile(r"plan-review", re.IGNORECASE))
        self.assertRegex(schemas, re.compile(r"design-review", re.IGNORECASE))
        self.assertRegex(schemas, re.compile(r'"verdict"'))
        self.assertRegex(schemas, re.compile(r"GO.*FIX-FIRST", re.DOTALL))
        self.assertRegex(schemas, re.compile(r'"findings"'))
        self.assertRegex(schemas, re.compile(r"BLOCKER.*MAJOR.*MINOR", re.DOTALL))

    def test_doc_templates_have_brief_and_review_slots(self) -> None:
        templates = read(SKILL_ROOT / "references" / "doc-templates.md")
        self.assertRegex(templates, re.compile(r"Sprint Brief", re.IGNORECASE))
        self.assertRegex(templates, re.compile(r"##\s*Plan review", re.IGNORECASE))
        self.assertRegex(templates, re.compile(r"##\s*Design review", re.IGNORECASE))

    def test_plan_review_panel_names_both_review_barriers(self) -> None:
        panel = read(SKILL_ROOT / "references" / "plan-review-panel.md")
        self.assertRegex(panel, re.compile(r"plan-review", re.IGNORECASE))
        self.assertRegex(panel, re.compile(r"design-review", re.IGNORECASE))
        self.assertRegex(panel, re.compile(r"do not merge the two reviews|never merged|two separate", re.IGNORECASE))

    def test_shared_method_owns_risk_and_core_gate_semantics(self) -> None:
        self.assertIn("0..3", self.shared)
        self.assertIn("4..6", self.shared)
        self.assertIn("7..10", self.shared)
        self.assertIn("Every sprint runs these gates regardless of risk score", self.shared)
        for host, text in self.runtime_text.items():
            self.assertIn("cowork-method.md", text, f"{host} does not consume shared method")


if __name__ == "__main__":
    result = unittest.main(exit=False)
    raise SystemExit(0 if result.result.wasSuccessful() else 1)
