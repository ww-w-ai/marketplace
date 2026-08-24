#!/usr/bin/env python3
"""Build deterministic sprint clusters from dependencies and ownership."""

from __future__ import annotations

import json
from pathlib import PurePosixPath
import sys


class ScheduleError(ValueError):
    pass


def _parts(key: str) -> tuple[str, ...] | None:
    if key.startswith("artifact:"):
        return None
    path = PurePosixPath(key.replace("\\", "/"))
    if path.is_absolute() or ".." in path.parts or not path.parts:
        raise ScheduleError(f"invalid ownership key: {key}")
    return path.parts


def overlaps(left: str, right: str) -> bool:
    a, b = _parts(left), _parts(right)
    if a is None or b is None:
        return left == right
    return a == b[:len(a)] or b == a[:len(b)]


def plan_clusters(sprints: list[dict]) -> dict:
    order = {item["id"]: index for index, item in enumerate(sprints)}
    if len(order) != len(sprints):
        raise ScheduleError("duplicate sprint id")
    ids = set(order)
    for item in sprints:
        if set(item.get("deps", [])) - ids:
            raise ScheduleError(f"{item['id']} has a missing dependency")
    remaining = list(sprints)
    done: set[str] = set()
    clusters: list[dict] = []
    while remaining:
        ready = [item for item in remaining if set(item.get("deps", [])) <= done]
        if not ready:
            raise ScheduleError("dependency cycle")
        group: list[dict] = []
        owned: list[str] = []
        exclusive = False
        for item in ready:
            keys = item.get("owns", [])
            collision = exclusive or not keys or any(overlaps(a, b) for a in keys for b in owned)
            if not group or not collision:
                group.append(item)
                owned.extend(keys)
                exclusive = exclusive or not keys
        sprint_ids = [item["id"] for item in group]
        clusters.append({
            "id": f"C{len(clusters) + 1}",
            "mode": "concurrent" if len(group) > 1 else "sequential",
            "sprintIds": sprint_ids,
            "integrationOrder": sorted(sprint_ids, key=order.__getitem__),
        })
        done.update(sprint_ids)
        remaining = [item for item in remaining if item["id"] not in done]
    any_parallel = any(c["mode"] == "concurrent" for c in clusters)
    mode = "concurrent" if len(clusters) == 1 and any_parallel else "mixed" if any_parallel else "sequential"
    return {"executionMode": mode, "clusters": clusters}


if __name__ == "__main__":
    try:
        print(json.dumps(plan_clusters(json.load(sys.stdin))))
    except (ScheduleError, KeyError, TypeError, json.JSONDecodeError) as error:
        print(f"schedule error: {error}", file=sys.stderr)
        raise SystemExit(2)
