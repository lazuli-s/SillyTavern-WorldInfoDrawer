# Refactoring style.css — Step 1: Baseline & Safety Checks

> **No code changes in this step.** The only goal is to walk through every major UI surface and confirm it currently looks correct. If you find something broken *before* any edits, note it below so it isn't blamed on the refactor later.

### Pre-flight

- [x] Record baseline line count: **1,729 lines** (measured 2026-02-17)
- [x] Hard-reload the SillyTavern tab (Ctrl+Shift+R) to ensure a clean browser cache
- [x] Open browser DevTools (F12) → Console tab — confirm no red CSS errors on load
- [x] Open browser DevTools → Elements tab — confirm `body` has the `stwid--` class present (this means the extension is active)

---

### 1. Drawer shell

- [x] Open the World Info drawer — it opens full-width with no layout shift or white flash
- [x] List panel (left) and editor panel (right) are side by side, separated by the visible splitter bar
- [x] The splitter can be dragged left/right and both panels resize correctly
- [x] If books are loaded, the brief loading overlay appears and then disappears cleanly
- [x] Closing and reopening the drawer — no leftover state or visual glitch

---

### 2. List panel — top controls and filter row

- [x] The controls row at the top (New Book button, any other icon buttons) is visible and properly spaced
- [x] The sort controls row is visible below the main controls
- [x] The search/filter input row is visible and the input field is full-width
- [x] The visibility filter row (book visibility chips) is visible below the search row
- [x] All four rows stack cleanly without overlapping or cropping

---

### 3. Visibility chips and multiselect dropdown

- [x] One or more visibility chips (e.g. "Enabled", "Disabled", "Always On") are visible in the filter row
- [x] Click the Book Visibility button — a dropdown menu opens below it
- [x] The dropdown menu has: a border, a slightly tinted background, and each item on its own line
- [x] Hover over a dropdown item — it highlights (background color changes)
- [x] A checked/selected item shows its checked state visually
- [x] Click outside the dropdown — ⚠ **PRE-EXISTING BUG:** dropdown does NOT close on outside click
- [x] Opening the dropdown again — the previously selected state is preserved
- [x] After selecting filter options, the matching chips appear in the filter row to show the active filter(s)
- [x] List panel chips: **display only** — they show which filters are active but are not clickable
- [x] Order Helper chips: **clickable** — clicking a chip removes that filter and the chip disappears

---

### 4. Folder rows

- [x] Folder rows show: a folder icon, label text, entry count badge, and action icon buttons on the right
- [x] Action buttons on a folder row are either always visible or appear on hover — **always visible**
- [x] Clicking the collapse/expand toggle on a folder — books inside expand or collapse with correct animation/transition
- [x] A collapsed folder shows the correct collapsed state visually
- [x] Clicking a folder action button — a dropdown context menu appears anchored near the button
- [x] The tri-state active toggle (if present on folders) cycles through its three states with visible state change

---

### 5. Book rows

- [x] Book rows show: source icon(s), book name, and action icon buttons on the right — **no entry count shown**
- [x] Book action buttons are **always visible** (not hover-dependent)
- [x] Clicking the book header row — entries inside expand or collapse
- [x] A collapsed book shows correct visual state (entries hidden, toggle reflects collapsed)
- [x] Hovering a book action icon — pointer cursor, opacity change
- [x] Clicking a book action button — dropdown context menu appears
- [x] A book with no entries shows its empty state correctly (e.g. "No entries" or just empty space)

---

### 6. Entry list rows

- [x] Entry rows show: selector checkbox column, body text (truncated if long), key text (truncated if long), and status controls column
- [x] Long body text and long key text are truncated with an ellipsis (…) rather than wrapping or overflowing
- [x] Hovering an entry row — background highlight appears
- [x] Clicking an entry row — it becomes selected (different background color / highlight)
- [x] Multiple entries can be selected (if that's supported) — selected state shows on each
- [x] A disabled entry (world info entry turned off) shows visually reduced opacity


---

### 7. Context menu and Move Book modal

- [x] Trigger a context/action menu on a book (via its action button) — menu appears anchored near the trigger
- [x] Menu items have consistent left-padding, gap between icon and label, hover state
- [x] The menu is layered above all other content (not hidden behind anything)
- [x] Keyboard: pressing Escape while a menu is open → ⚠ **PRE-EXISTING BUG:** Escape closes the entire drawer instead of just the menu
- [x] Click "Move Book" (or equivalent action) — the Move Book modal opens
- [x] Move Book modal has: a title, a list of destination options, OK and Cancel buttons
- [x] Clicking Cancel — modal closes, no change
- [x] The modal is centered and styled consistently with SillyTavern's other dialogs

---

### 8. Editor panel (right side)

- [x] Click any entry in the list — the editor panel loads that entry's content
- [x] Editor shows: content/text area, primary keys field, secondary keys field, comment field
- [x] Editor shows: insertion order, enabled toggle, position dropdown, and other activation settings
- [x] All fields are readable and not cropped or overlapping
- [x] Typing in any editor field — input is accepted without visual glitches
- [x] Switching to a different entry — editor clears and reloads the new entry cleanly

---

### 9. Focus mode

- [x] The focus mode toggle button is visible (somewhere near the editor panel)
- [x] Click focus mode toggle — list panel remains visible; other editor fields hide; **content field expands** to fill the editor area (this is the intended behavior)
- [x] In focus mode: the content/text area is larger and usable
- [x] In focus mode: the unfocus/exit button is visible

---

### 10. Order Helper

- [x] Open the Order Helper panel (via its trigger button in the extension UI)
- [x] The table renders with column headers visible
- [x] The filter/action strip above the table is visible with its controls
- [x] Column visibility toggles are present and accessible
- [x] Clicking a column visibility toggle hides or shows that column without breaking table layout
- [x] Hovering a table row — row hover highlight appears
- [x] Clicking a table row — row selected state appears
- [x] Per-column filter menus (if present) — open and close correctly
- [x] The "Move" controls on each row (arrows or drag handle) are visible
- [x] Drag-to-reorder: drag handle visible; dragging a row shows the drag state (row appears "lifted")

---

### 11. Theme sanity

- [x] SmartTheme accent colors appear in the correct places (focus rings, buttons, highlights)
- [x] No element has an obviously wrong color (e.g. white text on white background, invisible buttons)
- [x] Background blur/transparency effects (if any) render correctly and don't leak outside their containers
- [x] Press Tab to move keyboard focus through the UI — focus rings appear on every focusable control

---

### Baseline summary

- **Date checked:** 2026-02-18
- **Pre-existing bugs found (do NOT attribute to the refactor):**
  1. **Visibility dropdown does not close on outside click** (section 3)
  2. **Escape key closes the entire drawer instead of just an open menu** (section 7)

> Step 1 complete. Baseline confirmed. Step 2 can begin.
