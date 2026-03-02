#!/usr/bin/env bash
set -euo pipefail

PENDING_DIR="tasks/code-reviews/pending-implementation"

count_pending() {
  shopt -s nullglob
  local files=("$PENDING_DIR"/*.md)
  echo "${#files[@]}"
}

next_file() {
  shopt -s nullglob
  local files=("$PENDING_DIR"/*.md)
  if [ "${#files[@]}" -eq 0 ]; then
    echo ""
    return
  fi
  printf '%s\n' "${files[@]}" | sort | head -n 1
}

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex command not found in PATH."
  exit 1
fi

if [ ! -d "$PENDING_DIR" ]; then
  echo "ERROR: Pending folder not found: $PENDING_DIR"
  exit 1
fi

PENDING="$(count_pending)"
if [ "${PENDING:-0}" -eq 0 ]; then
  echo "pending-implementation is already empty. Nothing to do."
  exit 0
fi

echo "Codex triage batch started: $(date)"
echo "Files to triage: $PENDING"

RUN=0
TRIAGED=()

while true; do
  PENDING="$(count_pending)"
  if [ "${PENDING:-0}" -eq 0 ]; then
    echo "pending-implementation is empty. All files triaged."
    break
  fi

  NEXT_PATH="$(next_file)"
  NEXT_BASE="$(basename "$NEXT_PATH")"
  RUN=$((RUN + 1))

  echo "-- Run ${RUN}: ${NEXT_BASE}"
  echo "Started: $(date)"

  codex exec --full-auto --sandbox workspace-write "Run triage-reviews for exactly one file.

Target file:
$NEXT_PATH

Requirements:
- Follow skills/triage-reviews/SKILL.md behavior.
- Process ONLY this target file.
- Do not scan directories with shell commands.
- Do not run PowerShell Get-ChildItem/Get-Content.
- Do not edit source code files.
- Do not modify vendor/SillyTavern.
- Keep output and edits ASCII-only (no emoji)."

  TRIAGED+=("$NEXT_BASE")
  echo "Completed: $(date)"
done

echo "Total files triaged: ${RUN}"

git add tasks/code-reviews/

if git diff --cached --quiet; then
  echo "No files were staged. Nothing to commit."
  exit 0
fi

BODY=""
for F in "${TRIAGED[@]}"; do
  BODY="${BODY}- ${F}"$'\n'
done

git commit -m "$(printf 'chore(code-reviews): promote reviews after triage\n\nFiles triaged:\n%s' "$BODY")"

echo "Committed."