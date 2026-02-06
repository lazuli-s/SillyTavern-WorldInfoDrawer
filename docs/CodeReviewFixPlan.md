# FIX PLAN: Lorebook Folder Integrity and Async Safety

## PHASE 1

### LIST OF TASKS
- [x] F2 - Make folder import dialog completion deterministic (`src/listPanel.js` + `src/lorebookFolders.js`).
- [x] F2 - Update `openImportDialog` to guarantee a single resolution path for: file selected, invalid JSON, and picker-cancel/no-selection.
- [x] F2 - Ensure all resolution paths in the folder import action flow reach `finally` so `folderImportInProgress` is always reset.
- [ ] F2 - Verify "Import Into Folder" can be opened repeatedly after a canceled picker without page reload. (manual check)
- [x] F5 - Snapshot world name state immutably at duplicate start (`src/listPanel.js` `duplicateBook`) and stop using a live alias.
- [x] F5 - Use snapshot-vs-current diff logic consistently across immediate and polling detection paths.
- [x] F5 - Validate Ctrl-drag copy-to-folder and copy-to-root flows still receive the duplicated name reliably.
- [ ] Phase 1 validation pass: run targeted UI checks for canceled import, successful folder import, and duplicate detection under quick repeated actions. (manual check)

### Why it’s safe (what behavior remains unchanged)
These tasks keep existing user-facing behavior intact: imports still require user file selection, and duplication still uses the same core UI action. Changes are limited to completion guarantees and state snapshot correctness, not feature semantics.

### What might regress/change (1–3 side effects to watch for)
1. Picker cancel handling could resolve too aggressively on some browsers if focus/cancel detection behaves differently.
2. Duplicate detection could attribute the wrong new book if unrelated book creation happens at the same moment.
3. Additional guard paths may slightly delay the duplicate completion signal in edge timing cases.

## PHASE 2

### LIST OF TASKS
- [x] F1 - Replace stale-cache folder writes with fresh-read metadata updates in `setBookFolder` (`src/listPanel.js`) so folder assignment does not save outdated entry snapshots.
- [x] F1 - Apply the same fresh-read save strategy in multi-book folder operations that call `setBookFolder` (rename/import/delete folder flows) to reduce overwrite risk under concurrent edits.
- [ ] F1 - Add conflict-oriented validation pass: external edit + immediate folder move/rename should preserve the external edit. (manual check)
- [x] F3 - Tighten folder import attribution (`src/lorebookFolders.js`) so only confidently attributed books are auto-moved into target folders.
- [x] F3 - **Behavior Change Required:** when attribution confidence is low (for example, non-folder payload without stable book list), skip auto-move and surface a clear warning instead of moving all newly detected books.
- [x] F4 - Align folder active toggle action scope with its displayed state logic (`src/lorebookFolders.js`).
- [x] F4 - **Behavior Change Required:** toggle applies only to the same visible set used by the checkbox tri-state calculation.
- [x] F6 - Remove double full-refresh in book copy-drag handlers (`src/listPanel.js`) by collapsing operations to a single refresh after duplicate + folder assignment is finalized.
- [x] F7 - Add partial-failure handling for folder rename/delete batch loops (`src/lorebookFolders.js`): continue per-book processing, track failures, and report a per-operation summary.
- [x] F7 - Keep folder registry updates conservative during partial failures (do not remove folder registry entry if unresolved member books remain).
- [ ] Phase 2 validation pass: stress-test import attribution, filtered folder activation toggles, batch rename/delete under simulated failures, and large-library copy-drag responsiveness. (manual check)

### Why it’s safe (what behavior remains unchanged)
Changes stay localized to existing folder workflows and keep the same controls, menus, and primary user journeys. No dependencies, framework changes, or broad refactors are introduced.

### What might regress/change (1–3 side effects to watch for)
1. Auto-move behavior after import is now more conservative (fewer automatic moves in ambiguous cases).
2. Folder active toggle now applies only to visible books, matching the tri-state UI scope.
3. Batch folder operations can still be partial on failures, but failures are now surfaced and folder registry cleanup is conservative.