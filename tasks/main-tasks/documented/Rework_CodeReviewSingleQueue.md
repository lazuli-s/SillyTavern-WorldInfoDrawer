# Rework: Code Review Single Queue

## Request

Update `.clinerules/workflows` code-review steps 1, 2, and 3 to use a single queue file:
`tasks/code-reviews/queue-code-review.md`.

## What Changed

- Updated `.clinerules/workflows/code-review-step-1-first-review.md`
  - Replaced `tasks/code-reviews/QUEUE_REVIEW.md` with `tasks/code-reviews/queue-code-review.md`.
  - Kept Step 1 section target as `## Files Pending Review`.
  - Queue update instructions now move the review output into `## Files Pending Meta-Review` in the same file.
- Updated `.clinerules/workflows/code-review-step-2-meta-review.md`
  - Replaced `tasks/code-reviews/QUEUE_META_REVIEW.md` with `tasks/code-reviews/queue-code-review.md`.
  - Kept Step 2 section target as `## Files Pending Meta-Review`.
  - Queue update instructions now move items to `## Files Pending Implementation` in the same file.
- Updated `.clinerules/workflows/code-review-step-3-implementation.md`
  - Replaced `tasks/code-reviews/QUEUE_IMPLEMENTATION.md` with `tasks/code-reviews/queue-code-review.md`.
  - Kept Step 3 section target as `## Files Pending Implementation`.
  - Queue removal step now removes from the same single queue file.
- Updated `tasks/code-reviews/queue-code-review.md`
  - Added missing `## Files Pending Meta-Review` section so Step 2 has a dedicated queue area.

## Why

This removes split queue management across multiple files and centralizes flow state in one queue document, matching the requested process.
