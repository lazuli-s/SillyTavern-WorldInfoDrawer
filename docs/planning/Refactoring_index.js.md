# Refactoring Plan: index.js

## 1. Mental Model of the Current File

### What this file does

`index.js` is the front door of the entire extension. When SillyTavern loads this extension, it runs `index.js` first. Everything else starts from here.

Right now this file wears **four separate hats**, all mixed together:

---

**Hat 1 — "Build the drawer UI"**
The `addDrawer()` function (roughly lines 577–1066, about 490 lines on its own) builds the entire visible interface. It creates the panel layout, the control buttons, the splitter between the list and editor, and sets up all the click handlers for buttons like "New Book", "Collapse All", "Sort", and "Open Order Helper".

---

**Hat 2 — "Track which lorebooks are linked to which characters/chats"**
Five functions (`addCharacterLinkedBooks`, `getActivePersonaName`, `buildLorebookSourceLinks`, `summarizeSourceLinks`, `refreshBookSourceLinks`) plus a listener (`onSourceSelectorChange`) form a cluster that knows which character or chat is currently open in SillyTavern and which lorebooks are linked to them. This feeds the little source-link icons on book rows.

---

**Hat 3 — "React to every World Info save"**
About a dozen functions (`shouldAutoRefreshEditor`, `updateWIChange`, `updateSettingsChange`, `updateWIChangeDebounced`, `waitForWorldInfoUpdate`, `waitForWorldInfoUpdateWithTimeout`, `reopenEditorEntry`, `runEditorDuplicateRefreshWorker`, `queueEditorDuplicateRefresh`, `fillEmptyTitlesWithKeywords`) form the engine that fires every time SillyTavern saves a lorebook. This engine decides whether to refresh the editor, updates the in-memory book cache, and handles the "duplicate entry" refresh cycle.

---

**Hat 4 — "Hold shared things"**
- The `dom` object (the master map of every HTML element reference)
- The `cache` object (the in-memory copy of all books and entries)
- `currentEditor` (which entry is currently open)
- The `jumpToEntry` function (the one thing other extensions can call)
- Three small helper functions (`executeSlashCommand`, `getOutletPositionValue`, `isOutletPosition`)
- The dev-only CSS hot-reload watcher (`watchCss`)

---

### How data flows through it

1. SillyTavern fires a `WORLDINFO_UPDATED` event → the debounced `updateWIChange` function runs → it updates `cache` → calls `refreshList` to re-render the book list.
2. SillyTavern fires a context-change event (new chat, character switch) → `refreshBookSourceLinks` runs → updates `lorebookSourceLinks` map → triggers the list panel to re-draw source icons and reapply visibility filters.
3. A user clicks a control button → a handler inside `addDrawer()` runs → calls the list panel, editor panel, or order helper API.

### Main sources of truth

- **`cache`** — the in-memory runtime copy of all books and entries. This is what the UI reads from. It is updated by `updateWIChange`.
- **`world_info` / `world_names`** — these come from SillyTavern directly and represent the real persisted state.
- **`dom`** — the runtime map of every HTML element the extension controls. It starts empty and is filled in when `addDrawer()` runs.

---

## 2. Why This File Is Hard to Change

### 1. `addDrawer()` is ~490 lines of mixed concerns

This single function creates DOM elements AND wires event listeners AND initializes three panels (list, editor, order helper). To change one button's behavior you have to scan nearly 500 lines, mentally ignoring everything unrelated. There is no way to understand "just the keyboard handler" without also skimming "build every button row".

### 2. The four hats are not labeled or separated

There are no comment blocks, section dividers, or file boundaries between Hat 1 (build UI), Hat 2 (source links), Hat 3 (WI updates), and Hat 4 (shared state). A reader opening the file for the first time sees a flat wall of ~1070 lines with no road signs.

### 3. Hidden, implicit shared state

Several module-level variables are mutated from multiple places, none of which declare ownership:
- `cache` — written by `updateWIChange`, read by `jumpToEntry`, `buildSavePayload`, and many button handlers inside `addDrawer()`
- `currentEditor` — written by the editor panel callback, read by `updateWIChange`, `jumpToEntry`, and `runEditorDuplicateRefreshWorker`
- `listPanelApi`, `editorPanelApi`, `selectionState` — declared at the top, assigned deep inside `addDrawer()`, then read by everything else
- `updateWIChangeStarted` / `updateWIChangeFinished` — these are **re-assigned** on every single `updateWIChange` call; any code that awaits them must capture the current reference at the right moment, and this is easy to get wrong

### 4. The `beforeunload` cleanup inside `addDrawer()` is secretly tangled

Lines 638–641: the `beforeunload` handler inside `addDrawer()` removes a listener (`onSourceSelectorChange`) that was registered at module level (line 551). This means `addDrawer()` is responsible for cleaning up something it didn't create. If you move or rename `onSourceSelectorChange`, you also need to find and update the cleanup code inside a 490-line function.

### 5. `updateWIChangeStarted` / `updateWIChangeFinished` are reassigned deferreds

These are not simple counters. They are promise-based "gate" objects created with `createDeferred()`, and they are **replaced on every call** to `updateWIChange`. The "add book" button inside `addDrawer()` awaits `updateWIChangeStarted.promise` to synchronize its flow. If you change when or how these get reassigned, you can break async flows in non-obvious ways.

### 6. `fillEmptyTitlesWithKeywords` has unclear ownership

This function (lines 518–532) lives in `index.js` but is called from `listPanel.bookMenu.js` via an injected reference. It calls `updateWIChange` directly. Because it spans two files and calls internal machinery, it is easy to miss when looking for "where does this action live?"

### 7. No tests

`index.js` has zero automated test coverage. The heavy coupling to live DOM and SillyTavern APIs makes it hard to add tests without first separating responsibilities. Any mistake during changes can only be caught by manually testing in a running SillyTavern instance.

---

## 3. Refactoring Phases

The phases go from zero-risk organization to progressively larger (but still safe) moves. They are **logical guides**, not mandatory commit checkpoints — you can combine comfortable phases in one sitting.

---

### Phase 1: Add section header comments to `index.js`

**Goal:** Make the existing structure visible at a glance without moving any code.

**What is allowed to change:**
- Add clearly labeled multi-line comment blocks above each logical group of code:
  - `// ── Imports ──────────────────────────────────────────`
  - `// ── Dev: CSS hot-reload watcher ─────────────────────`
  - `// ── DOM element reference map ───────────────────────`
  - `// ── Shared helper utilities ─────────────────────────`
  - `// ── Shared runtime state ────────────────────────────`
  - `// ── Book source-link tracking ───────────────────────`
  - `// ── World Info update handling ──────────────────────`
  - `// ── Event subscriptions ─────────────────────────────`
  - `// ── Public API ──────────────────────────────────────`
  - `// ── Drawer UI bootstrap ─────────────────────────────`
  - `// ── Startup ─────────────────────────────────────────`

**What must NOT change:**
- Every function body, every variable, every event listener, every export — all identical.

**Why this phase is low-risk:**
Pure comment additions. Zero behavior change. The file can be reverted with a single undo or a diff that shows only lines starting with `//`.

**What becomes clearer after this phase:**
A reader can instantly see the file's structure by scanning the headers. The scope of future phases becomes obvious: "I need to move Section X."

---

### Phase 2: Move three utility helpers to `src/utils.js`

**Goal:** Give the three small, standalone helpers a proper home in the already-established utility file.

**Functions being moved:**
- `executeSlashCommand` (lines 91–99)
- `getOutletPositionValue` (line 101)
- `isOutletPosition` (lines 102–106)

**What is allowed to change:**
- These three functions move from `index.js` to `src/utils.js`.
- They gain `export` keywords in `src/utils.js`.
- `index.js` adds three names to its existing import from `./src/utils.js`.
- `src/utils.js` gains one new import from the ST core `SlashCommandParser` module (needed by `executeSlashCommand`).

**What must NOT change:**
- Function bodies — identical, letter for letter.
- How they are called — callers (`listPanel.bookMenu.js`, `orderHelper.js`) already receive them by injection; their call sites are unchanged.
- The injection wiring inside `addDrawer()` — `executeSlashCommand` and `isOutletPosition` are still passed as parameters to `initOrderHelper`, `initListPanel`, etc. The only difference is their source (now imported from `src/utils.js` instead of defined locally).

**Why this phase is low-risk:**
The three functions are pure (no side effects, no hidden state). They depend only on global browser APIs and one ST library (`SlashCommandParser`). They are the smallest possible unit of extraction.

**What becomes clearer after this phase:**
`src/utils.js` is now the single home for reusable helpers. `index.js` only imports from it, instead of defining helpers mid-file.

---

### Phase 3: Extract source-link tracking to `src/bookSourceLinks.js`

**Goal:** Give the "which lorebook is linked to which character/chat/persona" logic its own focused file.

**Code being moved (all from `index.js`):**
- Module-level constants: `SOURCE_ICON_LOG_PREFIX`, `EMPTY_BOOK_SOURCE_LINKS`, `lorebookSourceLinks`, `lorebookSourceLinksSignature`
- Functions: `addCharacterLinkedBooks`, `getActivePersonaName`, `buildLorebookSourceLinks`, `summarizeSourceLinks`, `refreshBookSourceLinks`
- The listener definition and registration: `onSourceSelectorChange` (lines 545–551)
- The event subscriptions for context changes (the `for` loop at lines 536–543)

**What is allowed to change:**
- A new file `src/bookSourceLinks.js` is created.
- The moved code becomes the body of an `initBookSourceLinks({ getListPanelApi })` factory function that is called once at startup.
- `initBookSourceLinks` returns an object: `{ refreshBookSourceLinks, cleanup }` — where `cleanup` removes the `document.addEventListener('change', onSourceSelectorChange)` listener (so the `beforeunload` handler in `addDrawer()` can call it without needing direct access to `onSourceSelectorChange`).
- `index.js` replaces the moved code with a call to `initBookSourceLinks`.

**Why `getListPanelApi` must be injected and not imported:**
`refreshBookSourceLinks` calls `listPanelApi.updateAllBookSourceLinks(...)` and `listPanelApi.applyActiveFilter()`. But `listPanelApi` is not set until `addDrawer()` runs. To avoid a chicken-and-egg problem, we pass in a getter function `() => listPanelApi` — the same lazy-access pattern already used in existing modules. At call time, `listPanelApi` will be set.

**What must NOT change:**
- The behavior of `refreshBookSourceLinks` — same logic, same outcomes.
- The events it subscribes to and when they fire.
- The source-link icon rendering in the list panel — that is entirely in `src/listPanel.js` and is unchanged.

**A special case — `onSourceSelectorChange` cleanup:**
Right now (lines 638–641), `addDrawer()` removes `onSourceSelectorChange` in a `beforeunload` handler. After this phase, `addDrawer()` calls `bookSourceLinksApi.cleanup()` instead. Same effect, cleaner boundary.

**Why this phase is low-risk:**
The source-link cluster has no circular dependencies. It does not call `updateWIChange`, does not write to `cache`, and does not touch the editor. Its only outgoing call is `listPanelApi.updateAllBookSourceLinks` and `listPanelApi.applyActiveFilter`, which are guarded with optional chaining (`?.`) and fail silently before init.

**What becomes clearer after this phase:**
`index.js` no longer contains lorebook-source business logic. The FEATURE_MAP entry "Book source-link detection" cleanly points to one file: `src/bookSourceLinks.js`.

---

### Phase 4: Extract WI-update handling to `src/wiUpdateHandler.js`

**Goal:** Move the "react to every World Info save" engine out of `index.js` into its own home.

**Code being moved (all from `index.js`):**
- Constants: `METADATA_NAMESPACE`, `METADATA_SORT_KEY`, `EDITOR_DUPLICATE_REFRESH_TIMEOUT_MS`
- State variables: `updateWIChangeStarted`, `updateWIChangeFinished`, `updateWIChangeToken`, `editorDuplicateRefreshQueue`, `isEditorDuplicateRefreshWorkerRunning`
- Functions: `shouldAutoRefreshEditor`, `buildSavePayload`, `updateSettingsChange`, `updateWIChange`, `updateWIChangeDebounced`, `waitForWorldInfoUpdate`, `waitForWorldInfoUpdateWithTimeout`, `reopenEditorEntry`, `runEditorDuplicateRefreshWorker`, `queueEditorDuplicateRefresh`, `fillEmptyTitlesWithKeywords`
- The two event subscriptions for `WORLDINFO_UPDATED` and `WORLDINFO_SETTINGS_UPDATED` (lines 534–535)

**What is allowed to change:**
- A new file `src/wiUpdateHandler.js` is created.
- The moved code becomes the body of an `initWIUpdateHandler({ cache, getCurrentEditor, setCurrentEditor, getListPanelApi, getEditorPanelApi, getRefreshBookSourceLinks })` factory.
- `initWIUpdateHandler` returns an object: `{ buildSavePayload, updateWIChange, updateWIChangeDebounced, waitForWorldInfoUpdate, waitForWorldInfoUpdateWithTimeout, queueEditorDuplicateRefresh, fillEmptyTitlesWithKeywords, getUpdateWIChangeStarted, getUpdateWIChangeFinished }`.
- Note: `updateWIChangeStarted` and `updateWIChangeFinished` are exposed as **getters** (`getUpdateWIChangeStarted()`, `getUpdateWIChangeFinished()`) because they are re-assigned on every update cycle. Code that awaits them must call the getter at await-time, not capture the value once at init.
- `index.js` replaces the moved code with a single call to `initWIUpdateHandler`.

**Why `cache` and `currentEditor` must be injected:**
`updateWIChange` directly reads and writes both. They live in `index.js` (composition root). Passing them in by reference means mutations are immediately visible everywhere, which matches how the existing `initListPanel`, `initEditorPanel`, and `initOrderHelper` already receive `cache`.

**Why `METADATA_NAMESPACE` / `METADATA_SORT_KEY` are a note to watch:**
These two constants currently exist in both `index.js` (lines 269–270) and `src/sortHelpers.js`. After this phase, `wiUpdateHandler.js` should import them from `src/sortHelpers.js` rather than re-declaring them. This is a de-duplication opportunity, not a behavior change.

**Why this phase comes after Phase 3:**
`updateWIChange` (at its end) calls `refreshBookSourceLinks`. After Phase 3, `bookSourceLinksApi.refreshBookSourceLinks` is the canonical version. So `wiUpdateHandler.js` will receive it via `getRefreshBookSourceLinks()` injection — which requires Phase 3 to be done first so the name and location are stable.

**What must NOT change:**
- The debounce behavior of `updateWIChangeDebounced`.
- The `cache` mutation logic (which entries get added, removed, updated).
- The editor dirty-check guard in `shouldAutoRefreshEditor`.
- The refresh-queue logic for duplicate-entry refreshes.
- The `buildSavePayload` contract (object shape returned).

**What becomes clearer after this phase:**
`index.js` no longer contains the most complex async logic. `src/wiUpdateHandler.js` can be read in isolation to understand "what happens when a lorebook is saved."

---

### Phase 5: Move `addDrawer()` and the `dom` object to `src/drawer.js`

**Goal:** Make `index.js` a true thin entry point — a list of "start these modules" calls — rather than a place that also builds the entire UI.

**Code being moved (all from `index.js`):**
- The `dom` object declaration (lines 46–89)
- `activationBlock` and `activationBlockParent` (lines 110–111) — these are only ever used inside `addDrawer()` via `initEditorPanel`, so they belong with the UI bootstrap
- The entire `addDrawer()` function body (lines 577–1066)
- The startup call `addDrawer()` (line 1067)

**What is allowed to change:**
- A new file `src/drawer.js` is created.
- `dom`, `activationBlock`, `activationBlockParent`, and `addDrawer()` become the contents of an `initDrawer({ cache, getCurrentEditor, setCurrentEditor, wiHandlerApi, bookSourceLinksApi })` factory function.
- `initDrawer` returns `{ listPanelApi, editorPanelApi, selectionState, getActivationToggle, getOrderToggle }` — these are the things `index.js` needs after init:
  - `listPanelApi` — used by `jumpToEntry`
  - `getActivationToggle()` / `getOrderToggle()` — `jumpToEntry` reads `dom.activationToggle` and `dom.order.toggle`; exposing them as getters avoids exporting the whole `dom` object
- `index.js` calls `initDrawer(...)` and stores the returned values.

**A special case — `selectionState` inside the keyboard handler:**
The `onDrawerKeydown` function (lines 600–634) reads `selectionState`. After this phase, `selectionState` is a local variable inside `initDrawer()` — its scope is private and it never leaves `drawer.js`. This is correct because `jumpToEntry` does not use `selectionState`.

**A special case — `updateWIChangeStarted` used by the "add book" button:**
The "add book" button handler (lines 664–672) awaits `updateWIChangeStarted.promise`. After Phase 4, this is `wiHandlerApi.getUpdateWIChangeStarted().promise`. `drawer.js` receives `wiHandlerApi` as an injected parameter and calls the getter at await-time.

**What must NOT change:**
- Every button's click behavior.
- The splitter resize and persistence logic.
- The mutation observers on `#world_editor_select` and the drawer element.
- The keyboard Delete handler behavior.
- The order in which `initOrderHelper`, `initEditorPanel`, `initListPanel`, and `setWorldEntryContext` are called.
- `jumpToEntry` — stays in `index.js` as the stable public API.

**Why this is the last phase:**
It is the largest single move. Doing it last ensures that by the time we move `addDrawer()`, all the logic it used to call inline has already been extracted to focused modules. `drawer.js` becomes strictly UI-bootstrap code, not a mix of everything.

**What becomes clearer after this phase:**
`index.js` shrinks to roughly 60–80 lines: imports, `watchCss`, two shared state declarations (`cache`, `currentEditor`), three init calls, `jumpToEntry`, and `refreshList()`. A newcomer can understand the whole extension's startup sequence in one minute.

---

### Phase 6: Clean up residual items in `index.js`

**Goal:** Remove now-unnecessary imports, trim dead code, and optionally add a short file-level comment.

**What is allowed to change:**
- Remove any ST core imports from `index.js` that were only needed by the moved code (source links, WI updates, drawer) and are no longer needed at the `index.js` level.
- Add a brief top-of-file comment: "Entry point. Initializes all modules and exposes jumpToEntry."

**What must NOT change:**
- Any behavior. This is pure cleanup.

**Why this phase is low-risk:**
Import removal is detectable immediately by module load errors in the browser console. There is no silent failure.

---

## 4. Explicit Non-Goals

These things might look tempting but should NOT be done during this refactor:

- **Do not split `addDrawer()` into sub-functions inside `drawer.js`.** The function body stays intact during this refactor. Sub-dividing it is a separate future task.
- **Do not change any event listener behavior** — not timing, not subscription targets, not handler logic.
- **Do not move `jumpToEntry` out of `index.js`.** It is the public API for external extensions. Its location must remain stable.
- **Do not update `ARCHITECTURE.md` or `FEATURE_MAP.md` during the refactor phases.** Update them only after all phases are complete, when the final structure is stable.
- **Do not touch `cache`'s shape or contents.** It is passed by reference to every module. Shape changes would require testing every module.
- **Do not reorganize imports from SillyTavern core.** Rearranging those import lines is cosmetic noise with no readability payoff.
- **Do not refactor the list panel, editor panel, or order helper** as part of this work. They have their own planning documents.
- **Do not add JSDoc types** to code that wasn't already typed. This is a structural refactor only.

---

## 5. Safety Checklist

### Invariants that must remain true after every single phase

1. The drawer opens correctly after a fresh SillyTavern page load.
2. The book list renders all books with correct folder groupings, source-link icons, and active/collapse states.
3. Clicking any entry opens the editor panel for that entry.
4. Editing an entry and saving it persists the change (check via reload).
5. The editor does **not** auto-refresh when the user is actively typing (dirty-state guard is intact).
6. Source-link icons appear on book rows when a character or chat with linked lorebooks is active.
7. `jumpToEntry(bookName, uid)` navigates to the correct entry when called from outside the extension.
8. The Delete key removes selected entries when the drawer is open and focus is not in an input field.
9. The splitter between the list panel and editor panel is draggable and its position is remembered across reloads.
10. The Order Helper opens, shows entries, and closes correctly.

### Observable signs of regression (check the browser console after each phase)

- `Uncaught ReferenceError` or `Cannot read properties of undefined` — a moved function lost a dependency.
- `Uncaught SyntaxError` — an import statement was malformed.
- A function call returning `undefined` where an object was expected — a factory function forgot to return something.
- A button click doing nothing — an event listener was lost during the move.
- Source-link icons not appearing — `lorebookSourceLinks` was not wired up correctly.
- Editor auto-refreshing while the user is typing — `isDirty` check was broken.

### Things to manually verify after Phase 3 (bookSourceLinks extraction)

- Open a SillyTavern chat that has a character with linked lorebooks. Confirm the source-link icon appears on that book row.
- Switch to a different character. Confirm the icon disappears or updates.
- Open the book visibility filter. Confirm "Chat", "Character", and "Persona" options still work.

### Things to manually verify after Phase 4 (wiUpdateHandler extraction)

- Create a new lorebook entry. Confirm it appears in the list.
- Delete an entry. Confirm it disappears from the list.
- Edit an entry's title and save. Confirm the title updates in the list.
- Duplicate an entry. Confirm the editor re-opens on the duplicate (the refresh-queue behavior is intact).
- Use "Fill empty titles from keywords" from the book menu. Confirm entries without titles get their keywords as titles.

### Things to manually verify after Phase 5 (drawer extraction)

- Open the Order Helper. Apply an order. Confirm entries reorder correctly.
- Drag the splitter. Reload. Confirm the width was saved.
- Press Delete while entries are selected. Confirm they are deleted.
- Close and reopen the drawer. Confirm the mutation observer re-opens the last active entry.

### Critical files to keep in mind

- [index.js](../../index.js) — the file being decomposed; becomes the composition root
- [src/utils.js](../../src/utils.js) — extended in Phase 2; already established pattern for pure helpers
- [src/listPanel.js](../../src/listPanel.js) — reference for the factory/injection pattern all new modules must follow
- [src/editorPanel.js](../../src/editorPanel.js) — shows what `isDirty`, `clearEditor` look like from the outside
- [src/listPanel.bookMenu.js](../../src/listPanel.bookMenu.js) — confirms `fillEmptyTitlesWithKeywords` and `executeSlashCommand` are received via injection; call sites do not need to change
- [src/sortHelpers.js](../../src/sortHelpers.js) — already defines `METADATA_NAMESPACE` / `METADATA_SORT_KEY`; Phase 4 should import from here rather than redefine
