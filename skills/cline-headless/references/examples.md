# Cline Headless — Script Examples

Complete, ready-to-run Git Bash scripts for each use case. Customize the `TASK` or file list sections as needed.

---

## 1. Code Review

**Task:** Pipe your current uncommitted changes into Cline for a code review.
**Risk:** Low — Cline reads only. No files are modified.
**Guardrails:** None required.

```bash
#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# cline-review-diff.sh
# Task:   Review uncommitted changes with Cline
# Risk:   LOW — Cline reads only. No files are modified.
# ──────────────────────────────────────────────────────────────────

set -e

DIFF=$(git diff HEAD)

if [ -z "$DIFF" ]; then
  echo "No uncommitted changes found."
  echo "To review the last commit instead, use: git diff HEAD~1"
  exit 0
fi

echo "$DIFF" | cline "Review these code changes for:
- Logic errors and edge cases
- Security issues (XSS, injection, prototype pollution)
- Performance concerns
- Unused variables or dead code
- Browser extension conventions (no frameworks, no build step, no backend)

Provide a concise, actionable summary of findings. Group issues by severity."
```

**Variant — review the last commit (already pushed):**

```bash
git diff HEAD~1 | cline "Review this commit for bugs and issues. Summarize findings."
```

**Variant — review only staged changes before committing:**

```bash
git diff --cached | cline "Review these staged changes before I commit them."
```

---

## 2. Fix ESLint Errors

**Task:** Run Cline autonomously to find and fix all ESLint errors in `src/`.
**Risk:** Medium — Cline edits source files.
**Guardrails (suggested):**
- Run on a feature branch: `git checkout -b fix/lint-errors`
- Review changes after: `git diff`

```bash
#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# cline-fix-lint.sh
# Task:   Auto-fix ESLint errors in src/ with Cline
# Risk:   MEDIUM — Cline edits source files directly.
# Guardrail: Run on a feature branch before executing.
#   git checkout -b fix/lint-errors
# ──────────────────────────────────────────────────────────────────

set -e

# Warn if on a protected branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "WARNING: You are on '$BRANCH'. Cline will edit files."
  echo "Recommended: git checkout -b fix/lint-errors"
  echo "Press Enter to continue anyway, or Ctrl+C to abort."
  read -r
fi

cline -y --timeout 300 "Fix all ESLint errors found in the src/ directory.

Rules:
- Fix lint errors only — do not refactor, add features, or change behavior
- Preserve all existing comments and logic
- Do not add new imports or dependencies
- Keep changes as minimal and targeted as possible"

echo ""
echo "Done. Review changes with: git diff"
```

**Variant — fix failing tests:**

```bash
cline -y --timeout 600 "Run the test suite and fix any failing tests. Do not change passing tests."
```

---

## 3. Commit Message Generation

**Task:** Generate a conventional commit message from staged changes.
**Risk:** Low — Cline reads staged diff only. No files are modified.
**Guardrails:** None required. Review Cline's output before using it.

```bash
#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# cline-commit-msg.sh
# Task:   Generate a commit message from staged changes
# Risk:   LOW — Cline reads diff only. No files are modified.
# ──────────────────────────────────────────────────────────────────

set -e

DIFF=$(git diff --cached)

if [ -z "$DIFF" ]; then
  echo "No staged changes. Stage your files first:"
  echo "  git add <files>"
  exit 0
fi

echo "$DIFF" | cline "Write a conventional commit message for these staged changes.

Format:
  type(scope): brief description in imperative mood

Allowed types:  new-feat, fix, rework, style, docs, refactor, chore
Common scopes:  ui, editor, css, order-helper, entry-list

Rules:
- Subject line under 72 characters
- Imperative mood: 'add', 'fix', 'remove' — not 'added' or 'fixing'
- No period at the end
- If changes span multiple concerns, add a short body paragraph below a blank line

Output only the commit message — no extra commentary."
```

---

## 4. Release Notes Generation

**Task:** Generate user-facing release notes from recent git commits.
**Risk:** Low — Cline reads git log only. No files are modified.
**Guardrails:** Verify tag names before running.

```bash
#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# cline-release-notes.sh
# Task:   Generate release notes from git history between two tags
# Risk:   LOW — Cline reads git log only. No files are modified.
# ──────────────────────────────────────────────────────────────────

set -e

# ── EDIT THESE ───────────────────────────────────────────────────
FROM_TAG="v0.1.0"   # Start tag (exclusive)
TO_TAG="HEAD"       # End tag (inclusive) — or use "v0.2.0"
# ─────────────────────────────────────────────────────────────────

LOG=$(git log --oneline "${FROM_TAG}..${TO_TAG}")

if [ -z "$LOG" ]; then
  echo "No commits found between $FROM_TAG and $TO_TAG."
  echo "Check your tags with: git tag --list"
  exit 0
fi

echo "$LOG" | cline "Write user-friendly release notes from these git commits.

Format as a bullet list grouped by category:
- New Features
- Bug Fixes
- Improvements

Rules:
- Write for a non-developer user — plain, friendly language
- Translate technical commit messages into what changed for the user
- Skip chore, refactor, or docs-only commits
- Keep each bullet to one clear sentence

Output only the release notes — no extra commentary."
```

**Variant — last 10 commits (no tags needed):**

```bash
git log --oneline -10 | cline "Write friendly release notes from these recent commits."
```

---

## 5. Batch File Processing

**Task:** Apply a repeated instruction to multiple JS files, one at a time.
**Risk:** High — Cline edits every file in the list.
**Guardrails (strongly suggested):**
- Run on a feature branch: `git checkout -b refactor/batch-task`
- Restrict what Cline can do: `CLINE_COMMAND_PERMISSIONS` (see below)
- Set a timeout per file with `--timeout`

```bash
#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# cline-batch-files.sh
# Task:   Apply a repeated Cline task to a list of files
# Risk:   HIGH — Cline edits every file in the list.
# Guardrail: Run on a feature branch before executing.
#   git checkout -b refactor/your-task
# ──────────────────────────────────────────────────────────────────

set -e

# Optional: restrict Cline to safe commands only (no shell execution)
# Remove or adjust the allow list as needed.
export CLINE_COMMAND_PERMISSIONS='{"allow": ["git *"], "deny": ["rm *", "sudo *"]}'

# Warn if on a protected branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "WARNING: You are on '$BRANCH'. This script will edit multiple files."
  echo "Strongly recommended: git checkout -b refactor/your-task"
  echo "Press Enter to continue, or Ctrl+C to abort."
  read -r
fi

# ── EDIT THIS TASK ───────────────────────────────────────────────
TASK="Add JSDoc comments to all exported functions in this file.
Rules:
- Only add comments where they are missing
- Do not change any existing code or logic
- Keep comments concise and accurate"
# ─────────────────────────────────────────────────────────────────

# ── EDIT THIS FILE LIST ──────────────────────────────────────────
FILES=(
  "src/module1.js"
  "src/module2.js"
  "src/module3.js"
)
# ─────────────────────────────────────────────────────────────────

PROCESSED=0
SKIPPED=0

for FILE in "${FILES[@]}"; do
  if [ ! -f "$FILE" ]; then
    echo "Skipping (not found): $FILE"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "Processing: $FILE"
  cat "$FILE" | cline -y --timeout 120 "File: $FILE

$TASK"
  PROCESSED=$((PROCESSED + 1))
  echo "Done: $FILE"
done

echo ""
echo "Summary: $PROCESSED processed, $SKIPPED skipped."
echo "Review all changes with: git diff"
```

---

## Key flags quick reference

| Flag | What it does |
|------|-------------|
| `-y` / `--yolo` | Auto-approve all actions; enters headless mode |
| `--timeout 300` | Stop after 300 seconds (5 min); adjust per task complexity |
| `--json` | Output JSON (one object per line); parse with `jq` |
| `-m claude-sonnet-4-6` | Use a specific model for this task |
| `--config ~/.cline-cheap` | Use an alternate Cline config (e.g., cheaper model profile) |
| `-c ~/path` | Run Cline in a different working directory |

## CLINE_COMMAND_PERMISSIONS examples

```bash
# Read-only git (safest for review tasks)
export CLINE_COMMAND_PERMISSIONS='{"allow": ["git log *", "git diff *", "git show *"]}'

# Allow git and npm but block destructive commands
export CLINE_COMMAND_PERMISSIONS='{"allow": ["git *", "npm *"], "deny": ["rm *", "sudo *", "git push *"]}'

# Allow file reads and redirects (for analysis tasks)
export CLINE_COMMAND_PERMISSIONS='{"allow": ["cat *", "git *"], "allowRedirects": true}'
```
