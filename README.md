# WorldInfo Drawer (SillyTavern extension)

WorldInfo Drawer replaces the default World Info (lorebook) editor with a full-screen drawer UI. It’s built to make large lorebooks easier to manage by giving you more space, clearer lists, and bulk-edit tools that avoid the cramped vanilla layout.

## Installation

1. Paste this link into the SillyTavern Extensions panel:
   ```
   https://github.com/lazuli-s/SillyTavern-WorldInfoDrawer.git
   ```
2. Restart SillyTavern.

## Key Features

### Drawer / Editor UX
- Full-screen drawer that replaces the default World Info editor.
- Split layout: list on the left, editor on the right, with a draggable splitter.
- “Focus”/“Unfocus” toggles for the editor to hide non-essential fields while editing.

### List Panel (books + entries)
- Create, import, and refresh books directly from the list controls.
- Quick refresh button to sync the list without reloading the page.
- Search supports matching books and (optionally) entry title/memo/keys.
- Fast selection: click to select, SHIFT for range select, DEL to delete selected entries.
- Drag and drop to move entries between books; hold CTRL to copy or duplicate.
- “Fill empty titles” option to auto-label entries based on their keywords.

### Sorting (global vs. per-book)
- Global sort options: title, position, depth, order, UID, trigger/keyword, token count, and custom display order.
- Optional per-book sort preferences with a toggle to switch between per-book and global sorting.
- One-click “clear preferences” to reset all per-book sorting back to global defaults.

### Order Helper (table view + bulk edits + custom ordering)
- Dedicated Order Helper view for bulk updates and ordering tasks.
- Table view of active entries with inline edits for ordering-related fields.
- Custom ordering by dragging rows (stored as a custom display index).
- Apply order values in bulk with Start / Spacing / Direction controls.

## Interface Screenshots

**Main drawer layout**
<img width="960" height="471" alt="editing_entry" src="https://github.com/user-attachments/assets/a5cc31c5-c0a8-4a4d-a8c7-ae4c609c7a9a" />

**Per-lorebook menu**
<img width="379" height="473" alt="individual_lorebook_menu" src="https://github.com/user-attachments/assets/2a1227a7-7ca1-4642-b671-d4265f462a3c" />

**Order Helper table**
<img width="960" height="468" alt="order_helper" src="https://github.com/user-attachments/assets/d5d1f66f-bfa4-4548-b54c-d9da729b03d5" />

## Order Helper (detailed)

The Order Helper is designed for bulk review and reordering, which is hard to do in the vanilla lorebook screen.

- **Scope:** show entries from all active books or focus on a single book.
- **Table view:** see active entries in rows with key fields exposed for quick edits.
- **Column visibility:** toggle columns on/off (for example: Recursion, Budget, Inclusion Groups) to keep the table focused on what you’re changing.
- **Custom ordering:** drag rows to define a custom display order independent of the list panel.
- **Apply Order values:** set Start / Spacing / Direction, select rows, and apply order values in bulk.
- **Filters:** simple filtering by strategy/position plus a script filter for advanced cases.

Compared to the original lorebook screen, this makes reordering and bulk edits faster because everything is in one table and you can selectively apply changes.

## What changed vs. the original WorldInfoDrawer

This is a fork of LenAnderson’s WorldInfoDrawer, with focused improvements:

- Added “fill empty titles” to auto-label entries that don’t have a title.
- Expanded sorting options and added a global vs. per-book sort toggle.
- Added a refresh button alongside the drawer controls.
- Order Helper now supports per-book or global contexts, row selection for applying updates, and optional keyword hiding.
- Order Helper can show a richer table view with configurable columns and custom drag ordering.

## Usage tips

- Open the WorldInfo Drawer from the top menu bar.
- Use the refresh button after imports or large edits to sync the list quickly.
- Use per-book sorting when you need different ordering per lorebook; clear preferences to return to global sorting.

## Recommended companion extensions (optional)

- https://github.com/aikohanasaki/SillyTavern-WorldInfoLocks — add lock controls to prevent accidental edits.
- https://github.com/LenAnderson/SillyTavern-WorldInfoBulkEdit — bulk edit fields across many entries at once.
- https://github.com/aikohanasaki/SillyTavern-WorldInfoInfo — extra metadata and visibility options for lorebook entries.

## Changelog / Updates

### Version 2.1.0
- Order Helper now supports a richer table view with configurable columns (including Recursion, Budget, Inclusion Groups).
- Added custom ordering via drag-and-drop inside the Order Helper.

### Version 2.0.2
- Reworked the Order Helper layout to make controls and columns easier to scan.
- Added an outlet name column and tightened column labels for clearer ordering context.
- Made Order Helper comments clickable links to jump directly to entries.
- Added a draggable splitter between the World Info list and editor.

### Version 2.0.1
- Added support for the extension 📚 ST Lorebook Ordering.

## Contributing

If you find a bug or have a suggestion, please open an issue or PR. Keep changes small and focused so they’re easier to review.
