# NEW FEATURE: Entry Manager Tabs
*Created: March 1, 2026*

**Type:** New Feature
**Status:** PLANNED
**Depends on:** `Refactoring_SrcFolderStructure.md` must be completed first

---

## Summary

Adds a tab system to the Entry Manager panel. The two existing collapsible rows
(Visibility row and Bulk Editor row) become two tabs. The entry rows table remains
always visible below, regardless of which tab is active.

A third tab for managing bulk-apply presets is planned for a future phase.

---

## Current Behavior

The Entry Manager has two collapsible sections stacked vertically above the entry rows table:

1. **Visibility row** — Keys toggle, Columns selector, Table Sorting, filter button
2. **Bulk Editor row** — Field containers for bulk editing (State, Strategy, Position, Depth, etc.)

Both rows are always accessible and independently collapsible.

---

## Expected Behavior

The two rows are replaced by a tab bar with two tabs. The entry rows table remains
always visible below, regardless of which tab is active.

| Area | Current | After |
|---|---|---|
| Visibility row | Collapsible section | **Tab 1: Display** |
| Bulk Editor row | Collapsible section | **Tab 2: Bulk Editor** |
| Entry rows table | Always visible | Always visible (unchanged) |

---

## Tab Definitions

### Tab 1: Display (`display-tab/`)

Controls how the table looks. Contains everything currently in the Visibility row:

- Keys toggle
- Columns selector
- Table Sorting
- Filter button

**Plus — container-visibility presets (new):**
- Controls which bulk-edit containers are shown in Tab 2
- Fixed system presets (e.g. "Minimal", "Full", "Mobile") — built-in defaults
- Per-container toggle overrides — manual show/hide per individual field
- *Especially important for mobile users where screen space is limited*

> **Why "Display" and not "Visibility":** Avoids confusion with the Book Browser's
> "Visibility" tab in the left panel. Same word, different feature — renaming prevents
> future mix-ups for both users and LLM agents.

### Tab 2: Bulk Editor (`bulk-editor/`)

The field containers as they work now. Which containers are visible is controlled
by Tab 1's container-visibility settings.

**Future addition — preset shortcut row:**
- Named one-click buttons that fill all the bulk-edit fields at once
- e.g. clicking "Outlet + No Budget" fills the right containers; user then clicks Apply
- Shortcut buttons are *created* in Tab 3 (Presets) but *applied* from here
- Deferred until Tab 3 is implemented

### Tab 3: Presets (`presets-tab/`) — future scope

Where users create and manage bulk-apply presets:

- Give a preset a name
- Define which fields have which values
- Save → shortcut button appears in Tab 2's preset shortcut row

---

## Tab Switching Architecture

Tab switching logic lives in **`entry-manager.js`** (the root orchestrator). No
separate file or folder is needed — the tab bar and switching state are simple
enough to own at that level (~50–100 lines).

---

## Folder Structure

After `Refactoring_SrcFolderStructure.md` creates the base layout, this feature
will populate the placeholder folders:

```
src/entry-manager/
  entry-manager.js                  ← adds: tab bar rendering + switching state

  display-tab/                      ← NEW: Tab 1 — Display
    display-tab.js                  ← orchestrates the display tab
    display-tab.columns.js          ← column/keys/sorting controls
                                       (split out from bulk-editor.action-bar.js)
    display-tab.container-presets.js  ← container-visibility preset logic (new)

  bulk-editor/                      ← EXISTING: Tab 2 — Bulk Editor
    bulk-editor.action-bar.js       ← loses Visibility row section (moves to display-tab/)
                                       gains preset shortcut row (future, when Tab 3 built)
    ... (all other bulk-editor files unchanged)

  presets-tab/                      ← FUTURE: Tab 3 — Presets
    presets-tab.js                  ← placeholder; implemented when Tab 3 is built
```

**Key split when implementing:** `bulk-editor.action-bar.js` currently contains both
the Visibility row (keys/columns/sorting) and the Bulk Editor row (field containers).
When this feature is built, the Visibility row code moves out to `display-tab/`.
`action-bar.js` retains only the Bulk Editor row code.

---

## What Changes in Existing Files

| File | Change |
|---|---|
| `entry-manager/entry-manager.js` | Add tab bar render + tab-switching state |
| `bulk-editor/bulk-editor.action-bar.js` | Remove Visibility row section; code moves to `display-tab/` |
| `bulk-editor/bulk-editor.js` | Wrap bulk editor panel in a tab-content container |

---

## Out of Scope for This Task

| Item | Why deferred |
|---|---|
| Preset shortcut row in Tab 2 | Depends on Tab 3 being built first |
| Tab 3: Presets tab full implementation | Significant scope; separate feature |
| Column-visibility presets (named saved layouts of column sets) | Further future addition on top of Tab 1 |

---

## Dependencies

- **Must be done first:** `Refactoring_SrcFolderStructure.md` — this task requires
  the new folder paths to exist before any code can be placed in them.
