# Changelog Emoji Reference

Use this file to keep feature subheader emojis consistent across all CHANGELOG.md versions.

When adding a `####` subheader in the changelog, look up the correct area here.
Do not invent new emojis for existing areas. If a genuinely new area appears that has no match below, add it here first.

## Priority Rule

Always use the **most specific area that applies**. General areas are a fallback only.

Examples:

- A dropdown inside the Order Helper → **Order Helper**, not Drawer.
- Drag-and-drop for books between folders → **Lorebook Folders**, not List Panel.
- The search bar or entry text search → **Search**, not List Panel.
- The panel splitter or top control row → **Drawer**.

If a change spans multiple areas equally, pick the area where the user would most likely look for it.

## Feature Areas

Listed from most specific to most general — pick the first one that fits.

| Emoji | Feature Area | What belongs here |
| ----- | ------------ | ----------------- |
| 📊 | Order Helper | The full-screen entry reordering/bulk-edit table: columns, filters, sort controls, apply-order, inline row edits, script filter, drag sorting. |
| 📁 | Lorebook Folders | Folder creation, renaming, drag-and-drop assignment, active-toggle, collapse/expand, import/export, folder menus. |
| 👁️ | Book Visibility | The book visibility filter, source-based modes (All Active, Global, Chat, Persona, Character), and active-filter chips. |
| ✏️ | Entry Editor | The entry editor panel: opening, saving, dirty state, field editing, activation settings embed, focus/unfocus. |
| 🔍 | Search | The search bar, book name search, and entry text search. |
| ↕️ | Sorting | Sort controls, sort mode options, and per-book sort preferences. |
| 📋 | List Panel | Everything visible in the left panel: book rows, entry rows, book menus, selection, and any UI control that lives inside the panel. |
| 🗂️ | Drawer | The outer drawer frame: splitter resize, top control row, panel layout, and any wiring that spans the whole drawer. |
