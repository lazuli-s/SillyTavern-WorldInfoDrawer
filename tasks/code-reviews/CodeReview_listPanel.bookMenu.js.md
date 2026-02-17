# CODE REVIEW FINDINGS: `src/listPanel.bookMenu.js`

*Reviewed: February 17, 2026*

## Scope

- **File reviewed:** `src/listPanel.bookMenu.js`
- **Helper files consulted:** `src/listPanel.js`, `src/wiUpdateHandler.js`
- **Skills applied:** `st-js-best-practices`, `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** Book context-menu actions (rename/move folder/duplicate/export/delete), fill-empty-titles action, per-book sort preference controls, and optional integrations (Bulk Edit / External Editor / STLO).

---

## F01: Duplicate-book detection can pick the wrong new book under concurrent creates

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When two book-creation actions happen close together, the duplicate flow can mistake a different newly created book as the duplicate target.

- **Location:**
  `src/listPanel.bookMenu.js` - `duplicateBook` and `duplicateBookIntoFolder`

  Anchor:
  ```js
  const findNewName = ()=>{
      const currentNames = getNames() ?? [];
      return currentNames.find((entry)=>!initialNameSet.has(entry)) ?? null;
  };
  ```

- **Detailed Finding:**
  `duplicateBook` snapshots `world_names`, triggers core duplicate, then resolves the new book by returning the first unseen name from the current list. If another action creates a book during the same window (for example import/new-book from another UI flow), `findNewName()` can return that unrelated book. `duplicateBookIntoFolder` trusts this value and calls `setBookFolder(duplicatedName, folderName)`, so the wrong book can be moved.

- **Why it matters:**
  Users can end up moving or operating on the wrong book after a duplicate operation.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** Race Condition

- **Reproducing the issue:**
  1. Start a duplicate-to-folder action (for example Ctrl-copy drag to a folder).
  2. Before duplicate detection resolves, trigger a second flow that creates a different book.
  3. Observe the folder move can apply to the unrelated new book.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make duplicate detection reject ambiguous results instead of selecting the first unseen name. Returning no match is safer than returning the wrong match.

- **Proposed fix:**
  In `duplicateBook`, replace `findNewName()` usage with logic that computes `addedNames = currentNames.filter((entry)=>!initialNameSet.has(entry))`. Return a name only when `addedNames.length === 1`; otherwise keep waiting until timeout and finally return `null`. In `duplicateBookIntoFolder`, keep the existing `if (!duplicatedName) return false;` behavior so ambiguous cases do not move any book.

- **Implementation Checklist:**
  [ ] Replace first-match duplicate detection in `duplicateBook` with exact-cardinality (`addedNames.length === 1`) detection.
  [ ] Preserve timeout behavior and return `null` when the new name is ambiguous.
  [ ] Keep `duplicateBookIntoFolder` early-return behavior for null duplicate names.

- **Fix risk:** Low 🟢
  The change is constrained to name-resolution logic and favors no-op over wrong-target mutation.

- **Why it's safe to implement:**
  It does not change core duplicate triggering, book data payloads, or folder metadata write paths.

- **Pros:**
  Prevents wrong-book moves caused by concurrent updates.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F02: Move-to-folder actions can discard unsaved editor edits via forced list refresh

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Moving a book always reloads the list, and list reload clears the editor. If the user has unsaved text open, that text can be lost.

- **Location:**
  `src/listPanel.bookMenu.js` - `buildMoveBookMenuItem` (Save / New Folder / No Folder handlers), with downstream call to `src/listPanel.js` `applyBookFolderChange` -> `refreshList`

  Anchor:
  ```js
  await applyBookFolderChange(name, selectedFolder, { centerAfterRefresh: true });
  ```

- **Detailed Finding:**
  All folder-change actions call `applyBookFolderChange(..., { centerAfterRefresh: true })`. In `src/listPanel.js`, that path executes `refreshList()`, and `refreshList()` immediately calls `state.resetEditor?.()`. There is no dirty-state guard in `listPanel.bookMenu.js` before triggering this refresh. If any entry editor contains unsaved changes, the refresh path can clear it.

- **Why it matters:**
  This is a direct user-edit loss path during a common menu action.

- **Severity:** High ❗❗
- **Confidence:** High 😀
- **Category:** Data Integrity

- **Reproducing the issue:**
  1. Open an entry and type without saving.
  2. Open a book menu and move a book to a folder (or create/remove folder assignment).
  3. Observe the list refresh clears the editor and the unsaved text is lost.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add a dirty-edit guard before calling `applyBookFolderChange`, consistent with existing drawer guards that block destructive transitions.

- **Proposed fix:**
  **Behavior Change Required:** block folder-change actions when the active editor is dirty. Add a guard callback from `drawer.js` through `initListPanel`/`createBookMenuSlice` (for example `canRefreshWithoutDataLoss`), and in each folder-change click handler (`Save`, `New Folder`, `No Folder`) return early with a warning toast when refresh is unsafe.

- **Implementation Checklist:**
  [ ] Extend list-panel wiring (`drawer.js` -> `src/listPanel.js` -> `src/listPanel.bookMenu.js`) with a dirty-safe refresh guard callback.
  [ ] Gate all three folder-change handlers in `buildMoveBookMenuItem` before `applyBookFolderChange`.
  [ ] Keep existing folder-change persistence logic unchanged when the guard passes.

- **Fix risk:** Medium 🟡
  This introduces a new guard branch in an existing flow and must stay consistent with other dirty-state guard UX.

- **Why it's safe to implement:**
  It does not alter how folder metadata is written; it only blocks the call when unsaved edits would be destroyed.

- **Pros:**
  Removes a high-impact unsaved-edit loss path.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F03: Folder import can abort mid-run and leave partial/empty books without clear recovery

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If one imported book fails during save, the whole import can stop in the middle, leaving only part of the folder imported and sometimes a newly created empty book.

- **Location:**
  `src/listPanel.bookMenu.js` - `importFolderFile`

  Anchor:
  ```js
  const created = await state.createNewWorldInfo(name, { interactive: false });
  ...
  await state.saveWorldInfo(name, nextPayload, true);
  ```

- **Detailed Finding:**
  Per-book create/save calls are not wrapped in a local `try/catch`. Any rejection from `createNewWorldInfo` or `saveWorldInfo` escapes `importFolderFile`, aborting the remaining books and skipping final summary handling. Because creation happens before save, a failure after `createNewWorldInfo` can leave an empty placeholder book behind.

- **Why it matters:**
  Imports can end in a confusing partial state and users do not get a reliable success/failure summary.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** Data Integrity

- **Reproducing the issue:**
  1. Start folder import with multiple books.
  2. Trigger a save failure for one book (for example by forcing a request failure).
  3. Observe import stops early and may leave partial results/empty created books.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Handle failures per book and continue processing the rest, then show a clear aggregate outcome.

- **Proposed fix:**
  In `importFolderFile`, wrap each create/save block in `try/catch`. Track `successCount` and `failedBooks`. If `saveWorldInfo` fails after creation, attempt rollback with `state.deleteWorldInfo?.(name)` and record rollback outcome. After loop completion, refresh list if any success and show one summary toast including failures.

- **Implementation Checklist:**
  [ ] Add per-book `try/catch` in `importFolderFile` for `createNewWorldInfo` and `saveWorldInfo`.
  [ ] Track successes/failures and continue loop on per-book errors.
  [ ] Attempt rollback with `deleteWorldInfo` when save fails after create.
  [ ] Emit final summary toast reporting counts.

- **Fix risk:** Medium 🟡
  Rollback paths must avoid deleting pre-existing books with colliding names; use only names created in this import pass.

- **Why it's safe to implement:**
  The change is isolated to import error handling and does not change normal successful import payloads.

- **Pros:**
  Improves resilience and avoids silent partial-import failure states.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F04: Exported book payload drops metadata needed for folder/sort restoration

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Exported files include entries only. Important book settings like folder assignment and per-book sort preference are left out, so re-import does not fully restore the book.

- **Location:**
  `src/listPanel.bookMenu.js` - export menu handler

  Anchor:
  ```js
  state.download(JSON.stringify({ entries:state.cache[name].entries }), name, 'application/json');
  ```

- **Detailed Finding:**
  Export serializes only `entries` and omits `metadata`. Folder placement and per-book sort preference are metadata-backed (`folder`, `stwid.sort`). Re-importing this file therefore reconstructs entry content but loses extension-level organization/preferences.

- **Why it matters:**
  Users expect export/import to preserve book configuration, not just text entries.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** Data Integrity

- **Reproducing the issue:**
  1. Assign a book to a folder and set a per-book sort preference.
  2. Export via the menu, then import back as a new book.
  3. Observe metadata-driven folder/sort settings are not restored.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Export both entries and metadata to match the structure used by import paths.

- **Proposed fix:**
  Change export payload to include `metadata` (cloned) alongside `entries`, for example `{ entries: structuredClone(...), metadata: structuredClone(state.cache[name].metadata ?? {}) }` before `JSON.stringify`.

- **Implementation Checklist:**
  [ ] Update export handler payload to include `metadata`.
  [ ] Clone exported objects before serialization to avoid accidental live-reference mutation.
  [ ] Keep filename and MIME type behavior unchanged.

- **Fix risk:** Low 🟢
  Backward-compatible superset payload; existing consumers that only need `entries` can still read it.

- **Why it's safe to implement:**
  It touches only export serialization and does not change any runtime editor/list behavior.

- **Pros:**
  Preserves user organization/sort settings across export/import.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F05: External Editor integration suppresses request failures and user feedback

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The menu sends a network request but never checks if it worked. If the plugin is missing or fails, users get no message.

- **Location:**
  `src/listPanel.bookMenu.js` - External Editor menu handler

  Anchor:
  ```js
  fetch('/api/plugins/wiee/editor', {
      method: 'POST',
      headers: state.getRequestHeaders(),
      body: JSON.stringify({ ... }),
  });
  ```

- **Detailed Finding:**
  The handler invokes `fetch` without `await`, response status handling, or `catch`. Failures (network error, non-2xx, server/plugin unavailable) are silently ignored and no toast is shown. This violates reliable user feedback expectations for explicit actions.

- **Why it matters:**
  Users cannot distinguish "plugin opened" from "request failed," increasing confusion and repeated retries.

- **Severity:** Low ⭕
- **Confidence:** High 😀
- **Category:** JS Best Practice

- **Reproducing the issue:**
  1. Disable or break the external editor plugin endpoint.
  2. Click `External Editor` in the book menu.
  3. Observe no success/error feedback despite request failure.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Treat this as a normal async action: await it, validate response status, and report failures.

- **Proposed fix:**
  Wrap the handler in `try/catch`, `await fetch(...)`, check `response.ok`, and show `toastr.error(...)` on failures. Optionally show a success/info toast when request is accepted.

- **Implementation Checklist:**
  [ ] Convert the External Editor click handler to `await fetch` with `response.ok` validation.
  [ ] Add `try/catch` and show user-visible error feedback.
  [ ] Keep request URL, headers, and payload schema unchanged.

- **Fix risk:** Low 🟢
  Localized to one optional integration action.

- **Why it's safe to implement:**
  It does not alter book data or core WI behavior, only feedback/error handling for plugin call outcome.

- **Pros:**
  Improves reliability and debuggability of optional plugin integration.

<!-- META-REVIEW: STEP 2 will be inserted here -->
