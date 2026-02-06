# SillyTavern-WorldInfoDrawer

This is a forked version of LenAnderson's WorldInfoDrawer extension for SillyTavern. I've been using this extension since I discovered SillyTavern, but I felt it was missing some features that make working with lorebooks much easier.

## What this extension does

- Adds a full screen drawer layout for editing lorebook entries, so you can focus entirely on lore and worldbuilding.
- Provides one-click collapse/expand for all books and a quick refresh to pull the latest lorebook state without reloading the page.
- 📁 **LOREBOOK FOLDERS** for organizing your collection of lorebooks. You can create folders, export and import entire folder sets, and manage folder actions from a context menu.
- 📇 **ORDER HELPER** panel for mass updates. Drag to reorder entries, filter by strategy/position/recursion/outlet/automation ID/inclusion group, choose which columns to show, and bulk-apply changes in order.

## Main features

### Better editing flow
- Full-screen World Info drawer, so you can focus on editing without the cramped default panel and visualize books and entries more clearly.
- CTRL click, SHIFT range select, and multi-select support for faster entry management, including moving entries across lorebooks more easily.

### 📁 Lorebook folders
- Create folders and group lorebooks in a cleaner structure.
- Import and export many lorebooks at once when they are grouped in the same folder.
- Folder actions from the menu: rename, delete, export, import into folder, and create book in folder.
- Apply Order Helper to an entire folder scope when you want to reorder only that folder's active books.

### 📇 Order Helper for bulk work
- Table view for active entries with custom drag ordering.
- Use it by scope: all active books, one book, or a folder scope.
- Filter rows by strategy, position, recursion flags, outlet, automation ID, and inclusion group.

### Fill empty titles
- Use "Fill empty titles" to automatically name entries that do not have titles yet.

### Custom sorting
- Give each lorebook its own sorting preference, or use one global sorting override across all books.

## Screenshots

### Interface
<img width="960" height="471" alt="editing_entry" src="https://github.com/user-attachments/assets/a5cc31c5-c0a8-4a4d-a8c7-ae4c609c7a9a" />

### Individual Lorebook Menu
<img width="379" height="473" alt="individual_lorebook_menu" src="https://github.com/user-attachments/assets/2a1227a7-7ca1-4642-b671-d4265f462a3c" />

### Order Helper
<img width="960" height="468" alt="order_helper" src="https://github.com/user-attachments/assets/d5d1f66f-bfa4-4548-b54c-d9da729b03d5" />

## Installation

1. Paste this link into SillyTavern extensions panel:
   ```
   https://github.com/lazuli-s/SillyTavern-WorldInfoDrawer
   ```
2. Restart SillyTavern.

## To-do list
- Make the filter system easier to use.
- LOREBOOK TAGS: add a tag system to classify entries (for example: character description, secondary character, location, summary), filter by tags, and optionally enable/disable specific tags.
- Fix some CSS alignment issues.

## Must-have extensions (optional but recommended)

- https://github.com/aikohanasaki/SillyTavern-WorldInfoLocks
- https://github.com/LenAnderson/SillyTavern-WorldInfoBulkEdit
- https://github.com/aikohanasaki/SillyTavern-WorldInfoInfo

## Contributing

A warning: I have no idea what I'm doing with my life, and this was completely vibe coded using Codex. But it seems to work! I've been testing it for a while, and no console errors so far.

So if you find a bug or a potential issue, please tell me and I'll do my best to ask GPT 5.2 to fix it (or please do the git thing if you actually know something about coding and want to fix the issue yourself).

Please tell me if you have any ideas or suggestions as well. I think World Info is probably the best ST feature so far, and I've probably spent a very shameful amount of hours editing lore on this extension drawer. I'm very glad Lenny made this, and I hope more users become aware of this great extension.

## Updates

### Version 2.2.0
- New feature: 📁 **LOREBOOK FOLDERS**. Added a full folder system for lorebooks, including folder grouping, folder import/create controls, and drag-and-drop moving of books between folders and root.
   - Added folder-level active toggles with tri-state behavior, folder context actions (rename/delete/export/import/create book), and folder collapse-state persistence.
   - Added folder-scoped Order Helper support so you can apply ordering to a specific folder's active books.
- 📇 **EXPANDED ORDER HELPER** with filters (strategy, position, recursion flags, outlet, automation ID, inclusion group), direct editing, move controls, and the option to choose which columns to show or hide.
- Improved reliability in day-to-day editing: safer selection behavior, better protection against accidental Delete key actions while typing, better editor dirty-state handling during refresh, and more reliable folder import/update syncing. Compared to the previous release, this version is more reliable and performs better.

### Version 2.1.0
- The Order Helper is now more than just reordering: you can visualize all active entries in a table, and select which columns to show. Also added new columns such as Recursion settings, budget, Inclusion Groups, etc.
- Added custom ordering: the order is manually defined inside the Order Helper by dragging entries.

### Version 2.0.2
- Reworked the Order Helper layout to make the controls and columns easier to scan.
- Added an outlet name column and tightened column labels for clearer ordering context.
- Made Order Helper comments clickable links to jump directly to entries.
- Added a draggable splitter between the World Info list and editor, allowing to change the width.

### Version 2.0.1
- Added support to the extension ST Lorebook Ordering.
