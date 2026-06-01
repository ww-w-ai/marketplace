#!/usr/bin/env bash
# init-doc-tree.sh — scaffold the cowork-doc-sync taxonomy folders (idempotent).
# Usage: init-doc-tree.sh [docs_dir]   (default: ./docs)
# Creates numbered folders + .gitkeep. Never overwrites existing files.
set -euo pipefail

DOCS_DIR="${1:-docs}"

# Numbered taxonomy (our authored docs). Tool-generated dirs (commit-log, bkit) are NOT created here.
FOLDERS=(
  "00-reference"
  "01-built"
  "02-planned"
  "03-manual"
  "04-legacy"
  "05-reports"
  "06-research"
  "99-misc"
)

mkdir -p "$DOCS_DIR"
for f in "${FOLDERS[@]}"; do
  dir="$DOCS_DIR/$f"
  mkdir -p "$dir"
  # .gitkeep so empty folders are tracked; never clobber existing content.
  [ -e "$dir/.gitkeep" ] || : > "$dir/.gitkeep"
done

echo "cowork-doc-sync taxonomy scaffolded under: $DOCS_DIR"
printf '  %s\n' "${FOLDERS[@]}"
echo "Next: add docs/CONVENTION.md (see cowork-doc-sync skill) and run /cowork-doc-init to relocate existing docs."
