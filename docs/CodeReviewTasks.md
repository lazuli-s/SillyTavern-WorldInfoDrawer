# Tasks Checklist

This checklist is derived from `docs/CodeReviewFindings.md` and is intended to be used as a **work plan** for future, minimal, behavior-preserving fixes.

## High priority (data integrity)

- [ ] **T1 (from F1)**: Strengthen dirty-state detection so editor auto-refresh cannot discard in-progress edits.

- [x] **T2 (from F3)**: Batch move/copy drag-drop saves to avoid per-entry saves and partial-move states.

## Medium priority (race conditions / async ordering)

- [x] **T3 (from F2)**: Avoid wasted template rendering when clicking entries rapidly.

- [x] **T4 (from F4)**: Reduce mis-assignment risk when importing into folder.

## Medium priority (leaks / repeated handlers)

- [ ] **T5 (from F5)**: Track and disconnect MutationObservers / global listeners on teardown/reload.

## Medium priority (performance)

- [ ] **T6 (from F6)**: Reduce `JSON.stringify` deep-compare overhead in `updateWIChange()`.

- [ ] **T7 (from F10)**: Reduce expensive CSS `:has()` usage in hot paths.

## Medium priority (robustness)

- [ ] **T8 (from F7)**: Defensively handle malformed entry fields (e.g., `key` not an array).

- [ ] **T9 (from F8)**: Ensure list panel reflects Order Helper apply results without requiring manual refresh.

- [ ] **T10 (from F9)**: Replace fixed delays in duplicate/delete with robust waiting.
