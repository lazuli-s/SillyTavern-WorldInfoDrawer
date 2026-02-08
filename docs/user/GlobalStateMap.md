# Global State Map (WorldInfo Drawer Extension)

This document lists all **global/long‑lived state** used by the extension, with plain‑language explanations so a new developer (or non‑programmer) can understand what each piece does.

> Notes
> - “Global/long‑lived state” includes module‑level variables, shared objects passed between modules (like `context`), and browser persistence (localStorage / `extension_settings`).
> - SillyTavern’s own state (e.g. `world_names`, `selected_world_info`, and core DOM templates like `#entry_edit_template`) is referenced but not owned by this extension.

---

## cache
- **Type:** data
- **Owner:** `index.js`
- **Mutation points:**
  - Rebuilt during `updateWIChange(...)` whenever World Info updates arrive.
  - Populated per‑book in `listPanel.renderBook(...)` during initial load/refresh.
  - Entry toggles in `worldEntry.renderEntry(...)` update values (enabled/strategy).
  - Order Helper’s `ensureCustomDisplayIndex(...)` writes `extensions.display_index`.
- **Explanation:**
  This is the extension’s **in‑memory library of all lorebooks and entries**. Instead of re‑fetching everything from SillyTavern every time you click, the extension keeps a local copy in `cache`. When you edit entries, the cache is updated first and then saved back to SillyTavern.

---

## lorebookSourceLinks / lorebookSourceLinksSignature
- **Type:** data
- **Owner:** `index.js`
- **Mutation points:**
  - Recomputed in `refreshBookSourceLinks(...)`.
  - Triggered by `updateWIChange(...)` and `updateSettingsChange(...)`.
  - Triggered by context events (`CHAT_CHANGED`, `GROUP_UPDATED`, `CHARACTER_EDITED`, `CHARACTER_PAGE_LOADED`, `SETTINGS_UPDATED`).
  - Triggered by popup selector changes for chat/persona lorebook assignment.
- **Explanation:**
  `lorebookSourceLinks` stores per-book source badges (`character`, `chat`, `persona`) used by lorebook rows in the list panel.
  `lorebookSourceLinksSignature` stores a snapshot hash used to skip redundant UI updates when source membership did not change.

---

## currentEditor
- **Type:** UI
- **Owner:** `index.js`
- **Mutation points:**
  - Set when `editorPanel.openEntryEditor(...)` opens an entry.
  - Cleared by `editorPanel.clearEditor(...)`, `hideActivationSettings(...)`, or when the entry is deleted.
- **Explanation:**
  Tracks **which entry is currently open in the editor**. It stores `{ name, uid }` so the extension knows which row should be highlighted and which data should be shown in the editor panel.

---

## dom
- **Type:** UI
- **Owner:** `index.js`
- **Mutation points:**
  - Built in `addDrawer()` when the drawer UI is created.
  - Various modules populate child references (list panel, order helper, editor).
- **Explanation:**
  A **central map of important DOM elements** (drawer body, book list, editor, order helper table, etc.). It helps all modules update UI elements without constantly searching the page.

---

## activationBlock / activationBlockParent
- **Type:** UI
- **Owner:** `index.js`
- **Mutation points:**
  - Moved into/out of the editor via `editorPanel.showActivationSettings()` and `hideActivationSettings()`.
- **Explanation:**
  References to the **global activation settings block** from SillyTavern. The extension temporarily moves this block into the drawer when you open activation settings, then puts it back where it came from.

---

## listPanelApi
- **Type:** UI (module API handle)
- **Owner:** `index.js`
- **Mutation points:**
  - Set once when `initListPanel(...)` returns the list panel API.
- **Explanation:**
  This is the **list panel’s public API** (render book, refresh list, selection helpers, etc.) so the entry point can control the list UI.

---

## editorPanelApi
- **Type:** UI (module API handle)
- **Owner:** `index.js`
- **Mutation points:**
  - Set once when `initEditorPanel(...)` returns the editor API.
- **Explanation:**
  This is the **editor panel’s public API** (open entry, clear editor, toggle activation settings).

---

## selectionState
- **Type:** UI/data
- **Owner:** `index.js` (via `listPanelApi.getSelectionState()`)
- **Mutation points:**
  - Updated through the list panel’s getters/setters and entry selection logic.
- **Explanation:**
  A **shared selection snapshot** (which entries are selected, which book they belong to, last clicked entry). This allows drag/drop, multi‑select, and delete‑selected to work consistently.

---

## updateWIChangeStarted / updateWIChangeFinished
- **Type:** control flow (promises)
- **Owner:** `index.js`
- **Mutation points:**
  - Recreated/resolved inside `updateWIChange(...)`.
- **Explanation:**
  These are **manual “wait points”** used when creating or refreshing books, so the UI can wait until the live update finishes before doing follow‑up actions like scrolling.

---

## updateWIChangeToken
- **Type:** control flow (monotonic counter)
- **Owner:** `index.js`
- **Mutation points:**
  - Incremented at the start of each `updateWIChange(...)` cycle.
  - Read by `waitForWorldInfoUpdate()`.
- **Explanation:**
  A **monotonic “version number”** for WORLDINFO update cycles. `waitForWorldInfoUpdate()` captures the current token and only resolves when a strictly newer update starts and finishes, preventing false positives from older/overlapping updates.

---

---

## state (listPanel module state bag)
- **Type:** data + UI
- **Owner:** `src/listPanel.js`
- **Mutation points:**
  - Assigned in `initListPanel(options)`.
- **Explanation:**
  A **container for dependencies and shared resources** (cache, DOM refs, helper functions). It lets the list panel operate without importing everything directly.

---

## searchInput / searchEntriesInput / filterActiveInput
- **Type:** UI
- **Owner:** `src/listPanel.js`
- **Mutation points:**
  - Set inside `setupFilter(...)` when filter UI is built.
- **Explanation:**
  Stored references to the **search box and filter toggles**, so filtering can be re‑applied without re‑querying the DOM.

---

## loadListDebounced
- **Type:** control flow
- **Owner:** `src/listPanel.js`
- **Mutation points:**
  - Set in `initListPanel(...)` using a debounced wrapper.
- **Explanation:**
  A **debounced version of the “load books” function**. It prevents rapid reloads from flooding the DOM or API calls.

---

## collapseStates
- **Type:** UI
- **Owner:** `src/listPanel.js`
- **Mutation points:**
  - Updated by `setCollapseState(...)` and `setBookCollapsed(...)`.
- **Explanation:**
  Remembers **which books are collapsed vs. expanded**, so the list panel can restore that state after refreshes.

---

## folderCollapseStates
- **Type:** UI
- **Owner:** `src/listPanel.js`
- **Mutation points:**
  - Updated when a folder header is toggled (via `createFolderDom(...).onToggle`).
  - Read when folders are re-rendered on refresh to restore collapse state.
- **Explanation:**
  Remembers **which folders are collapsed vs. expanded**, so folder sections stay consistent after a refresh.

---

## folderDoms
- **Type:** UI (DOM registry)
- **Owner:** `src/listPanel.js`
- **Mutation points:**
  - Filled/cleared during `loadList()` and `renderBook()` when folders are created.
  - Disconnected/cleared during refresh (`refreshList()` cleans observers and map entries).
- **Explanation:**
  A lookup table of **folder UI components** (`{ [folderName]: { root, books, observer, ... } }`) so the list panel can:
  - insert books into the correct folder container,
  - update folder active toggles,
  - and clean up observers during refresh.

---

## dragBookName
- **Type:** UI (drag/drop)
- **Owner:** `src/listPanel.js`
- **Mutation points:**
  - Set on book title `dragstart`.
  - Cleared on `dragend` and on drop handlers.
- **Explanation:**
  Tracks **which book is currently being dragged** (book‑level drag/drop). This is used for moving/duplicating books into folders or back to the root.

---

## folderImportInput
- **Type:** UI (DOM element)
- **Owner:** `src/listPanel.js`
- **Mutation points:**
  - Lazily created on first call to `openFolderImportDialog()`.
- **Explanation:**
  A hidden `<input type="file">` created by the extension to support **folder import** (importing a JSON file that contains multiple books).

---

## selectLast / selectFrom / selectMode / selectList / selectToast
- **Type:** UI + data
- **Owner:** `src/listPanel.js`
- **Mutation points:**
  - Managed by `selectAdd(...)`, `selectRemove(...)`, `selectEnd(...)`.
  - Updated via click selection logic in `worldEntry.renderEntry(...)`.
- **Explanation:**
  These variables power **multi‑selection and drag/drop**:
  - `selectFrom`: which book the selection started in
  - `selectList`: list of selected entries
  - `selectLast`: last clicked entry (for shift‑range)
  - `selectMode`: whether CTRL/SHIFT selection is active
  - `selectToast`: the help tooltip shown when selection starts

---

## folderMenuActions
- **Type:** data (capabilities object)
- **Owner:** `src/listPanel.js`
- **Mutation points:**
  - Built inside `initListPanel(...)`.
- **Explanation:**
  A bundle of **callbacks and dependencies** passed to folder UI (`createFolderDom`).
  It contains things like `openImportDialog`, `setBookFolder`, `refreshList`, and helpers to toggle active books.

---

## context (worldEntry module state)
- **Type:** data + UI
- **Owner:** `src/worldEntry.js`
- **Mutation points:**
  - Set once via `setWorldEntryContext(...)` in `index.js`.
- **Explanation:**
  A **shared bridge object** that gives each entry row access to the cache, selection helpers, and editor panel without direct imports.

---

## clickToken (per-entry click guard)
- **Type:** control flow (token string)
- **Owner:** `src/worldEntry.js` (inside `renderEntry` closure)
- **Mutation points:**
  - Set to a fresh `uuidv4()` on each click.
  - Read by `isTokenCurrent()` to cancel stale async editor rendering.
- **Explanation:**
  Prevents a slow async editor render from a previous click from “winning” after the user has already clicked a different entry. Only the latest click token is allowed to finish rendering.

---

## orderHelperState
- **Type:** data + UI
- **Owner:** `src/orderHelper.js`
- **Mutation points:**
  - Built in `initOrderHelper(...)` with defaults and localStorage values.
  - Updated by Order Helper UI actions (sort, columns, filters, etc.).
- **Explanation:**
  Stores the **Order Helper’s preferences and current mode**, such as sorting, selected book scope, hidden keys, and column visibility. It’s persisted to localStorage so your settings survive reloads.

---

## scopedBookNames
- **Type:** data (scope override)
- **Owner:** `src/orderHelper.js`
- **Mutation points:**
  - Set when `openOrderHelper(book, scope)` is called.
  - Read by `getOrderHelperSourceEntries()` to decide which books contribute rows.
- **Explanation:**
  An optional override list of book names that defines a **custom Order Helper scope**, e.g. “active books inside this folder.” When present, it replaces the default “all globally active books” scope.

---

## ORDER_HELPER_*_STORAGE_KEY
- **Type:** data (persistent storage keys)
- **Owner:** `src/orderHelper.js`
- **Mutation points:**
  - Used to read/write Order Helper preferences in localStorage.
- **Explanation:**
  These are the **localStorage keys** used to remember Order Helper settings like sort mode, hidden keys, and column visibility.

---

## stwid--order-* (Order apply controls in localStorage)
- **Type:** data (persistent)
- **Owner:** `src/orderHelperRender.js`
- **Keys:**
  - `stwid--order-start` (number)
  - `stwid--order-step` (number)
  - `stwid--order-direction` (`"up"` or `"down"`)
  - `stwid--order-filter` (string: STscript snippet)
- **Mutation points:**
  - Updated by the Order Helper UI controls (start/spacing/direction/filter textarea).
- **Explanation:**
  Persistent user preferences for **how “Apply Order” behaves** and the last used filter script.

---

## Settings.instance (singleton)
- **Type:** data (persistent settings)
- **Owner:** `src/Settings.js`
- **Mutation points:**
  - Updated by UI controls in `index.js` (global sort dropdown, per‑book sort toggle).
  - Saved via `Settings.save()` → `saveSettingsDebounced()`.
- **Explanation:**
The extension’s **global settings object**, stored in `extension_settings.worldInfoDrawer`. It remembers default sorting and whether per‑book sorting is enabled.

---

## Folder Registry (localStorage)
- **Type:** data (persistent)
- **Owner:** `src/lorebookFolders.js`
- **Storage key:** `stwid--folder-registry`
- **Mutation points:**
  - Read/validated via `getFolderRegistry()`.
  - Updated via `registerFolderName()` and `removeFolderName()`.
- **Explanation:**
  Stores the list of **known folder names** so empty folders can still appear in the UI even if they temporarily contain no books.

---

## Folder assignment in book metadata
- **Type:** data (persisted with each book)
- **Owner:** `src/lorebookFolders.js` (helpers), written via `src/listPanel.js`
- **Metadata key:** `folder` (top-level book metadata)
- **Mutation points:**
  - Written by `setFolderInMetadata(...)` and saved with `saveWorldInfo(...)`.
  - Sanitized by `sanitizeFolderMetadata(...)` to remove invalid values.
- **Explanation:**
  Each lorebook stores its folder membership in its own metadata under the `folder` key. This is how folders persist across reloads and exports.

---

## dom.order.entries
- **Type:** UI/data
- **Owner:** `index.js`
- **Mutation points:**
  - Filled by Order Helper when building the table rows.
- **Explanation:**
  A lookup map of **Order Helper rows** (`{ book -> uid -> <tr> }`) so the helper can re‑sort and select rows efficiently without scanning the DOM.
