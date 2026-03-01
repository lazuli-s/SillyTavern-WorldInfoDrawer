#!/bin/bash
# ------------------------------------------------------------------------------
# triage-batch.sh
#
# Task:    Run the triage-reviews skill in a loop until pending-implementation/
#          is empty, then commit all moved review files.
# Risk:    LOW - Codex moves files between folders only. No source code edits.
# Guardrail (optional):
#   Run on a throwaway branch for easy rollback:
#     git checkout -b reviews/codex-triage
# ------------------------------------------------------------------------------

set -e

PENDING_DIR="tasks/code-reviews/pending-implementation"

# -- Helpers -------------------------------------------------------------------

# Count .md files in the pending-implementation folder.
count_pending() {
  find "$PENDING_DIR" -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d ' '
}

# Get the basename of the first pending file (alphabetical order).
next_file() {
  find "$PENDING_DIR" -maxdepth 1 -name "*.md" 2>/dev/null | sort | head -1 | xargs -I{} basename {}
}

# -- Pre-flight ----------------------------------------------------------------

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex command not found in PATH."
  exit 1
fi

if [ ! -d "$PENDING_DIR" ]; then
  echo "ERROR: Pending folder not found: $PENDING_DIR"
  exit 1
fi

PENDING=$(count_pending)

if [ "${PENDING:-0}" -eq 0 ]; then
  echo "pending-implementation/ is already empty. Nothing to do."
  exit 0
fi

echo "=============================================================================="
echo "Codex triage batch started: $(date)"
echo "Files to triage: $PENDING"
echo "=============================================================================="

# -- Triage loop ---------------------------------------------------------------

RUN=0
TRIAGED=()

while true; do
  PENDING=$(count_pending)
  if [ "${PENDING:-0}" -eq 0 ]; then
    echo ""
    echo "pending-implementation/ is empty - all files triaged."
    break
  fi

  NEXT=$(next_file)
  RUN=$((RUN + 1))

  echo ""
  echo "-- Run ${RUN} -- ${NEXT} ----------------------------------------------"
  echo "Started: $(date)"

  # Each codex exec invocation is an isolated task with a fresh context.
  # SHELL=bash forces Codex to use bash instead of PowerShell on Windows.
  SHELL=bash codex exec --sandbox danger-full-access --full-auto \
    "Run the /triage-reviews skill now.

Follow the skill instructions exactly as written in:
  skills/triage-reviews/SKILL.md

Pick the FIRST file in tasks/code-reviews/pending-implementation/ and triage it.
Process that one file only.

Hard constraints - never violate these:
- Do NOT edit any source files. This is a triage operation only.
- Do NOT modify anything under vendor/SillyTavern/"

  TRIAGED+=("$NEXT")
  echo "Completed: $(date)"
done

echo ""
echo "Total files triaged: ${RUN}"

# -- Commit --------------------------------------------------------------------

# Stage only the review folders - not source code.
git add tasks/code-reviews/

if git diff --cached --quiet; then
  echo "No files were staged. Nothing to commit."
  exit 0
fi

# Build the file list for the commit body.
BODY=""
for F in "${TRIAGED[@]}"; do
  BODY="${BODY}- ${F}"$'\n'
done

git commit -m "$(printf 'chore(code-reviews): promote reviews after triage\n\nFiles triaged:\n%s' "$BODY")"

echo ""
echo "Committed."
