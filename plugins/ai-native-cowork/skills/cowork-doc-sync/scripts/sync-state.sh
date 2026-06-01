#!/usr/bin/env bash
# sync-state.sh — read/write the cowork-doc-sync "last sync" marker for a repo.
# The marker lets cowork-doc-sync gather drift since the LAST sync (across sessions),
# not just the current session. Conversation drift is machine-local (transcripts
# live in ~/.claude/projects), so this marker is gitignored local state.
#
# Usage:
#   sync-state.sh get [docs_dir]   -> prints "last_sync_at=<ISO|NONE> last_sync_commit=<sha|NONE>"
#   sync-state.sh set [docs_dir]   -> writes now + current HEAD to the marker
set -euo pipefail

CMD="${1:-get}"
DOCS_DIR="${2:-docs}"
MARKER="$DOCS_DIR/.doc-sync-state.json"

head_commit() { git rev-parse HEAD 2>/dev/null || echo "NONE"; }

case "$CMD" in
  get)
    if [ -f "$MARKER" ]; then
      at=$(grep -o '"last_sync_at"[^,}]*' "$MARKER" | sed 's/.*:[[:space:]]*"\(.*\)"/\1/' || echo NONE)
      sha=$(grep -o '"last_sync_commit"[^,}]*' "$MARKER" | sed 's/.*:[[:space:]]*"\(.*\)"/\1/' || echo NONE)
      echo "last_sync_at=${at:-NONE} last_sync_commit=${sha:-NONE}"
    else
      echo "last_sync_at=NONE last_sync_commit=NONE"
    fi
    ;;
  set)
    mkdir -p "$DOCS_DIR"
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    sha=$(head_commit)
    printf '{\n  "last_sync_at": "%s",\n  "last_sync_commit": "%s"\n}\n' "$now" "$sha" > "$MARKER"
    # Ensure the marker is gitignored (machine-local; pairs with machine-local transcripts).
    if [ -f .gitignore ] && ! grep -q '.doc-sync-state.json' .gitignore 2>/dev/null; then
      echo "$DOCS_DIR/.doc-sync-state.json" >> .gitignore
    fi
    echo "cowork-doc-sync marker set: $now @ $sha"
    ;;
  *)
    echo "usage: sync-state.sh {get|set} [docs_dir]" >&2; exit 2 ;;
esac
