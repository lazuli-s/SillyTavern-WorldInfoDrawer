# CODE REVIEW FINDINGS: listPanel.bookMenu.js

Scope reviewed:
- `src/listPanel.bookMenu.js`
- Direct call sites / shared helpers referenced by the above (evidence only): `src/listPanel.js`, `src/listPanel.coreBridge.js`, `src/lorebookFolders.js`

## F01: Duplicate-book detection can pick the wrong “new book” under concurrent book creation/import, causing mis-attribution (e.g., moving the wrong book into a folder)
- Location:
  - `src/listPanel.bookMenu.js` → `createBookMenuSlice(...)` → `duplicateBook(...)` and `duplicateBookIntoFolder(...)`
  - Anchor snippet:
    - `const initialNameSet = new Set(initialNames);`
    - `const findNewName = ()=>{ const currentNames = getNames() ?? []; return currentNames.find((entry)=>!initialNameSet.has(entry)) ?? null; };`
    - `const duplicatedName = await duplicateBook(name);`
    - `await setBookFolder(duplicatedName, folderName);`

- What the issue is  
  `duplicateBook` identifies the duplicated book name by taking a snapshot of `world_names` (or `getWorldNames()`) before clicking the core “Duplicate” action, then polling for “any name that wasn’t in the initial set”. If any other action creates a book during the same window (importing, creating a book in another tab, another duplicate action, a plugin creating a book, etc.), `findNewName()` can return *the wrong* new book name because it’s not correlated to the duplicate action that just ran.

- Why it matters (impact)  
  Data integrity / correctness:
  - `duplicateBookIntoFolder` will then `setBookFolder(...)` on the misidentified name and move an unrelated book into a folder.
  - Even when not moving into a folder, returning the wrong duplicated name can break any subsequent flow that assumes it got “the duplicate of X”.

- Severity: High

- Fix risk: Medium  
  Any change to duplicate detection touches core UI delegation timing and depends on ST’s update semantics.

- Confidence: Medium  
  The failure requires concurrent book creation, but the selection logic is explicitly “first new name found”, which is not action-specific.

- Repro idea:
  1) Trigger a book duplicate from book menu for Book A.
  2) While the duplicate is processing, simultaneously create/import another book (e.g., import a lorebook via core UI or another extension).
  3) Use “Duplicate into folder” (drag/drop copy or folder move flow) and verify whether the moved book is actually the duplicate of A.

- Suggested direction  
  Correlate the duplicate click with the specific resulting book (e.g., by using a more specific observable than “any new name”, or by capturing core UI state that identifies which book was duplicated).

- Proposed fix  
  Use a duplication-specific identifier or correlation strategy (e.g., wait for a core “selected book name changes to duplicated name” signal, or detect the new book by expected naming convention relative to the source name) so unrelated new books don’t match.

- Immplementation Checklist:
  - [ ] Identify what core UI/state changes uniquely identify the duplicated book (name pattern, selection change, or other stable artifact).
  - [ ] Replace “set difference of names” with a correlation that targets the duplicate action result.
  - [ ] Add a safety check in `duplicateBookIntoFolder` that validates the chosen new name is plausibly derived from the source name before moving it.

- Why it’s safe to implement  
  Duplicating a book still produces the same book in ST; this only reduces the chance of attributing the wrong resulting name when multiple book-creation events occur close together.

---

## F02: “Move Book to Folder” can clear the entry editor during `refreshList()`, potentially discarding in-progress (unsaved) edits
- Location:
  - `src/listPanel.bookMenu.js` → `buildMoveBookMenuItem(...)` → `moveBtn` / `createBtn` / `noFolderBtn` handlers
  - Evidence call path:
    - `await applyBookFolderChange(name, selectedFolder, { centerAfterRefresh: true });`
    - `src/listPanel.js` → `applyBookFolderChange(...)` → `refreshList()`
    - `src/listPanel.js` → `refreshList()` anchor snippet: `state.resetEditor?.();`
  - Anchor snippet (book menu side):
    - `await applyBookFolderChange(name, reg.folder, { centerAfterRefresh: true });`
    - `await applyBookFolderChange(name, null, { centerAfterRefresh: true });`
    - `await applyBookFolderChange(name, selectedFolder, { centerAfterRefresh: true });`

- What the issue is  
  The move-book workflow always refreshes the full list (and centers the moved book). The list refresh resets the editor (`state.resetEditor?.()`), which clears the current editor DOM. If the user has typed changes in the editor that have not yet been persisted by ST (the extension explicitly has dirty-tracking logic elsewhere to avoid auto-refresh discarding typed input), this refresh can discard those changes.

- Why it matters (impact)  
  Data integrity / risk of losing edits:
  - A book-level operation (moving to folder) can unintentionally wipe entry-level edits that are unrelated to the move.
  - Because the user is not warned, this can appear as “randomly lost text” after moving a book.

- Severity: High

- Fix risk: High  
  Any mitigation likely needs to consult editor dirty state and either block/confirm or change refresh behavior, which can affect overall UI consistency.

- Confidence: Medium  
  Depends on how frequently editor content is “unsaved” at the time the user triggers a move, but the code path unconditionally resets the editor on refresh.

- Repro idea:
  1) Open an entry in the editor and type in `content` (do not trigger any explicit save action, if any exists).
  2) Without leaving the editor, open a book menu and “Move Book to Folder” (or “No Folder”) for any book.
  3) Observe whether the editor clears and whether typed changes are lost when returning to the entry.

- Suggested direction  
  Ensure list refreshes triggered by book menu actions respect editor dirty state to prevent silent loss of typed edits.

- Proposed fix  
  Before actions that cause `refreshList()`, check whether the editor is dirty and either prompt the user, defer refresh, or use a refresh strategy that does not clear the editor unless necessary.

- Immplementation Checklist:
  - [ ] Confirm whether editor changes are always persisted immediately by ST; if not, treat editor as potentially lossy during refresh.
  - [ ] Add a guard in the “move book” action path to detect dirty editor state.
  - [ ] Decide on a user-safe strategy (confirm, cancel, or preserve editor DOM) that keeps current behavior unless the editor is dirty.
  - [ ] Verify that moving a book still results in correct folder placement and list centering.

- Why it’s safe to implement  
  Moving the book remains the same operation; the change is only to prevent editor teardown when that teardown risks losing user input.

---

## F03: Folder import (`importFolderFile`) performs potentially heavy sequential work without yielding or progress reporting, risking long UI stalls and partial imports on failure
- Location:
  - `src/listPanel.bookMenu.js` → `importFolderFile(file)`
  - Anchor snippet:
    - `for (const [rawName, bookData] of Object.entries(books)) { ...`
    - `const created = await state.createNewWorldInfo(name, { interactive: false });`
    - `await state.saveWorldInfo(name, nextPayload, true);`
    - `await refreshList();`

- What the issue is  
  `importFolderFile` loops through all books in the folder export and does:
  1) create a new world info (await),
  2) structuredClone entries/metadata,
  3) save world info (await),
  sequentially for every book, with no UI-yielding or progress feedback.

  If the payload is large (many books or many large entries), this can cause long “frozen UI” experiences. Additionally, if an error occurs mid-loop (network/storage error, ST API failure), the import will be partially applied (some books created, some not), with no rollback and limited feedback.

- Why it matters (impact)  
  Performance + data integrity:
  - UI appears hung during import; users may reload the page, which can leave partially imported state.
  - Partial imports can be confusing (“some books imported, others missing”) and are hard to recover from without manual cleanup.

- Severity: Medium

- Fix risk: Medium  
  Improving responsiveness and resilience typically involves adding yields, progress toasts, and more structured error handling. That can change perceived behavior/timing.

- Confidence: High  
  The loop is clearly sequential and can do a large amount of work.

- Repro idea:
  1) Create a folder export JSON containing dozens of books with many entries each.
  2) Import via “folder import”.
  3) Observe main-thread responsiveness during the import; optionally record a performance profile.

- Suggested direction  
  Make imports more resilient and responsive under large datasets (yield periodically, report progress, and handle partial failures explicitly).

- Proposed fix  
  Add incremental progress feedback and periodic yielding (or chunking) during the import loop; track failures per-book and summarize results so users can act on partial imports.

- Immplementation Checklist:
  - [ ] Determine realistic worst-case import sizes (books/entries).
  - [ ] Add periodic UI yields and progress updates during the loop.
  - [ ] Capture per-book failures and show a summary toast at the end.
  - [ ] Confirm final `refreshList()` still runs once and that imported books appear with correct metadata.

- Why it’s safe to implement  
  Imported data and naming behavior remain identical; this only improves responsiveness and transparency for large imports.

---

## F04: “Export Book” omits metadata, so re-importing loses folder assignment and per-book sort preference (Behavior Change Required)
- Location:
  - `src/listPanel.bookMenu.js` → `buildBookMenuTrigger(name)` → export menu item handler
  - Anchor snippet:
    - `state.download(JSON.stringify({ entries:state.cache[name].entries }), name, 'application/json');`

- What the issue is  
  The book export JSON contains only `{ entries: ... }` and does not include `metadata`. This means any metadata-backed user configuration is lost in the exported artifact, including:
  - folder membership (`metadata.folder`),
  - per-book sort preference (`metadata.stwid.sort`), and any future metadata-backed features.

- Why it matters (impact)  
  Data integrity / user expectation:
  - Users exporting a book as a backup/share format may expect restoring it recreates the same configuration.
  - Loss of metadata can appear as “settings didn’t import” or “folder organization vanished” on restore.

- Severity: Medium

- Fix risk: Medium  
  **Behavior Change Required:** Changing the export format (adding `metadata`) affects consumers of the exported JSON (including any user scripts or external tooling).

- Confidence: High  
  The current export payload is explicitly `{ entries: ... }`.

- Repro idea:
  1) Assign a book to a folder and set a custom per-book sort.
  2) Export the book via “Export Book”.
  3) Import the exported JSON into a fresh environment.
  4) Observe missing folder assignment and missing per-book sort preference.

- Suggested direction  
  Align book export with the folder export payload shape (entries + metadata) so exports are restorable.

- Proposed fix  
  Include metadata in the exported JSON and ensure the import pathway supports it (or clearly label the export as “entries-only” if that is intentional).

- Immplementation Checklist:
  - [ ] Confirm expected import format(s) for a book JSON file in core ST.
  - [ ] Decide and document the intended export contract (entries-only vs entries+metadata).
  - [ ] If including metadata, ensure folder + sort metadata are preserved on import.
  - [ ] Update any user-facing docs/tooling assumptions accordingly.

- Why it’s safe to implement  
  When implemented with backward compatibility (accept entries-only as input), existing exports can remain valid while new exports become more complete and less lossy.

---

## F05: External Editor integration fires a POST request without awaiting or handling errors, leading to silent failure and ambiguous user state
- Location:
  - `src/listPanel.bookMenu.js` → `buildBookMenuTrigger(name)` → external editor menu item handler
  - Anchor snippet:
    - `fetch('/api/plugins/wiee/editor', { method: 'POST', headers: state.getRequestHeaders(), body: JSON.stringify({ book: name, command: 'code', commandArguments: ['.'], }), });`

- What the issue is  
  The external editor action sends a request but does not:
  - `await` the response,
  - handle non-2xx responses (404 when plugin disabled, 401 when headers invalid, etc.),
  - surface any success/failure feedback to the user.

- Why it matters (impact)  
  UI correctness and troubleshooting:
  - User clicks “External Editor” and nothing happens, with no indication why.
  - In failure scenarios, repeated clicks can spam the endpoint without user knowing.

- Severity: Low

- Fix risk: Low  
  Adding minimal error handling and a toast should have limited side effects (but messaging can be considered behavior change if users rely on silent behavior).

- Confidence: High  
  The code is fire-and-forget.

- Repro idea:
  1) Disable/uninstall the external editor plugin/extension.
  2) Click “External Editor”.
  3) Check browser network tab for 404/500 and note lack of UI feedback.

- Suggested direction  
  Provide minimal feedback on success/failure to improve debuggability and user confidence.

- Proposed fix  
  Await the request, check status, and show a succinct toast on failure (and optionally on success).

- Immplementation Checklist:
  - [ ] Identify expected success response contract for `/api/plugins/wiee/editor`.
  - [ ] Add basic `try/catch` with response status validation.
  - [ ] Show a toast on failure with a brief actionable hint (plugin not installed / permissions).
  - [ ] Ensure no additional UI blocking occurs (keep it fast).

- Why it’s safe to implement  
  The same request is still made; the only change is surfacing errors to the user instead of failing silently.