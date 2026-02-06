CODE REVIEW FINDINGS

- 1) Stale Cache Save Can Overwrite Newer Book Data During Folder Moves
  - Location: `src/listPanel.js` + `setBookFolder` (anchor: `await state.saveWorldInfo(name, state.buildSavePayload(name), true);`)
  - What the issue is: Folder assignment is persisted by saving the full cached payload (`entries` + `metadata`) from `state.cache` instead of reloading latest book data first. If another update lands between cache refresh cycles, this save can write an older snapshot.
  - Why it matters (impact): User edits made from another UI path/extension (or just before debounced sync lands) can be reverted when moving/renaming books across folders.
  - Severity: High
  - Fix risk: Medium
  - Confidence: Medium
  - Repro idea: Edit a book through another path that writes World Info, then quickly move that book to a folder before the drawer catches up; compare entry fields before/after move for reverted values.
  - Suggested direction: Persist only the folder metadata change against a freshly loaded book snapshot, or block folder-save actions until pending WI update cycles settle.

- 2) Import-Into-Folder Can Hang Forever on File Picker Cancel
  - Location: `src/listPanel.js` + `openImportDialog`, and `src/lorebookFolders.js` import menu handler (anchor: `const importPayload = await menuActions.openImportDialog();`)
  - What the issue is: `openImportDialog()` resolves only on `change` of `#world_import_file`. If cancel does not emit `change`, the promise never resolves, and the folder import flow never reaches `finally`.
  - Why it matters (impact): `folderImportInProgress` can stay true indefinitely, effectively disabling future "Import Into Folder" actions until reload.
  - Severity: High
  - Fix risk: Low
  - Confidence: Medium
  - Repro idea: Open a folder menu -> `Import Into Folder` -> cancel picker without selecting a file; attempt import again and observe action blocked/no-op.
  - Suggested direction: Add a cancellation/timeout path for dialog completion and always guarantee `folderImportInProgress` is cleared.

- 3) Import Attribution Can Move Unrelated Books into Folder
  - Location: `src/lorebookFolders.js` + folder menu import handler (anchor: `const attributedNames = expectedBookNames.length ? ... : newNames;`)
  - What the issue is: When the selected file does not expose `payload.books` (common for single-book import JSON), attribution falls back to all newly detected names in the time window.
  - Why it matters (impact): Any unrelated create/duplicate occurring during the same window can be incorrectly moved into the target folder.
  - Severity: Medium
  - Fix risk: Medium
  - Confidence: Medium
  - Repro idea: Start `Import Into Folder` with a normal (non-folder-bundle) import file, then create/duplicate another book before settle; verify both get moved.
  - Suggested direction: Treat non-attributable imports conservatively (no auto-move) or require stronger attribution criteria before applying folder metadata.

- 4) Folder Active Toggle State Uses Visible Books but Action Applies to All Books
  - Location: `src/lorebookFolders.js` + `updateActiveToggle` and folder active toggle `change` handler (anchors: `visibleBookNames = ...` and `const bookNames = getFolderBookNames(...)`)
  - What the issue is: Checkbox state/disabled logic is computed from visible (filtered) books, but applying the toggle writes activation for all books in that folder.
  - Why it matters (impact): Hidden books can be unexpectedly activated/deactivated, creating hard-to-notice global state changes.
  - Severity: Medium
  - Fix risk: Low
  - Confidence: High
  - Repro idea: Filter the list so some folder books are hidden, toggle the folder active checkbox, clear filters, and inspect hidden books' active state.
  - Suggested direction: Align UI semantics and action scope: either compute state from all books or apply only to the same visible set used by the control.

- 5) Duplicate Detection Can Miss New Book Due Live Array Aliasing
  - Location: `src/listPanel.js` + `duplicateBook` (anchor: `const initialNames = state.getWorldNames ? state.getWorldNames() : state.world_names;`)
  - What the issue is: `initialNames` is not snapshotted. If the underlying names array is mutated in place, `initialNames.includes(newName)` becomes true and diff detection fails.
  - Why it matters (impact): `duplicateBook()` may return `null` after timeout even when duplication succeeded, breaking copy-drag folder placement workflows.
  - Severity: Medium
  - Fix risk: Low
  - Confidence: Medium
  - Repro idea: Duplicate a book while logging whether `initialNames === getNames()`; if true and names mutate in place, duplicate exists but function times out.
  - Suggested direction: Snapshot names immutably before triggering duplicate, then diff against fresh snapshots only.

- 6) Copy-Drag Book Path Performs Two Full List Rebuilds
  - Location: `src/listPanel.js` + book/folder/root drop handlers (anchors: `await refreshList(); ... if (updated) await refreshList();`)
  - What the issue is: Copy flows duplicate, refresh full list, then set folder metadata and refresh full list again.
  - Why it matters (impact): Unnecessary DOM teardown/rebuild increases latency on large libraries and raises risk of disrupting active editor context.
  - Severity: Low
  - Fix risk: Medium
  - Confidence: High
  - Repro idea: With many books/entries, Ctrl-drag copy a book to a folder and compare responsiveness against non-copy move.
  - Suggested direction: Collapse copy flow into a single post-operation refresh, or use incremental update hooks where safe.

- 7) Folder Rename/Delete Loops Can Leave Partial State on Mid-Operation Failure
  - Location: `src/lorebookFolders.js` + rename/delete handlers (anchors: loops at `for (const bookName of bookNames) { await menuActions.setBookFolder(...) }` and `await menuActions.deleteBook?.(...)`)
  - What the issue is: Batch operations run sequential saves/deletes without per-item recovery/rollback. A failure mid-loop leaves some books moved/deleted and others untouched.
  - Why it matters (impact): Folder integrity can become inconsistent, and cleanup (registry/book placement) may require manual repair.
  - Severity: Medium
  - Fix risk: Medium
  - Confidence: Medium
  - Repro idea: Simulate save/delete failure during folder rename/delete (e.g., failing network/storage path) and inspect resulting mixed folder membership.
  - Suggested direction: Add failure accounting and user-visible partial-result handling so operations remain explicit and recoverable.
