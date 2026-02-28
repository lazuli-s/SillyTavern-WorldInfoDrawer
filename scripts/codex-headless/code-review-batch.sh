#!/bin/bash
# ------------------------------------------------------------------------------
# code-review-batch.sh
#
# Task:    Run the code-review-first-review skill in a loop until the review
#          queue is empty, then commit all new review report files.
# Risk:    MEDIUM - Codex writes new review files and updates the queue/tracker.
# Guardrail (optional):
#   Run on a throwaway branch for easy rollback:
#     git checkout -b reviews/codex-batch
# ------------------------------------------------------------------------------

set -e

QUEUE="tasks/code-reviews/code-review-queue.md"
LOG_DIR="scripts/codex-headless/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/code-review-batch-${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

# -- Helpers -------------------------------------------------------------------

log() { echo "$1" | tee -a "$LOG_FILE"; }

# Count lines matching '- `...`' in the queue file.
# grep -c exits 1 when count is 0; '|| true' keeps set -e happy.
count_pending() {
  local n
  n=$(grep -c '^- `' "$QUEUE" 2>/dev/null || true)
  echo "${n:-0}"
}

# Extract the first pending filename from the queue (without backticks).
next_file() {
  grep '^- `' "$QUEUE" | head -1 | sed 's/^- `//; s/`$//'
}

# -- Pre-flight ----------------------------------------------------------------

if [ ! -f "$QUEUE" ]; then
  echo "ERROR: Queue file not found: $QUEUE"
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex command not found in PATH."
  exit 1
fi

PENDING=$(count_pending)

if [ "${PENDING:-0}" -eq 0 ]; then
  echo "Queue is already empty. Nothing to do."
  exit 0
fi

log "=============================================================================="
log "Codex code-review batch started: $(date)"
log "Files in queue: $PENDING"
log "Log file: $LOG_FILE"
log "=============================================================================="

# -- Review loop ---------------------------------------------------------------

RUN=0
REVIEWED=()

while true; do
  PENDING=$(count_pending)
  if [ "${PENDING:-0}" -eq 0 ]; then
    log ""
    log "Queue is empty - all reviews complete."
    break
  fi

  NEXT=$(next_file)
  RUN=$((RUN + 1))

  log ""
  log "-- Run ${RUN} -- ${NEXT} ----------------------------------------------"
  log "Started: $(date)"

  # Each codex exec invocation is an isolated task with a fresh context.
  codex exec --sandbox workspace-write --full-auto \
    "Run the /code-review-first-review skill now.

Follow the skill instructions exactly as written in:
  skills/code-review-first-review/SKILL.md

Pick the FIRST file listed under '## Files Pending Review' in:
  tasks/code-reviews/code-review-queue.md

Complete the full first-pass review for that one file only.
Write the findings report, remove the file from the queue, and update the tracker.

Hard constraints - never violate these:
- Do NOT edit any source files. This is a READ-ONLY review.
- Do NOT modify anything under vendor/SillyTavern/" \
    2>&1 | tee -a "$LOG_FILE"

  REVIEWED+=("$NEXT")
  log "Completed: $(date)"
done

log ""
log "Total reviews completed: ${RUN}"

# -- Commit --------------------------------------------------------------------

# Stage only the review output files - not source code.
git add tasks/code-reviews/

if git diff --cached --quiet; then
  log "No review files were staged. Nothing to commit."
  exit 0
fi

# Build the file list for the commit body.
BODY=""
for F in "${REVIEWED[@]}"; do
  BODY="${BODY}- ${F}"$'\n'
done

git commit -m "$(printf 'code-review(first-review): add review reports from codex batch run\n\nFiles reviewed:\n%s' "$BODY")"

log ""
log "Committed. Log saved to: ${LOG_FILE}"
