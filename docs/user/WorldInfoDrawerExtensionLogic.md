# WorldInfo Drawer Extension Logic — Beginner Guide

> This document explains **this extension’s logic and data flow** in simple terms.
> It focuses on how the extension works and how it connects to Vanilla SillyTavern’s World Info APIs.

---

## 1) What this extension is (in plain words)

This extension **replaces the default World Info editor** with a full‑screen drawer.
It still uses SillyTavern’s built‑in World Info data, but it **renders and manages it differently**.

---

## 2) Big‑picture data flow (one‑screen overview)

1. **Boot**: `index.js` loads and wires everything together.
2. **Load data**: the extension reads Vanilla ST World Info books and entries.
3. **Render list**: books and entries appear in the left panel.
4. **Select entry**: clicking an entry opens the editor panel.
5. **Edit/save**: edits are saved back through Vanilla ST APIs.
6. **Order helper**: optional table view for bulk ordering and edits.

---

## 3) Main extension state (the “important memory”)

These are the key state objects the extension keeps while running:

- `cache`: local copy of books, entries, and metadata.
- `dom`: cached DOM references (drawer, list panel, editor, order helper UI).
- `listPanelApi`, `editorPanelApi`: module APIs returned by `initListPanel` and `initEditorPanel`.
- `selectionState`: list‑panel selection state (selected entries, range selection).
- `currentEditor`: which book/entry is open in the editor.

### Extension settings
- `Settings.instance`: stored under `extension_settings.wordInfoDrawer`.
- Per‑book sort preferences stored in metadata: `namespace: stwid`, `key: sort`.

---

## 4) Modules (each file’s job, in simple terms)

### Entry & boot
- **`index.js`**: main entry point, wires everything, handles global events and sync.

### Panels
- **`src/listPanel.js`**: renders books + entries list, search, filters, selection, drag/drop.
- **`src/editorPanel.js`**: renders the entry editor and handles focus/unfocus.
- **`src/worldEntry.js`**: renders a single entry row, selection and toggles.

### Order Helper (table view)
- **`src/orderHelper.js`**: main controller for Order Helper panel.
- **`src/orderHelperState.js`**: stores Order Helper UI state (columns, filters, sort).
- **`src/orderHelperFilters.js`**: logic for filter UI and applying filters.
- **`src/orderHelperRender.js`**: renders table rows and updates view.

### Shared helpers
- **`src/sortHelpers.js`**: sort logic and metadata helpers.
- **`src/utils.js`**: UI helpers like sort dropdown options and safe sorting.
- **`src/Settings.js`**: persisted extension settings.
- **`src/constants.js`**: sort enums.
- **`src/lorebookFolders.js`**: folder metadata + registry handling.

---

## 5) Key data flow paths (what calls what)

### A) Boot & wiring
- `index.js` creates `dom`, `cache`, and connects modules.
- It registers handlers for Vanilla ST events (e.g., updates to World Info data).

### B) Loading books/entries
- `index.js` calls Vanilla ST functions like `loadWorldInfo`.
- It clones data into `cache` and renders list rows via `renderEntry`.

### C) Selecting an entry
- `worldEntry.js` handles click selection logic.
- `editorPanel.js` opens the editor using Vanilla ST templates.

### D) Saving changes
- The extension writes back using Vanilla ST APIs like `saveWorldInfo`.
- It updates local `cache` and refreshes UI as needed.

### E) Order Helper updates
- `orderHelper.js` builds a table from cached entries.
- Drag/drop or edits update ordering and call `saveWorldInfo`.

---

## 6) How the extension connects to Vanilla ST World Info

The extension does not replace the data model. It **reads and writes through Vanilla ST**:

### Vanilla ST data it uses
- `world_names`: list of all lorebook names.
- `selected_world_info`: list of globally active books.

### Vanilla ST functions it calls
- `loadWorldInfo(name)`: load a book’s entries.
- `saveWorldInfo(name, data, immediately)`: save edits.
- `createNewWorldInfo(name)`: create new book.
- `createWorldInfoEntry(name, data)`: create new entry.
- `deleteWorldInfo(name)` / `deleteWorldInfoEntry(data, uid)`.
- `getWorldEntry(...)`: fetch entry details when opening editor.
- `renderTemplateAsync(...)`: render the built‑in editor template.
- `onWorldInfoChange(...)`: listen for changes from the core UI.

**In short:** the extension is a different UI layer on top of the same Vanilla ST World Info system.

---

## 7) Sorting & metadata flow

- Global defaults come from `Settings.instance`.
- Per‑book overrides are stored in metadata (`stwid` → `sort`).
- `sortHelpers.js` chooses which sort rule applies.

This affects:
- The order of entries in the list panel.
- The order of entries in the Order Helper table.

---

## 8) Selection & drag/drop flow (list panel)

- Clicking selects an entry (single or range).
- Shift‑click selects a range.
- Dragging moves or copies entries between books.

This state is tracked in `listPanel.js` and `worldEntry.js` and synced with `cache`.

---

## 9) Order Helper flow (bulk ordering)

- The Order Helper builds a table from **active books** or a selected book.
- You can reorder rows or edit values inline.
- When you apply changes, the extension updates entries and saves via `saveWorldInfo`.

---

## 10) How this differs from Vanilla ST logic

- Vanilla ST handles **core scanning/activation** of lorebook entries.
- This extension only changes **how you edit and organize** those entries.

The scanning rules (keywords, recursion, probability, budget) remain Vanilla ST behavior.

---

## 11) If you’re new, start here

If you’re learning step‑by‑step, focus on these basics first:

1. The extension **shows the same data** as Vanilla ST.
2. It saves back using **Vanilla ST functions**.
3. It adds tools (list panel + order helper) to make editing faster.

Once that’s clear, explore sorting, folders, and Order Helper filters.

---

## 12) List Panel logic (books + entries)

The List Panel is the left side of the drawer. It is responsible for **showing books and entries** and tracking selection.

Key logic (simple view):
- **Load & render**: it uses `cache` to build the list UI.
- **Search & filters**: it can match book names and entry fields (title, memo, keys).
- **Selection system**:
  - Click selects a single entry.
  - Shift‑click selects a range.
  - Delete removes selected entries.
- **Drag & drop**:
  - Drag to move entries to another book.
  - Ctrl + drag to copy or duplicate.

This is implemented mainly in `src/listPanel.js` and `src/worldEntry.js`.

---

## 13) Order Helper logic (table view)

The Order Helper is a **bulk editing table** for entries.

Key logic (simple view):
- Builds rows from the same cached entries used in the list.
- Lets you **reorder rows** by dragging (custom order).
- Lets you **edit fields inline** (like strategy, position, depth, order).
- Applies updates per book using `saveWorldInfo`.

Supporting tools:
- `src/orderHelperState.js`: keeps table settings (columns, sort, filters).
- `src/orderHelperFilters.js`: applies filtering rules.
- `src/orderHelperRender.js`: renders the table and updates the view.

---

## 14) Lorebook folders logic (grouping books)

Folders are **metadata tags** stored on each book:

- The folder name is stored in metadata.
- A local folder registry is kept in `localStorage`.
- Books can be grouped under folders in the List Panel.

Folder helper logic lives in `src/lorebookFolders.js`.
