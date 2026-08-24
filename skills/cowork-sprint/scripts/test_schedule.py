#!/usr/bin/env python3
import unittest

from schedule import ScheduleError, overlaps, plan_clusters


class ScheduleTests(unittest.TestCase):
    def test_chain_is_sequential(self):
        result = plan_clusters([
            {"id": "A", "deps": [], "owns": ["a"]},
            {"id": "B", "deps": ["A"], "owns": ["b"]},
        ])
        self.assertEqual("sequential", result["executionMode"])
        self.assertEqual([["A"], ["B"]], [x["sprintIds"] for x in result["clusters"]])

    def test_parallel_diamond_is_mixed_and_stable(self):
        items = [
            {"id": "A", "deps": [], "owns": ["base"]},
            {"id": "B", "deps": ["A"], "owns": ["src/b"]},
            {"id": "C", "deps": ["A"], "owns": ["src/c"]},
            {"id": "D", "deps": ["B", "C"], "owns": ["end"]},
        ]
        result = plan_clusters(items)
        self.assertEqual("mixed", result["executionMode"])
        self.assertEqual([["A"], ["B", "C"], ["D"]], [x["sprintIds"] for x in result["clusters"]])
        self.assertEqual(["B", "C"], result["clusters"][1]["integrationOrder"])

    def test_collision_and_unknown_ownership_serialize(self):
        items = [
            {"id": "A", "deps": [], "owns": ["src"]},
            {"id": "B", "deps": [], "owns": ["src/b.py"]},
            {"id": "C", "deps": [], "owns": []},
        ]
        self.assertEqual([["A"], ["B"], ["C"]], [x["sprintIds"] for x in plan_clusters(items)["clusters"]])

    def test_artifact_keys_and_cycles(self):
        self.assertTrue(overlaps("artifact:db", "artifact:db"))
        self.assertFalse(overlaps("artifact:db", "artifact:api"))
        with self.assertRaises(ScheduleError):
            plan_clusters([{"id": "A", "deps": ["B"], "owns": ["a"]}, {"id": "B", "deps": ["A"], "owns": ["b"]}])


if __name__ == "__main__":
    unittest.main()
