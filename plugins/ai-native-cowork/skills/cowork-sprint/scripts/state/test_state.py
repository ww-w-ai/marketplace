import argparse
import copy
import json
from pathlib import Path
import tempfile
import unittest

import state


NOW = "2026-08-25T00:00:00+09:00"
RISK = {"impact": 1, "recovery": 1, "securityExternal": 0, "contract": 2, "verification": 1, "total": 5}


def fixture(mode="sequential"):
    return {
        "schemaVersion": 1, "revision": 0, "runId": "dual-host-s1", "goal": "Ship shared state",
        "roadmapFile": "docs/roadmap.md", "executionMode": mode,
        "git": {"baseBranch": "dev", "worktree": "../repo-sprint", "sprintBranch": "sprint/shared", "lastCommit": None},
        "sprints": [
            {"id": "S1", "deps": [], "planFile": "docs/s1.md", "risk": copy.deepcopy(RISK), "status": "pending", "phase": "pending", "commit": None},
            {"id": "S2", "deps": ["S1"], "planFile": "docs/s2.md", "risk": copy.deepcopy(RISK), "status": "pending", "phase": "pending", "commit": None},
        ],
        "pause": None, "openDecisions": [], "updatedAt": NOW,
    }


def args(**values):
    return argparse.Namespace(**values)


class ValidationTests(unittest.TestCase):
    def test_valid_cc_and_codex_lifecycle_shapes(self):
        document = fixture()
        self.assertIs(state.validate(document), document)
        rolling = fixture("mixed")
        rolling["sprints"][0].update(status="blocked", phase="design")
        rolling["pause"] = {"code": "QUALITY_GATE_FAIL", "sprintId": "S1", "phase": "design", "detail": "review failed", "blockedBy": ["schema"], "createdAt": NOW}
        state.validate(rolling)

    def test_rejects_unknown_report_field_absolute_path_and_bad_timestamp(self):
        for change in ("unknown", "path", "timestamp"):
            doc = fixture()
            if change == "unknown": doc["sprints"][0]["qaTable"] = []
            elif change == "path": doc["sprints"][0]["planFile"] = "/tmp/s1.md"
            else: doc["updatedAt"] = "tomorrow"
            with self.assertRaises(state.StateError): state.validate(doc)

    def test_rejects_parent_traversal_in_repository_paths(self):
        for field in ("roadmapFile", "planFile", "resultFile"):
            doc = fixture()
            if field == "roadmapFile":
                doc[field] = "../outside.md"
            else:
                doc["sprints"][0][field] = "../outside.md"
            with self.assertRaises(state.StateError):
                state.validate(doc)

    def test_rejects_duplicate_missing_and_cyclic_dependencies(self):
        cases = []
        duplicate = fixture(); duplicate["sprints"][1]["id"] = "S1"; cases.append(duplicate)
        missing = fixture(); missing["sprints"][1]["deps"] = ["S9"]; cases.append(missing)
        cycle = fixture(); cycle["sprints"][0]["deps"] = ["S2"]; cases.append(cycle)
        for doc in cases:
            with self.assertRaises(state.StateError): state.validate(doc)

    def test_rejects_persisted_dependency_violation(self):
        doc = fixture()
        doc["sprints"][1].update(status="in-progress", phase="research")
        with self.assertRaises(state.StateError): state.validate(doc)

    def test_rejects_risk_sum_and_derives_thresholds(self):
        doc = fixture(); doc["sprints"][0]["risk"]["total"] = 9
        with self.assertRaises(state.StateError): state.validate(doc)
        for total, level in ((0, "light"), (3, "light"), (4, "standard"), (6, "standard"), (7, "heavy"), (10, "heavy")):
            risk = {"total": total}
            self.assertEqual(level, state.risk_level(risk))

    def test_sequential_mode_rejects_multiple_active_sprints(self):
        doc = fixture(); doc["sprints"][0].update(status="in-progress", phase="research"); doc["sprints"][1].update(status="blocked", phase="plan")
        with self.assertRaises(state.StateError): state.validate(doc)

    def test_cluster_shape_and_legacy_compatibility(self):
        state.validate(fixture())
        doc = fixture("mixed")
        doc["clusters"] = [
            {"id": "C1", "mode": "sequential", "sprintIds": ["S1"], "integrationOrder": ["S1"]},
            {"id": "C2", "mode": "sequential", "sprintIds": ["S2"], "integrationOrder": ["S2"]},
        ]
        state.validate(doc)
        doc["clusters"][1]["sprintIds"] = ["S1", "S2"]
        with self.assertRaises(state.StateError): state.validate(doc)


class TransitionTests(unittest.TestCase):
    def setUp(self):
        self.doc = fixture()

    def run_command(self, name, **kwargs):
        state.apply_command(self.doc, name, args(**kwargs), NOW)
        state.validate(self.doc)

    def test_complete_lifecycle_and_dependency_guard(self):
        with self.assertRaises(state.StateError): self.run_command("start-sprint", sprint_id="S2")
        self.run_command("start-sprint", sprint_id="S1")
        for phase in state.ACTIVE_PHASES[1:]: self.run_command("set-phase", sprint_id="S1", phase=phase)
        self.run_command("set-commit", sprint_id="S1", commit="abcdef1")
        self.run_command("complete-sprint", sprint_id="S1", result_file="docs/s1-report.md")
        self.assertEqual(("completed", "done"), (self.doc["sprints"][0]["status"], self.doc["sprints"][0]["phase"]))
        self.run_command("start-sprint", sprint_id="S2")

    def test_phase_cannot_skip(self):
        self.run_command("start-sprint", sprint_id="S1")
        with self.assertRaises(state.StateError): self.run_command("set-phase", sprint_id="S1", phase="design")

    def test_block_pause_resume_preserves_phase(self):
        self.run_command("start-sprint", sprint_id="S1")
        self.run_command("set-phase", sprint_id="S1", phase="brief")
        self.run_command("block-sprint", sprint_id="S1")
        self.run_command("pause", sprint_id="S1", code="QUALITY_GATE_FAIL", detail="missing evidence", blocked_by=["review"])
        self.run_command("resume", code="QUALITY_GATE_FAIL")
        sprint = self.doc["sprints"][0]
        self.assertEqual(("in-progress", "brief", None), (sprint["status"], sprint["phase"], self.doc["pause"]))

    def test_resume_requires_matching_code(self):
        self.run_command("start-sprint", sprint_id="S1")
        self.run_command("pause", sprint_id="S1", code="BUDGET_TIME_EXCEEDED", detail="time", blocked_by=[])
        with self.assertRaises(state.StateError): self.run_command("resume", code="QUALITY_GATE_FAIL")

    def test_open_and_resolve_decision(self):
        self.run_command("open-decision", sprint_id="S1", decision_id="D1", question="Use default?", chosen_default="yes", reason="reversible")
        self.assertEqual("D1", self.doc["openDecisions"][0]["id"])
        self.run_command("resolve-decision", decision_id="D1")
        self.assertEqual([], self.doc["openDecisions"])

    def test_fail_and_archive_are_terminal(self):
        self.run_command("start-sprint", sprint_id="S1")
        self.run_command("fail-sprint", sprint_id="S1")
        with self.assertRaises(state.StateError): self.run_command("start-sprint", sprint_id="S1")
        self.run_command("archive-sprint", sprint_id="S1")
        self.assertEqual("archived", self.doc["sprints"][0]["status"])

    def test_cluster_barrier_blocks_later_sprint(self):
        self.doc["executionMode"] = "mixed"
        self.doc["sprints"][1]["deps"] = []
        self.doc["clusters"] = [
            {"id": "C1", "mode": "sequential", "sprintIds": ["S1"], "integrationOrder": ["S1"]},
            {"id": "C2", "mode": "sequential", "sprintIds": ["S2"], "integrationOrder": ["S2"]},
        ]
        with self.assertRaises(state.StateError): self.run_command("start-sprint", sprint_id="S2")
        self.run_command("start-sprint", sprint_id="S1")
        self.run_command("fail-sprint", sprint_id="S1")
        with self.assertRaises(state.StateError): self.run_command("start-sprint", sprint_id="S2")

    def test_concurrent_cluster_allows_two_active_members(self):
        self.doc["executionMode"] = "concurrent"
        self.doc["sprints"][1]["deps"] = []
        self.doc["clusters"] = [{"id": "C1", "mode": "concurrent", "sprintIds": ["S1", "S2"], "integrationOrder": ["S1", "S2"]}]
        self.run_command("start-sprint", sprint_id="S1")
        self.run_command("start-sprint", sprint_id="S2")

    def test_archived_done_member_satisfies_cluster_barrier(self):
        self.doc["clusters"] = [
            {"id": "C1", "mode": "sequential", "sprintIds": ["S1"], "integrationOrder": ["S1"]},
            {"id": "C2", "mode": "sequential", "sprintIds": ["S2"], "integrationOrder": ["S2"]},
        ]
        self.run_command("start-sprint", sprint_id="S1")
        for phase in state.ACTIVE_PHASES[1:]: self.run_command("set-phase", sprint_id="S1", phase=phase)
        self.run_command("set-commit", sprint_id="S1", commit="abcdef1")
        self.run_command("complete-sprint", sprint_id="S1", result_file=None)
        self.run_command("archive-sprint", sprint_id="S1")
        self.run_command("start-sprint", sprint_id="S2")


class PersistenceTests(unittest.TestCase):
    def test_mutation_increments_revision_and_writes_atomically(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "status.json"; path.write_text(json.dumps(fixture()))
            result = state.mutate(path, 0, lambda: NOW, lambda doc: state.apply_command(doc, "start-sprint", args(sprint_id="S1"), NOW))
            self.assertEqual(1, result["revision"]); self.assertEqual(result, json.loads(path.read_text()))
            self.assertEqual([], list(path.parent.glob(".status.json.*")))

    def test_stale_revision_and_failed_validation_preserve_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "status.json"; path.write_text(json.dumps(fixture(), indent=2))
            before = path.read_bytes()
            with self.assertRaises(state.StateError): state.mutate(path, 3, lambda: NOW, lambda doc: None)
            self.assertEqual(before, path.read_bytes())
            with self.assertRaises(state.StateError): state.mutate(path, 0, lambda: NOW, lambda doc: doc["sprints"][0].update(phase="done"))
            self.assertEqual(before, path.read_bytes())


if __name__ == "__main__":
    unittest.main()
