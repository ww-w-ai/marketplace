#!/usr/bin/env python3
"""Check (and sync) a plugin release. See ../RELEASE.md.

  release.py check <plugin> <source-repo-dir> [--version X.Y.Z] [--local]
  release.py sync  <plugin> <source-repo-dir>  --version X.Y.Z

`check` reads only pushed state (origin, GitHub) and exits 1 when any step is missing.
`sync` copies the files of tag vX.Y.Z into plugins/<plugin> and sets marketplace.json.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

MARKET = Path(__file__).resolve().parent.parent
MARKET_JSON = ".claude-plugin/marketplace.json"
# Top-level paths of a source repository that are shipped in the Codex copy.
SHIPPED_DIRS = (".claude-plugin", ".codex-plugin", "skills")
VERSION_FILES = (".claude-plugin/plugin.json", ".codex-plugin/plugin.json")

failures = []


def run(args, check=True):
    done = subprocess.run(args, capture_output=True)
    if check and done.returncode:
        sys.exit(f"command failed: {' '.join(args)}\n{done.stderr.decode()}")
    return done


def git(repo, *args, check=True):
    return run(["git", "-C", str(repo), *args], check)


def show(repo, ref, path):
    done = git(repo, "show", f"{ref}:{path}", check=False)
    return done.stdout if done.returncode == 0 else None


def tree(repo, ref, prefix=""):
    out = git(repo, "ls-tree", "-r", "--name-only", ref, "--", prefix or ".").stdout.decode()
    return set(out.splitlines())


def report(ok, text):
    print(("PASS " if ok else "FAIL ") + text)
    if not ok:
        failures.append(text)


def version_of(blob):
    return json.loads(blob)["version"] if blob else None


def market_version(plugin, blob):
    return next((p.get("version") for p in json.loads(blob)["plugins"] if p["name"] == plugin), None)


def expected_files(repo, ref, plugin):
    """Source files the Codex copy must hold: shipped dirs, plus any other file the copy already has."""
    source = tree(repo, ref)
    prefix = f"plugins/{plugin}/"
    copied = {f[len(prefix):] for f in tree(MARKET, "origin/main", prefix)}
    wanted = {f for f in source if f.split("/")[0] in SHIPPED_DIRS} | (copied & source)
    return wanted, copied - source


def check(plugin, repo, version, local):
    git(repo, "fetch", "-q", "origin", "--tags")
    git(MARKET, "fetch", "-q", "origin")
    head = version_of(show(repo, "origin/main", VERSION_FILES[0]))
    version = version or head
    tag = f"v{version}"
    print(f"{plugin} {version}")
    report(head == version, f"source origin/main plugin.json is {version} (found {head})")
    for path in VERSION_FILES[1:]:
        found = version_of(show(repo, "origin/main", path))
        report(found == version, f"source {path} is {version} (found {found})")

    tagged = git(repo, "ls-remote", "--tags", "origin", f"refs/tags/{tag}").stdout.strip()
    report(bool(tagged), f"tag {tag} is pushed")
    if tagged:
        peeled = git(repo, "ls-remote", "origin", f"refs/tags/{tag}^{{}}").stdout.split()
        report(bool(peeled), f"tag {tag} is annotated")
        if peeled:
            at = show(repo, peeled[0].decode(), VERSION_FILES[0])
            report(version_of(at) == version, f"tag {tag} sits on a commit whose plugin.json is {version}")

    url = git(repo, "remote", "get-url", "origin").stdout.decode().strip()
    slug = re.sub(r"^.*github\.com[:/]|\.git$", "", url)
    latest = run(["gh", "api", f"repos/{slug}/releases/latest", "-q", ".tag_name"], check=False)
    found = latest.stdout.decode().strip() if latest.returncode == 0 else "none"
    report(found == tag, f"GitHub latest release is {tag} (found {found})")

    listed = market_version(plugin, show(MARKET, "origin/main", MARKET_JSON))
    report(listed == version, f"marketplace.json lists {version} (found {listed})")

    ref = tag if tagged else "origin/main"
    wanted, extra = expected_files(repo, ref, plugin)
    stale = sorted(f for f in wanted
                   if show(repo, ref, f) != show(MARKET, "origin/main", f"plugins/{plugin}/{f}"))
    report(not stale, f"Codex copy matches {ref}: {len(stale)} files differ or are missing")
    for f in stale[:15]:
        print(f"       {f}")
    report(not extra, f"Codex copy has no file that {ref} dropped: {sorted(extra)[:10]}")

    if local:
        for tool in (["claude", "plugin", "list"], ["codex", "plugin", "list"]):
            lines = run(tool, check=False).stdout.decode().splitlines()
            at = [i for i, line in enumerate(lines) if f"{plugin}@" in line]
            # Claude Code prints "Version:" on the next line; Codex prints it on the same line.
            seen = " ".join(lines[i] + (" " + lines[i + 1] if i + 1 < len(lines) and "Version:" in lines[i + 1] else "")
                            for i in at)
            versions = set(re.findall(r"\b\d+\.\d+\.\d+\b", seen))
            report(versions == {version}, f"local {tool[0]} install is {version} (found {sorted(versions)})")

    if failures:
        print(f"\nNOT RELEASED: {len(failures)} step(s) missing.")
        sys.exit(1)
    print("\nRELEASED: every step is done.")


def sync(plugin, repo, version):
    tag = f"v{version}"
    git(repo, "fetch", "-q", "origin", "--tags")
    git(MARKET, "fetch", "-q", "origin")
    if show(repo, tag, VERSION_FILES[0]) is None or version_of(show(repo, tag, VERSION_FILES[0])) != version:
        sys.exit(f"tag {tag} is missing or its plugin.json is not {version}")
    wanted, extra = expected_files(repo, tag, plugin)
    base = MARKET / "plugins" / plugin
    for f in sorted(wanted):
        target = base / f
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(show(repo, tag, f))
    for f in sorted(extra):
        (base / f).unlink(missing_ok=True)
    # -f: the copy's own .gitignore (e.g. *.wav) must not drop files the tag ships.
    git(MARKET, "add", "-f", "--", *[f"plugins/{plugin}/{f}" for f in sorted(wanted)])
    if extra:
        git(MARKET, "add", "-A", "--", *[f"plugins/{plugin}/{f}" for f in sorted(extra)])

    listing = MARKET / MARKET_JSON
    text = listing.read_text(encoding="utf-8")
    old = market_version(plugin, text)
    start = text.index(f'"name": "{plugin}"')
    at = text.index(f'"version": "{old}"', start)
    text = text[:at] + f'"version": "{version}"' + text[at + len(f'"version": "{old}"'):]
    listing.write_text(text, encoding="utf-8")
    git(MARKET, "add", "--", MARKET_JSON)
    print(git(MARKET, "status", "--short").stdout.decode() or "no change")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=["check", "sync"])
    parser.add_argument("plugin")
    parser.add_argument("source")
    parser.add_argument("--version")
    parser.add_argument("--local", action="store_true")
    args = parser.parse_args()
    if args.command == "sync":
        if not args.version:
            parser.error("sync needs --version")
        sync(args.plugin, args.source, args.version)
    else:
        check(args.plugin, args.source, args.version, args.local)
