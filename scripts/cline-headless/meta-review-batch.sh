#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# meta-review-batch.sh
#
# Task:    Run the code-review-meta-review skill in a loop until the
#          pending-meta-review folder is empty, then commit all changes.
# Risk:    MEDIUM — Cline updates review files and moves them to the next stage.
#          No source files are modified.
# Guardrail (optional):
#   Run on a throwaway branch for easy rollback:
#     git checkout -b reviews/meta-batch
# ──────────────────────────────────────────────────────────────────────────────

set -e

PENDING_DIR="tasks/code-reviews/pending-meta-review"
LOG_DIR="scripts/cline-headless/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/meta-review-batch-${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

# ── Helpers ───────────────────────────────────────────────────────────────────

log() { echo "$1" | tee -a "$LOG_FILE"; }

# Count CodeReview_*.md files in the pending folder.
count_pending() {
  local n
  n=$(find "${PENDING_DIR}" -maxdepth 1 -name "CodeReview_*.md" 2>/dev/null | wc -l)
  echo "${n:-0}"
}

# Return the basename of the first file (alphabetical) from the pending folder.
next_file() {
  find "${PENDING_DIR}" -maxdepth 1 -name "CodeReview_*.md" 2>/dev/null \
    | sort | head -1 | xargs -I{} basename {}
}

# ── Pre-flight ────────────────────────────────────────────────────────────────

if [ ! -d "$PENDING_DIR" ]; then
  echo "ERROR: Folder not found: $PENDING_DIR"
  exit 1
fi

PENDING=$(count_pending)

if [ "${PENDING:-0}" -eq 0 ]; then
  echo "pending-meta-review folder is empty. Nothing to do."
  exit 0
fi

log "═══════════════════════════════════════════════════════════════════════════"
log "Meta-review batch started: $(date)"
log "Files in folder: $PENDING"
log "Log file: $LOG_FILE"
log "═══════════════════════════════════════════════════════════════════════════"

# ── Review loop ───────────────────────────────────────────────────────────────

RUN=0
REVIEWED=()

while true; do
  PENDING=$(count_pending)
  if [ "${PENDING:-0}" -eq 0 ]; then
    log ""
    log "Folder is empty — all meta-reviews complete."
    break
  fi

  NEXT=$(next_file)
  RUN=$((RUN + 1))

  log ""
  log "── Run ${RUN} ── ${NEXT} ──────────────────────────────────────────────"
  log "Started: $(date)"

  # Each 'cline -y' invocation is a completely isolated task with a fresh
  # context. No conversation history is shared between runs.
  cline -y --timeout 900 \
    "Run the /code-review-meta-review skill now.

Follow the skill instructions exactly as written in:
  skills/code-review-meta-review/SKILL.md

Pick the FIRST file (alphabetical order) from:
  tasks/code-reviews/pending-meta-review/

Complete the full meta-review for that one file only.
Insert the STEP 2 section into each finding and move the file to the next stage folder.

Hard constraints — never violate these:
- Do NOT modify anything under vendor/SillyTavern/
- Use write_to_file or replace_in_file for all file writes. Never use apply_patch." \
    2>&1 | tee -a "$LOG_FILE"

  REVIEWED+=("$NEXT")
  log "Completed: $(date)"
done

log ""
log "Total meta-reviews completed: ${RUN}"

# ── Commit ────────────────────────────────────────────────────────────────────

git add tasks/code-reviews/

if git diff --cached --quiet; then
  log "No review files were staged. Nothing to commit."
  exit 0
fi

BODY=""
for F in "${REVIEWED[@]}"; do
  BODY="${BODY}- ${F}"$'\n'
done

git commit -m "$(printf 'code-review(meta-review): add meta-review results from batch run\n\nFiles reviewed:\n%s' "$BODY")"

log ""
log "Committed. Log saved to: ${LOG_FILE}"
