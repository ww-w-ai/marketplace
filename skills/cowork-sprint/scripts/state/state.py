#!/usr/bin/env python3
"""Validate and atomically transition cowork-sprint durable state."""

from __future__ import annotations

import argparse
import copy
import datetime as dt
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys
import tempfile
from typing import Any, Callable


PHASES = ("pending", "research", "brief", "plan", "plan-review", "design",
          "design-review", "do", "test", "gap-check", "commit", "done")
ACTIVE_PHASES = PHASES[1:-1]
STATUSES = {"pending", "in-progress", "blocked", "failed", "completed", "archived"}
PAUSE_CODES = {"QUALITY_GATE_FAIL", "ITERATE_EXHAUSTED", "AGENT_EVOLUTION_EXHAUSTED",
               "BUDGET_TIME_EXCEEDED", "IRREVERSIBLE_ACTION", "MERGE_CONFLICT"}
COMMIT_RE = re.compile(r"^[0-9a-fA-F]{7,64}$")
ROOT_FIELDS = {"schemaVersion", "revision", "runId", "goal", "roadmapFile",
               "executionMode", "git", "sprints", "clusters", "pause", "openDecisions", "updatedAt"}
SPRINT_FIELDS = {"id", "deps", "owns", "planFile", "risk", "status", "phase", "commit", "resultFile"}
CLUSTER_FIELDS = {"id", "mode", "sprintIds", "integrationOrder"}
RISK_FIELDS = {"impact", "recovery", "securityExternal", "contract", "verification", "total"}
GIT_FIELDS = {"baseBranch", "worktree", "sprintBranch", "lastCommit"}
PAUSE_FIELDS = {"code", "sprintId", "phase", "detail", "blockedBy", "createdAt"}
DECISION_FIELDS = {"id", "sprintId", "question", "chosenDefault", "reason", "status"}


class StateError(ValueError):
    """The document or requested transition violates the state contract."""


def _object(value: Any, fields: set[str], required: set[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise StateError(f"{label} must be an object")
    unknown = set(value) - fields
    missing = required - set(value)
    if unknown:
        raise StateError(f"{label} has unknown fields: {', '.join(sorted(unknown))}")
    if missing:
        raise StateError(f"{label} is missing fields: {', '.join(sorted(missing))}")
    return value


def _text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise StateError(f"{label} must be a non-empty string")
    return value


def _relative(value: Any, label: str) -> str:
    value = _text(value, label)
    path = PurePosixPath(value.replace("\\", "/"))
    if path.is_absolute() or re.match(r"^[A-Za-z]:/", value):
        raise StateError(f"{label} must be repository-relative")
    if ".." in path.parts:
        raise StateError(f"{label} must not escape the repository")
    return value


def _timestamp(value: Any, label: str) -> str:
    value = _text(value, label)
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise StateError(f"{label} must be an ISO-8601 timestamp") from exc
    if parsed.tzinfo is None:
        raise StateError(f"{label} must include a timezone")
    return value


def risk_level(risk: dict[str, int]) -> str:
    total = risk["total"]
    return "light" if total <= 3 else "standard" if total <= 6 else "heavy"


def validate(state: Any) -> dict[str, Any]:
    state = _object(state, ROOT_FIELDS, ROOT_FIELDS - {"clusters"}, "state")
    if state["schemaVersion"] != 1:
        raise StateError("schemaVersion must be 1")
    if not isinstance(state["revision"], int) or isinstance(state["revision"], bool) or state["revision"] < 0:
        raise StateError("revision must be a non-negative integer")
    _text(state["runId"], "runId"); _text(state["goal"], "goal")
    _relative(state["roadmapFile"], "roadmapFile")
    if state["executionMode"] not in {"sequential", "mixed", "concurrent"}:
        raise StateError("executionMode is invalid")
    git = _object(state["git"], GIT_FIELDS, GIT_FIELDS, "git")
    for key in ("baseBranch", "worktree", "sprintBranch"):
        _text(git[key], f"git.{key}")
    if git["lastCommit"] is not None and not COMMIT_RE.fullmatch(str(git["lastCommit"])):
        raise StateError("git.lastCommit must be a Git object ID or null")
    _timestamp(state["updatedAt"], "updatedAt")

    if not isinstance(state["sprints"], list) or not state["sprints"]:
        raise StateError("sprints must be a non-empty array")
    ids: set[str] = set()
    active = 0
    by_id: dict[str, dict[str, Any]] = {}
    for index, raw in enumerate(state["sprints"]):
        sprint = _object(raw, SPRINT_FIELDS, SPRINT_FIELDS - {"resultFile", "owns"}, f"sprints[{index}]")
        sid = _text(sprint["id"], f"sprints[{index}].id")
        if sid in ids:
            raise StateError(f"duplicate sprint id: {sid}")
        ids.add(sid); by_id[sid] = sprint
        if not isinstance(sprint["deps"], list) or any(not isinstance(x, str) or not x for x in sprint["deps"]):
            raise StateError(f"{sid}.deps must contain non-empty strings")
        if len(set(sprint["deps"])) != len(sprint["deps"]):
            raise StateError(f"{sid}.deps contains duplicates")
        owns = sprint.get("owns", [])
        if not isinstance(owns, list) or any(not isinstance(x, str) or not x for x in owns):
            raise StateError(f"{sid}.owns must contain non-empty strings")
        if len(set(owns)) != len(owns):
            raise StateError(f"{sid}.owns contains duplicates")
        _relative(sprint["planFile"], f"{sid}.planFile")
        if sprint.get("resultFile") is not None:
            _relative(sprint["resultFile"], f"{sid}.resultFile")
        risk = _object(sprint["risk"], RISK_FIELDS, RISK_FIELDS, f"{sid}.risk")
        parts = [risk[key] for key in RISK_FIELDS - {"total"}]
        if any(not isinstance(x, int) or isinstance(x, bool) or not 0 <= x <= 2 for x in parts):
            raise StateError(f"{sid}.risk dimensions must be integers from 0 through 2")
        if not isinstance(risk["total"], int) or isinstance(risk["total"], bool) or risk["total"] != sum(parts):
            raise StateError(f"{sid}.risk.total must equal the dimension sum")
        status, phase = sprint["status"], sprint["phase"]
        if status not in STATUSES or phase not in PHASES:
            raise StateError(f"{sid} has invalid status or phase")
        legal = ((status == "pending" and phase == "pending") or
                 (status in {"in-progress", "blocked", "failed"} and phase in ACTIVE_PHASES) or
                 (status == "completed" and phase == "done") or
                 (status == "archived" and phase in (*ACTIVE_PHASES, "done")))
        if not legal:
            raise StateError(f"{sid} has illegal status/phase combination: {status}/{phase}")
        if sprint["commit"] is not None and not COMMIT_RE.fullmatch(str(sprint["commit"])):
            raise StateError(f"{sid}.commit must be a Git object ID or null")
        if status == "completed" and sprint["commit"] is None:
            raise StateError(f"{sid} cannot be completed without a commit")
        if status in {"in-progress", "blocked"}:
            active += 1
    if state["executionMode"] == "sequential" and active > 1:
        raise StateError("sequential mode permits at most one active sprint")
    for sid, sprint in by_id.items():
        missing = set(sprint["deps"]) - ids
        if missing:
            raise StateError(f"{sid} references missing dependencies: {', '.join(sorted(missing))}")
    visiting: set[str] = set(); visited: set[str] = set()
    def visit(sid: str) -> None:
        if sid in visiting: raise StateError("sprint dependency cycle detected")
        if sid in visited: return
        visiting.add(sid)
        for dep in by_id[sid]["deps"]: visit(dep)
        visiting.remove(sid); visited.add(sid)
    for sid in ids: visit(sid)

    clusters = state.get("clusters")
    cluster_of: dict[str, int] = {}
    if clusters is not None:
        if not isinstance(clusters, list) or not clusters:
            raise StateError("clusters must be a non-empty array")
        cluster_ids: set[str] = set()
        for index, raw in enumerate(clusters):
            cluster = _object(raw, CLUSTER_FIELDS, CLUSTER_FIELDS, f"clusters[{index}]")
            cid = _text(cluster["id"], f"clusters[{index}].id")
            if cid in cluster_ids: raise StateError(f"duplicate cluster id: {cid}")
            cluster_ids.add(cid)
            members = cluster["sprintIds"]
            if not isinstance(members, list) or not members or len(set(members)) != len(members):
                raise StateError(f"{cid}.sprintIds must be a non-empty unique array")
            if set(members) - ids: raise StateError(f"{cid} references a missing sprint")
            if cluster["mode"] not in {"sequential", "concurrent"}: raise StateError(f"{cid}.mode is invalid")
            if cluster["mode"] == "concurrent" and len(members) < 2: raise StateError(f"{cid} concurrent mode needs two sprints")
            if cluster["mode"] == "sequential" and len(members) != 1: raise StateError(f"{cid} sequential mode needs one sprint")
            if cluster["integrationOrder"] != members: raise StateError(f"{cid}.integrationOrder must match stable sprint order")
            for sid in members:
                if sid in cluster_of: raise StateError(f"sprint appears in multiple clusters: {sid}")
                cluster_of[sid] = index
        if set(cluster_of) != ids: raise StateError("clusters must contain every sprint exactly once")
        for sid, sprint in by_id.items():
            if any(cluster_of[dep] >= cluster_of[sid] for dep in sprint["deps"]):
                raise StateError(f"{sid} dependency must be in an earlier cluster")
        active_clusters = {cluster_of[sid] for sid, sprint in by_id.items() if sprint["status"] in {"in-progress", "blocked"}}
        if len(active_clusters) > 1: raise StateError("active sprints must share one cluster")
        if active_clusters:
            active_index = next(iter(active_clusters))
            if clusters[active_index]["mode"] != "concurrent" and active > 1:
                raise StateError("sequential cluster permits one active sprint")
    for sid, sprint in by_id.items():
        if sprint["status"] in {"in-progress", "blocked", "completed"}:
            unsatisfied = [dep for dep in sprint["deps"]
                           if by_id[dep]["status"] != "completed"
                           and not (by_id[dep]["status"] == "archived" and by_id[dep]["phase"] == "done")]
            if unsatisfied:
                raise StateError(f"{sid} has unsatisfied dependencies: {', '.join(sorted(unsatisfied))}")

    pause = state["pause"]
    if pause is not None:
        pause = _object(pause, PAUSE_FIELDS, PAUSE_FIELDS, "pause")
        if pause["code"] not in PAUSE_CODES: raise StateError("pause.code is invalid")
        if pause["sprintId"] not in ids: raise StateError("pause references a missing sprint")
        if pause["phase"] not in ACTIVE_PHASES: raise StateError("pause.phase is invalid")
        _text(pause["detail"], "pause.detail"); _timestamp(pause["createdAt"], "pause.createdAt")
        if not isinstance(pause["blockedBy"], list) or any(not isinstance(x, str) or not x for x in pause["blockedBy"]):
            raise StateError("pause.blockedBy must contain non-empty strings")
        target = by_id[pause["sprintId"]]
        if target["status"] not in {"in-progress", "blocked"} or target["phase"] != pause["phase"]:
            raise StateError("pause must match an active sprint and phase")
    if not isinstance(state["openDecisions"], list): raise StateError("openDecisions must be an array")
    decision_ids: set[str] = set()
    for index, raw in enumerate(state["openDecisions"]):
        item = _object(raw, DECISION_FIELDS, DECISION_FIELDS, f"openDecisions[{index}]")
        for key in ("id", "sprintId", "question", "chosenDefault", "reason"): _text(item[key], f"decision.{key}")
        if item["id"] in decision_ids: raise StateError(f"duplicate decision id: {item['id']}")
        decision_ids.add(item["id"])
        if item["sprintId"] not in ids: raise StateError("decision references a missing sprint")
        if item["status"] != "open": raise StateError("active decisions must have status open")
    return state


def _sprint(state: dict[str, Any], sprint_id: str) -> dict[str, Any]:
    return next((x for x in state["sprints"] if x["id"] == sprint_id), None) or (_raise(f"unknown sprint: {sprint_id}"))


def _raise(message: str) -> Any:
    raise StateError(message)


def _dependency_done(sprint: dict[str, Any]) -> bool:
    return sprint["status"] == "completed" or (sprint["status"] == "archived" and sprint["phase"] == "done")


def mutate(path: Path, expected_revision: int, clock: Callable[[], str], operation: Callable[[dict[str, Any]], None]) -> dict[str, Any]:
    original = path.read_bytes()
    try: state = validate(json.loads(original))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc: raise StateError("state file is not valid JSON") from exc
    if state["revision"] != expected_revision:
        raise StateError(f"stale revision: expected {expected_revision}, found {state['revision']}")
    candidate = copy.deepcopy(state)
    operation(candidate)
    candidate["revision"] += 1; candidate["updatedAt"] = clock()
    validate(candidate)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(candidate, handle, indent=2, ensure_ascii=False); handle.write("\n"); handle.flush(); os.fsync(handle.fileno())
        os.replace(temp_name, path)
    except Exception:
        try: os.unlink(temp_name)
        except FileNotFoundError: pass
        raise
    return candidate


def apply_command(state: dict[str, Any], command: str, args: argparse.Namespace, now: str) -> None:
    sprint = _sprint(state, args.sprint_id) if hasattr(args, "sprint_id") and args.sprint_id else None
    if command == "start-sprint":
        if (sprint["status"], sprint["phase"]) != ("pending", "pending"): raise StateError("start requires pending/pending")
        if any(not _dependency_done(_sprint(state, dep)) for dep in sprint["deps"]): raise StateError("all dependencies must be completed")
        if state.get("clusters"):
            target = next(i for i, cluster in enumerate(state["clusters"]) if sprint["id"] in cluster["sprintIds"])
            earlier = [sid for cluster in state["clusters"][:target] for sid in cluster["sprintIds"]]
            def cluster_done(sid: str) -> bool:
                prior = _sprint(state, sid)
                return _dependency_done(prior) and bool(prior["commit"])
            if any(not cluster_done(sid) for sid in earlier):
                raise StateError("all earlier clusters must be completed with commits")
        sprint.update(status="in-progress", phase="research")
    elif command == "set-phase":
        if sprint["status"] != "in-progress": raise StateError("set-phase requires in-progress status")
        expected = PHASES[PHASES.index(sprint["phase"]) + 1]
        if args.phase != expected or args.phase == "done": raise StateError(f"next phase must be {expected}")
        sprint["phase"] = args.phase
    elif command == "set-commit":
        if sprint["status"] != "in-progress" or sprint["phase"] != "commit": raise StateError("set-commit requires in-progress/commit")
        if not COMMIT_RE.fullmatch(args.commit): raise StateError("commit must be a Git object ID")
        sprint["commit"] = args.commit; state["git"]["lastCommit"] = args.commit
    elif command == "complete-sprint":
        if sprint["status"] != "in-progress" or sprint["phase"] != "commit" or not sprint["commit"]: raise StateError("completion requires in-progress/commit with commit")
        if any(not _dependency_done(_sprint(state, dep)) for dep in sprint["deps"]): raise StateError("all dependencies must be completed")
        sprint.update(status="completed", phase="done")
        if args.result_file is not None: sprint["resultFile"] = _relative(args.result_file, "resultFile")
    elif command == "block-sprint":
        if sprint["status"] != "in-progress" or sprint["phase"] not in ACTIVE_PHASES: raise StateError("block requires an active sprint")
        sprint["status"] = "blocked"
    elif command == "fail-sprint":
        if sprint["status"] not in {"in-progress", "blocked"}: raise StateError("fail requires an active sprint")
        sprint["status"] = "failed"
    elif command == "archive-sprint":
        if sprint["status"] not in {"completed", "failed"}: raise StateError("archive requires completed or failed status")
        sprint["status"] = "archived"
    elif command == "pause":
        if state["pause"] is not None: raise StateError("state is already paused")
        if sprint["status"] not in {"in-progress", "blocked"}: raise StateError("pause requires an active sprint")
        if args.code not in PAUSE_CODES: raise StateError("unknown pause code")
        state["pause"] = {"code": args.code, "sprintId": sprint["id"], "phase": sprint["phase"],
                          "detail": args.detail, "blockedBy": args.blocked_by or [], "createdAt": now}
    elif command == "resume":
        pause = state["pause"]
        if pause is None or pause["code"] != args.code: raise StateError("resume must supply the matching pause code")
        sprint = _sprint(state, pause["sprintId"])
        if sprint["phase"] != pause["phase"] or sprint["status"] not in {"blocked", "in-progress"}: raise StateError("paused sprint no longer matches")
        if sprint["status"] == "blocked": sprint["status"] = "in-progress"
        state["pause"] = None
    elif command == "open-decision":
        if any(x["id"] == args.decision_id for x in state["openDecisions"]): raise StateError("decision id already exists")
        state["openDecisions"].append({"id": args.decision_id, "sprintId": sprint["id"], "question": args.question,
                                       "chosenDefault": args.chosen_default, "reason": args.reason, "status": "open"})
    elif command == "resolve-decision":
        before = len(state["openDecisions"])
        state["openDecisions"] = [x for x in state["openDecisions"] if x["id"] != args.decision_id]
        if len(state["openDecisions"]) == before: raise StateError("unknown open decision")
    else: raise StateError(f"unknown command: {command}")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(); sub = parser.add_subparsers(dest="command", required=True)
    val = sub.add_parser("validate"); val.add_argument("state", type=Path)
    init = sub.add_parser("init"); init.add_argument("state", type=Path); init.add_argument("--document", type=Path, required=True)
    commands = ("start-sprint", "set-phase", "set-commit", "complete-sprint", "block-sprint", "fail-sprint",
                "archive-sprint", "pause", "resume", "open-decision", "resolve-decision")
    for name in commands:
        item = sub.add_parser(name); item.add_argument("state", type=Path); item.add_argument("--expected-revision", type=int, required=True)
        if name not in {"resume", "resolve-decision"}: item.add_argument("--sprint-id", required=True)
        if name == "set-phase": item.add_argument("--phase", required=True, choices=PHASES)
        if name == "set-commit": item.add_argument("--commit", required=True)
        if name == "complete-sprint": item.add_argument("--result-file")
        if name == "pause":
            item.add_argument("--code", required=True, choices=sorted(PAUSE_CODES)); item.add_argument("--detail", required=True); item.add_argument("--blocked-by", action="append")
        if name == "resume": item.add_argument("--code", required=True, choices=sorted(PAUSE_CODES))
        if name == "open-decision":
            item.add_argument("--decision-id", required=True); item.add_argument("--question", required=True); item.add_argument("--chosen-default", required=True); item.add_argument("--reason", required=True)
        if name == "resolve-decision": item.add_argument("--decision-id", required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.command == "validate": validate(json.loads(args.state.read_text())); print("valid"); return 0
        if args.command == "init":
            if args.state.exists(): raise StateError("state file already exists")
            document = json.loads(args.document.read_text()); validate(document)
            args.state.parent.mkdir(parents=True, exist_ok=True)
            fd, temp_name = tempfile.mkstemp(prefix=f".{args.state.name}.", dir=args.state.parent)
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as handle: json.dump(document, handle, indent=2); handle.write("\n"); handle.flush(); os.fsync(handle.fileno())
                os.replace(temp_name, args.state)
            except Exception:
                try: os.unlink(temp_name)
                except FileNotFoundError: pass
                raise
            print(json.dumps(document)); return 0
        now = dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")
        result = mutate(args.state, args.expected_revision, lambda: now, lambda state: apply_command(state, args.command, args, now))
        print(json.dumps(result)); return 0
    except (StateError, OSError, json.JSONDecodeError) as exc:
        print(f"state error: {exc}", file=sys.stderr); return 2


if __name__ == "__main__":
    raise SystemExit(main())
