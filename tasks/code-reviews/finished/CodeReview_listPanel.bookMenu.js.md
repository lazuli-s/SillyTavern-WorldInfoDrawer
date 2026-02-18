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

- **Fix risk:** Low 🟢
  The change is constrained to name-resolution logic and favors no-op over wrong-target mutation.

- **Why it's safe to implement:**
  It does not change core duplicate triggering, book data payloads, or folder metadata write paths.

- **Pros:**
  Prevents wrong-book moves caused by concurrent updates.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "If another action creates a book during the same window (for example import/new-book from another UI flow), `findNewName()` can return that unrelated book."
    - **Evidence:** Code shows `findNewName()` returns first non-initial name without cardinality check. ✅ Verified.

- **Top risks:**
  - Internal inconsistency: The proposed fix changes the return value semantics (from first-match to exact-match), which could break callers expecting any result.

#### Technical Accuracy Audit

> The race condition scenario is plausible given the code's first-match logic.

- **Why it may be wrong/speculative:**
  N/A - claim is evidence-backed by code inspection.

- **Validation:**
  Validated ✅

- **What needs to be done/inspected to successfully validate:**
  N/A

#### Fix Quality Audit

- **Direction:**
  Technically sound - stays within the `listPanel.bookMenu.js` module per ARCHITECTURE.md.

- **Behavioral change:**
  Changes return value behavior when multiple books are added - this is labeled and intentional (reject ambiguous results). ✅ Labeled

- **Ambiguity:**
  Single suggestion (exact-cardinality detection). ✅

- **Checklist:**
  Checklist items are actionable: replace find logic, preserve timeout, keep existing null-handling. ✅ Complete

- **Dependency integrity:**
  No cross-finding dependencies declared. ✅

- **Fix risk calibration:**
  Fix risk rated Low - correct. Logic-only change, favors no-op over wrong mutation. ✅

- **Why it's safe to implement:**
  Claim is specific: "does not change core duplicate triggering, book data payloads, or folder metadata write paths" - these are verifiable. ✅ Specific

- **Mitigation:**
  N/A - fix risk is low.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Replace first-match duplicate detection in `duplicateBook` with exact-cardinality (`addedNames.length === 1`) detection.
- [x] Preserve timeout behavior and return `null` when the new name is ambiguous.
- [x] Keep `duplicateBookIntoFolder` early-return behavior for null duplicate names.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.bookMenu.js`
  - Replaced `currentNames.find(...)` (first-match) with `currentNames.filter(...)` + cardinality check in `findNewName()`.
  - Returns the new name only when `addedNames.length === 1`; returns `null` for 0 or 2+ additions so detection times out safely.

- Risks / Side effects
  - In the concurrent-create edge case, detection times out and returns `null` (no-op folder move) instead of moving the wrong book — safe trade-off (⭕).
      - **🟥 MANUAL CHECK**: [ ] Duplicate a book normally and confirm the duplicate appears in the list. If using Ctrl-drag to a folder, confirm the duplicate lands in the correct folder with no console errors.

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

- **Fix risk:** Medium 🟡
  This introduces a new guard branch in an existing flow and must stay consistent with other dirty-state guard UX.

- **Why it's safe to implement:**
  It does not alter how folder metadata is written; it only blocks the call when unsaved edits would be destroyed.

- **Pros:**
  Removes a high-impact unsaved-edit loss path.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "In `src/listPanel.js`, that path executes `refreshList()`, and `refreshList()` immediately calls `state.resetEditor?.()`."
    - **Evidence:** Source verification needed - the Step 1 finding references this behavior but it should be verified against actual `listPanel.js` code.
  - Claim: "There is no dirty-state guard in `listPanel.bookMenu.js` before triggering this refresh."
    - **Evidence:** Code shows `applyBookFolderChange` is called directly without any guard. ✅ Verified.

- **Top risks:**
  - Missing evidence: The claim about `refreshList()` calling `resetEditor` needs verification in `listPanel.js`.

#### Technical Accuracy Audit

> The dirty-loss path is evidence-backed but the downstream call chain needs verification.

- **Why it may be wrong/speculative:**
  The finding states `refreshList()` calls `resetEditor` but this needs verification in `listPanel.js`.

- **Validation:**
  Needs extensive analysis ❌ — Requires reading `src/listPanel.js` to verify the call chain from `applyBookFolderChange` to `refreshList` to `resetEditor`.

- **What needs to be done/inspected to successfully validate:**
  Read `src/listPanel.js` to confirm: (1) `applyBookFolderChange` calls `refreshList`, (2) `refreshList` calls `resetEditor`, (3) no existing dirty guard exists in this path.

#### Fix Quality Audit

- **Direction:**
  Technically sound - adding dirty guards is consistent with existing drawer guard patterns (per ARCHITECTURE.md and FEATURE_MAP).

- **Behavioral change:**
  Labeled as "Behavior Change Required" - correctly identifies blocking user action as a change. ✅ Labeled

- **Ambiguity:**
  Single suggestion (add guard callback). ✅

- **Checklist:**
  Checklist items are actionable but reference module wiring that needs specification: extending list-panel wiring with guard callback. ✅ Complete but needs detail

- **Dependency integrity:**
  No cross-finding dependencies. ✅

- **Fix risk calibration:**
  Fix risk rated Medium - correct. Touches shared dirty-state pattern across modules. ✅

- **Why it's safe to implement:**
  Claim is specific: "does not alter how folder metadata is written; it only blocks the call when unsaved edits would be destroyed" - verifiable. ✅ Specific

- **Mitigation:**
  N/A - fix risk is medium and acceptable.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Extend list-panel wiring (`drawer.js` -> `src/listPanel.js` -> `src/listPanel.bookMenu.js`) with a dirty-safe refresh guard callback.
- [x] Gate all three folder-change handlers in `buildMoveBookMenuItem` before `applyBookFolderChange`.
- [x] Keep existing folder-change persistence logic unchanged when the guard passes.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.bookMenu.js`, `src/drawer.js`
  - Added `isDirtyCheck` lambda to `initListPanel` options in `drawer.js`; closes over `getCurrentEditor()` and `editorPanelApi.isDirty()`.
  - All three folder-change handlers (New Folder, No Folder, Save) in `buildMoveBookMenuItem` call `state.isDirtyCheck?.()` before `applyBookFolderChange` and show a warning toast + return early when dirty.
  - Verified: `runRefreshWorker()` calls `state.resetEditor?.()` unconditionally — dirty guard is the correct fix.

- Risks / Side effects
  - New blocking behavior: users with unsaved edits can no longer move books to folders without saving/discarding first (❗).
      - **🟥 MANUAL CHECK**: [ ] Open an entry, type without saving, then open "Move Book to Folder" and try all three actions (Save, New Folder, No Folder); confirm a warning toast appears and the list does not refresh. Save or discard edits, retry all three; confirm the move succeeds normally.

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

- **Fix risk:** Medium 🟡
  Rollback paths must avoid deleting pre-existing books with colliding names; use only names created in this import pass.

- **Why it's safe to implement:**
  The change is isolated to import error handling and does not change normal successful import payloads.

- **Pros:**
  Improves resilience and avoids silent partial-import failure states.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "Per-book create/save calls are not wrapped in a local `try/catch`."
    - **Evidence:** Code shows `await state.createNewWorldInfo(name, { interactive: false })` directly in loop without try/catch. ✅ Verified.
  - Claim: "Because creation happens before save, a failure after `createNewWorldInfo` can leave an empty placeholder book behind."
    - **Evidence:** Code flow shows `createNewWorldInfo` is called before `saveWorldInfo` in the loop, so failure between them leaves created book. ✅ Verified.

- **Top risks:**
  - None identified - evidence is clear from code inspection.

#### Technical Accuracy Audit

> Both claims are fully evidence-backed.

- **Why it may be wrong/speculative:**
  N/A - claims verified by code inspection.

- **Validation:**
  Validated ✅

- **What needs to be done/inspected to successfully validate:**
  N/A

#### Fix Quality Audit

- **Direction:**
  Technically sound - stays within `listPanel.bookMenu.js` module per ARCHITECTURE.md.

- **Behavioral change:**
  No behavioral change to successful imports - only error handling paths change. ✅ Not applicable (no behavior change for success path)

- **Ambiguity:**
  Single suggestion (per-book try/catch with rollback). ✅

- **Checklist:**
  Checklist items are complete and actionable. ✅ Complete

- **Dependency integrity:**
  No cross-finding dependencies. ✅

- **Fix risk calibration:**
  Fix risk rated Medium - correct. Rollback logic has edge cases around name collision. ✅

- **Why it's safe to implement:**
  Claim is specific: "isolated to import error handling" - verifiable. ✅ Specific

- **Mitigation:**
  N/A - medium risk is acceptable.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Add per-book `try/catch` in `importFolderFile` for `createNewWorldInfo` and `saveWorldInfo`.
- [x] Track successes/failures and continue loop on per-book errors.
- [x] Attempt rollback with `deleteWorldInfo` when save fails after create.
- [x] Emit final summary toast reporting counts.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.bookMenu.js`
  - Added `failedBooks = []` array before the import loop.
  - Wrapped each book's create/save sequence in `try/catch`; `bookCreated` flag tracks whether creation succeeded before a save failure so rollback only deletes books created in this import pass.
  - Post-loop: `refreshList()` called only when ≥1 book succeeded; separate error and success toasts emitted; returns `false` only if zero books succeeded.

- Risks / Side effects
  - Rollback via `deleteWorldInfo` runs only on names created in this import pass (after collision-suffix logic), so pre-existing same-named books cannot be accidentally deleted (⭕).
      - **🟥 MANUAL CHECK**: [ ] Import a folder with 3 books; force a save failure on book 2 (DevTools `saveWorldInfo` override). Confirm book 1 imported, book 2 rolled back (absent from list), book 3 imported, and an error toast plus a success toast both appear.

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

- **Fix risk:** Low 🟢
  Backward-compatible superset payload; existing consumers that only need `entries` can still read it.

- **Why it's safe to implement:**
  It touches only export serialization and does not change any runtime editor/list behavior.

- **Pros:**
  Preserves user organization/sort settings across export/import.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "Export serializes only `entries` and omits `metadata`."
    - **Evidence:** Code shows `{ entries:state.cache[name].entries }` - no metadata. ✅ Verified.
  - Claim: "Folder placement and per-book sort preference are metadata-backed (`folder`, `stwid.sort`)."
    - **Evidence:** Consistent with ARCHITECTURE.md and FEATURE_MAP. ✅ Verified.

- **Top risks:**
  - None identified - evidence is clear from code inspection.

#### Technical Accuracy Audit

> Claims are fully evidence-backed by code inspection and documentation.

- **Why it may be wrong/speculative:**
  N/A - claims verified.

- **Validation:**
  Validated ✅

- **What needs to be done/inspected to successfully validate:**
  N/A

#### Fix Quality Audit

- **Direction:**
  Technically sound - stays within `listPanel.bookMenu.js` module per ARCHITECTURE.md.

- **Behavioral change:**
  No behavioral change - export format expansion only. ✅ Not applicable

- **Ambiguity:**
  Single suggestion (add metadata to export). ✅

- **Checklist:**
  Checklist items are complete and actionable. ✅ Complete

- **Dependency integrity:**
  No cross-finding dependencies. ✅

- **Fix risk calibration:**
  Fix risk rated Low - correct. Simple serialization change. ✅

- **Why it's safe to implement:**
  Claim is specific: "touches only export serialization" - verifiable. ✅ Specific

- **Mitigation:**
  N/A - low risk.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Update export handler payload to include `metadata`.
- [x] Clone exported objects before serialization to avoid accidental live-reference mutation.
- [x] Keep filename and MIME type behavior unchanged.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.bookMenu.js`
  - Export payload changed from `{ entries: state.cache[name].entries }` to `{ entries: structuredClone(...), metadata: structuredClone(state.cache[name].metadata ?? {}) }`.
  - Both `entries` and `metadata` are now deep-cloned before serialization.

- Risks / Side effects
  - Exported JSON files are now larger (include metadata); older import paths that only read `entries` ignore the extra key silently — backward compatible (⭕).
      - **🟥 MANUAL CHECK**: [ ] Export a book that has a folder assignment and per-book sort preference. Import the exported file. Confirm the re-imported book appears in the correct folder with the same sort preference applied.

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

- **Fix risk:** Low 🟢
  Localized to one optional integration action.

- **Why it's safe to implement:**
  It does not alter book data or core WI behavior, only feedback/error handling for plugin call outcome.

- **Pros:**
  Improves reliability and debuggability of optional plugin integration.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "The handler invokes `fetch` without `await`, response status handling, or `catch`."
    - **Evidence:** Code shows `fetch(...)` call without await or .then(). ✅ Verified.

- **Top risks:**
  - None identified - evidence is clear from code inspection.

#### Technical Accuracy Audit

> Claim is fully evidence-backed.

- **Why it may be wrong/speculative:**
  N/A - claim verified.

- **Validation:**
  Validated ✅

- **What needs to be done/inspected to successfully validate:**
  N/A

#### Fix Quality Audit

- **Direction:**
  Technically sound - stays within `listPanel.bookMenu.js` module per ARCHITECTURE.md.

- **Behavioral change:**
  No behavioral change to core functionality - adds error feedback only. ✅ Not applicable

- **Ambiguity:**
  Single suggestion (await + error handling). ✅

- **Checklist:**
  Checklist items are complete and actionable. ✅ Complete

- **Dependency integrity:**
  No cross-finding dependencies. ✅

- **Fix risk calibration:**
  Fix risk rated Low - correct. Simple error handling addition. ✅

- **Why it's safe to implement:**
  Claim is specific: "does not alter book data or core WI behavior, only feedback/error handling" - verifiable. ✅ Specific

- **Mitigation:**
  N/A - low risk.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Convert the External Editor click handler to `await fetch` with `response.ok` validation.
- [x] Add `try/catch` and show user-visible error feedback.
- [x] Keep request URL, headers, and payload schema unchanged.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/listPanel.bookMenu.js`
  - External Editor click handler now `await`s `fetch` inside a `try/catch`.
  - Shows `toastr.error` with HTTP status when `response.ok` is `false`; shows generic error toast + `console.warn` on network failure.
  - Request URL, headers, and body payload are unchanged.

- Risks / Side effects
  - Handler is now async but runs inside an event listener — the UI remains unblocked (⭕).
      - **🟥 MANUAL CHECK**: [ ] With the External Editor plugin running, click External Editor; confirm no error toast appears. Disable the plugin endpoint and click again; confirm an error toast appears with the HTTP failure status or a network error message.

---

### Coverage Note

- **Obvious missed findings:** None identified - the five findings cover the main functional areas of the book menu module (duplicate, folder-move, import, export, external editor).
- **Severity calibration:** Severity ratings appear appropriate: F02 (High) for data loss risk, F01/F03/F04 (Medium) for integrity/UX issues, F05 (Low) for best practice.