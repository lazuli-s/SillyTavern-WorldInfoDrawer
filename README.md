# SillyTavern-WorldInfoDrawer

This is a forked version of LenAnderson's WorldInfoDrawer extension for SillyTavern. I've been using this extension since I discovered SillyTavern, but I felt it was missing some features that make playing around with lorebooks easier and faster.

## What this extension does

- Replaces the default lorebook screen with a **full-screen drawer** so the list, editor, and ordering tools are always visible.
- Lets you **collapse/expand all books** and refresh without leaving the page.
- Adds an **Order Helper** panel for mass reordering: drag entries, pick which ones to apply, and bulk-apply new order values with per-book or global sorting.
- Improves day-to-day editing with **selection tools** (SHIFT range select, DEL delete, drag to move/copy/duplicate).

## Installation

1. Paste this link into SillyTavern extensions panel:
   ```
   https://github.com/lazuli-s/SillyTavern-WorldInfoDrawer.git
   ```
2. Restart SillyTavern.

### Interface
<img width="960" height="471" alt="editing_entry" src="https://github.com/user-attachments/assets/a5cc31c5-c0a8-4a4d-a8c7-ae4c609c7a9a" />

### Individual Lorebook Menu
<img width="379" height="473" alt="individual_lorebook_menu" src="https://github.com/user-attachments/assets/2a1227a7-7ca1-4642-b671-d4265f462a3c" />

### Order Helper
<img width="960" height="468" alt="order_helper" src="https://github.com/user-attachments/assets/d5d1f66f-bfa4-4548-b54c-d9da729b03d5" />

## Main changes from Lenny's original version

- New “fill empty titles” toggle to auto-label entries that don’t have a title.
- Expanded sorting: choose from title, position, depth, order, UID, trigger/keyword, or token count, with ascending/descending controls.
- Order Helper is now per-book as well as global, so each lorebook can keep its own manual ordering while still offering a global fallback toggle.
- Added a refresh button alongside the drawer controls for quick syncs after edits.
- You can sort each book individually or switch to global sorting via the per-book sort toggle and “clear preferences” control.
- The Order Helper now lets you pick which entries to update and optionally hide keywords for a cleaner view while reordering.
- The Order Helper is now capable of visualizing all active entries in a table and allows you to choose which columns to edit. Drag entries to define custom ordering; the final order is defined in the Order Helper, not in the list panel.

## Why use this instead of the vanilla lorebook screen?

If you are new to SillyTavern lorebooks, the default screen is fine for quick edits. This drawer is for when you want to **see more, click less, and move fast**:

- **More information at once.** The list, editor, and ordering tools stay on screen, so you do not jump between panels.
- **Better sorting control.** Global and per-book sort preferences make it easy to keep a tidy library.
- **Faster navigation.** Click entries to open the editor instantly, jump from Order Helper rows to the exact entry, and refresh the list without reloading.

In short: it feels closer to a spreadsheet + editor rather than a single-entry form.

## How to use the drawer (simple walkthrough)

1. **Open the drawer.** Use the World Info button in the top menu bar.
2. **Pick a book.** Books are listed on the left. Click the title to collapse/expand.
3. **Select entries.**  
   - Click the checkbox icon to select.  
   - Hold **SHIFT** to select a range.  
   - Press **DEL** to delete selected entries.  
   - Drag selected entries onto another book to move them. Hold **CTRL** to copy or duplicate.
4. **Edit an entry.** Click the entry row to open it in the editor on the right.
5. **Reorder in bulk.** Open **Order Helper**, drag rows to your preferred order, select which rows to apply, then apply the order.

## Key features vs vanilla lorebook management

- **Full-screen, split layout** (list + editor + Order Helper at once).
- **Multi-select with drag/copy/duplicate** for moving entries across books.
- **Order Helper table** with column visibility, quick links, and bulk apply.
- **Per-book sorting** with a global fallback (clear preferences anytime).

## Must-have extensions (optional but recommended)

- https://github.com/aikohanasaki/SillyTavern-WorldInfoLocks
- https://github.com/LenAnderson/SillyTavern-WorldInfoBulkEdit
- https://github.com/aikohanasaki/SillyTavern-WorldInfoInfo

## Contributing

A warning: I have no idea what I'm doing with my life, and this was completely vibe coded using Codex. But it seems to work! I've been testing it for a while, and no console errors so far.

So if you find a bug or a potential issue, please tell me and I'll do my best to ask GPT 5.2 to fix it (or please do the git thing if you actually know something about coding and want to fix the issue yourself).

Please tell me if you have any ideas or suggestions as well. I think World Info is probably the best ST feature so far, and I've probably spent a very shameful amount of hours editing lore on this extension drawer. I'm very glad Lenny made this, and I hope more users become aware of this great extension.

## Updates

### Version 2.0.1
Added support to ⁠the extension 📚 ST Lorebook Ordering

### Version 2.0.2
- Reworked the Order Helper layout to make the controls and columns easier to scan.
- Added an outlet name column and tightened column labels for clearer ordering context.
- Made Order Helper comments clickable links to jump directly to entries.
- Added a draggable splitter between the World Info list and editor, allowing to change the width

### Version 2.1.0
- The Order Helper is now more than just reordering: you can visualize all active entries in a table and choose which columns to show (including Recursion settings, budget, Inclusion Groups, and more).
- Added custom ordering: the order is manually defined inside the Order Helper by dragging entries.
