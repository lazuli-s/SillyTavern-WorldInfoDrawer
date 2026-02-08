# World Info Drawer - A SillyTavern Extension

This is a forked version of LenAnderson's WorldInfoDrawer extension for SillyTavern. I've been using this extension since I discovered SillyTavern, but I felt it was missing some features that make working with lorebooks much easier.

## What this extension does

- Adds a full screen drawer layout for editing lorebook entries, so you can focus entirely on lore and worldbuilding.
- Provides one-click collapse/expand for all books and a quick refresh to pull the latest lorebook state without reloading the page.
- 📁 **LOREBOOK FOLDERS** for organizing your collection of lorebooks. You can create folders, export and import entire folder sets, and manage folder actions from a context menu.
- 📇 **ORDER HELPER** panel for mass updates. Drag to reorder entries, filter by strategy/position/recursion/outlet/automation ID/inclusion group, choose which columns to show, and bulk-apply changes in order.

## Installation

1. Paste this link into SillyTavern extensions panel:
   ```
   https://github.com/lazuli-s/SillyTavern-WorldInfoDrawer
   ```
2. Restart SillyTavern.

## Main features

### 🖥️ Better editing flow
- Edit in a full-screen World Info drawer so you can focus on writing instead of fighting a cramped panel.
- Manage many entries quickly with `Ctrl` click, `Shift` range select, and multi-select support.
- Move selected entries between lorebooks with less clicking and less scrolling.

### 📁 Lorebook folders
- Organize your lorebooks into folders to keep large projects clean and easy to navigate.
- Import or export whole folder groups to move sets of books in one step.
- Use folder actions (rename, delete, export, import, create book) from one menu.
- Run Order Helper on a single folder scope when you only want to reorder books in that folder.

### 📇 Order Helper for bulk work
- View active entries in a table and reorder them with drag-and-drop.
- Choose your scope: all active books, one book, or one folder scope.
- Filter by strategy, position, recursion flags, outlet, automation ID, and inclusion group to find exactly what you need.

### 🏷️ Fill empty titles
- Use `Fill empty titles` to auto-name entries that are still untitled, which makes large books easier to scan.

### 🔀 Custom sorting
- Set sorting per lorebook when different books need different organization.
- Or apply one global sorting override for a consistent order across all books.

## Screenshots

### Interface
<img width="960" height="471" alt="editing_entry" src="https://github.com/user-attachments/assets/a5cc31c5-c0a8-4a4d-a8c7-ae4c609c7a9a" />

### Individual Lorebook Menu
<img width="379" height="473" alt="individual_lorebook_menu" src="https://github.com/user-attachments/assets/2a1227a7-7ca1-4642-b671-d4265f462a3c" />

### Order Helper
<img width="960" height="468" alt="order_helper" src="https://github.com/user-attachments/assets/d5d1f66f-bfa4-4548-b54c-d9da729b03d5" />


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