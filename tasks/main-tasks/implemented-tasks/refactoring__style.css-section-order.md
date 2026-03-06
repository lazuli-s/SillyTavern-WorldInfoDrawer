# REFACTORING: CSS section order mirrors ARCHITECTURE.md module order

Created: March 5, 2026

**Type:** Refactoring
**Status:** IMPLEMENTED

---

## Summary

`style.css` has 8 numbered sections, but two pairs of them are in the wrong order
relative to the module tree in `ARCHITECTURE.md`. The file also contains stale
"Phase N" comments left over from an older refactoring pass that no longer mean
anything. This task reorders the sections to match the module tree and removes
those stale comments. No visual behavior changes. No CSS rules are added, removed,
or modified.

## Current Behavior

When a developer opens `style.css` and scans for styles belonging to a specific
module, the section order does not match `ARCHITECTURE.md`:

- **Splitter** styles (section 3) appear *after* Book Browser styles (section 2),
  even though `drawer.splitter.js` is listed right after `drawer.js` in the module tree.
- **Entry Manager** styles (section 6) appear *after* Shared UI Patterns (section 5),
  even though Entry Manager is a full feature module that comes before `src/shared/`
  in the architecture.

The file also contains stale "Phase N" implementation notes from a prior refactoring:

- **File header** (lines 1–6): references "Phase 1 CSS refactor" — no longer meaningful.
- **Four inline Phase labels** inside the `body.stwid-- #WorldInfo` custom-property block:
  - `/* Phase 2: extension-scoped tokens (keep visuals unchanged) */`
  - `/* Phase 3: layout stability (inner content scrolls) */`
  - `/* Phase 4: component primitives (menus, buttons, control hit targets) */`
  - `/* Phase 5: state styling primitives (consistent selection/target/focus) */`

## Expected Behavior

After this change, `style.css` sections follow the exact top-to-bottom order of
the module tree in `ARCHITECTURE.md`:

| Section # | Name |
| --- | --- |
| 1 | Drawer |
| 1.5 | Shared layout shells |
| 2 | Splitter |
| 3 | Book Browser |
| 4 | Editor Panel |
| 5 | Entry Manager |
| 6 | Shared UI Patterns |
| 7 | Misc |
| 8 | Accessibility |

## Agreed Scope

`style.css` only. No JS files are touched. The only changes are:

1. Moving the **Splitter block** (currently section 3) to sit before the Book Browser block (currently section 2).
2. Moving the **Entry Manager block** (currently section 6) to sit before the Shared UI Patterns block (currently section 5).
3. Updating the **section-number comments** (`/* 2) ... */`, `/* 3) ... */`, etc.) to match the new order.
4. Removing or replacing the **five stale Phase N comments** (file header + four inline labels).

## Out of Scope

- No CSS rules are changed, added, or removed.
- No subsection structure is changed within each block.
- No JS or HTML files are touched.
- The "1.5 Shared layout shells" sub-section stays where it is (between Drawer and Splitter) — it contains foundational layout shells (`.stwid--editor`, `.stwid--list .stwid--books`) used across features and is intentionally placed early.

## Implementation Plan

> **Safety rule:** Before moving any block, verify the exact start and end line
> numbers in the current file so nothing is accidentally truncated or duplicated.
> After all moves, do a quick check that the total line count of `style.css` is
> unchanged (no lines lost or duplicated).

### Step 1 — Locate the four section boundaries in `style.css`

Read `style.css` and record the exact line range for each of the four affected blocks:

- **Book Browser block**: starts at the `/* 2) Book Browser */` banner, ends at the line just before the `/* 3) Splitter */` banner.
- **Splitter block**: starts at the `/* 3) Splitter */` banner, ends at the line just before the `/* 4) Editor Panel */` banner.
- **Shared UI Patterns block**: starts at the `/* 5) Shared UI Patterns */` banner, ends at the line just before the `/* 6) Entry Manager */` banner.
- **Entry Manager block**: starts at the `/* 6) Entry Manager */` banner, ends at the line just before the `/* 7) Misc */` banner.

Completed: Verified the affected starts in the current file before editing: Book Browser `138`, Splitter `915`, Shared UI Patterns `1132`, Entry Manager `1328`.

### Step 2 — Swap Splitter and Book Browser

Rewrite the region between the `/* 2) ... */` and `/* 4) Editor Panel */` banners
so the Splitter block comes first and the Book Browser block comes second:

```text
[Splitter block content — unchanged]
[Book Browser block content — unchanged]
```

Update the section-number comment inside each moved block's banner:

- Former section 2 (Book Browser) → now section 3: change `/* 2) Book Browser */` to `/* 3) Book Browser */`
- Former section 3 (Splitter) → now section 2: change `/* 3) Splitter */` to `/* 2) Splitter */`

### Step 3 — Swap Entry Manager and Shared UI Patterns

Rewrite the region between the `/* 5) ... */` and `/* 7) Misc */` banners so the
Entry Manager block comes first and the Shared UI Patterns block comes second:

```text
[Entry Manager block content — unchanged]
[Shared UI Patterns block content — unchanged]
```

Update the section-number comment inside each moved block's banner:

- Former section 5 (Shared UI Patterns) → now section 6: change `/* 5) Shared UI Patterns */` to `/* 6) Shared UI Patterns */`
- Former section 6 (Entry Manager) → now section 5: change `/* 6) Entry Manager */` to `/* 5) Entry Manager */`

### Step 4 — Remove stale Phase N comments

In `style.css`, find and clean the following five stale comments. Do not change any
CSS property or value — only edit comment text.

**4a. File header (lines 1–6):**

Replace:

```css
/*
  SillyTavern World Info Drawer (STWID)

  Phase 1 CSS refactor: organization + safe micro-dedup only.
  Intent: preserve behavior; this file should read top-to-bottom as a UI tour.
*/
```

With:

```css
/*
  SillyTavern World Info Drawer (STWID)
  Styles follow the same top-to-bottom order as the module tree in ARCHITECTURE.md.
*/
```

**4b. Four inline Phase labels** inside `body.stwid-- #WorldInfo { ... }`:

For each of the four Phase comments, replace the label with a plain description of
what the group of CSS variables actually does:

| Remove | Replace with |
| --- | --- |
| `/* Phase 2: extension-scoped tokens (keep visuals unchanged) */` | `/* Spacing and radius tokens */` |
| `/* Phase 4: component primitives (menus, buttons, control hit targets) */` | `/* Hit-target and focus-ring tokens */` |
| `/* Phase 5: state styling primitives (consistent selection/target/focus) */` | `/* State tokens (hover, selected, target, disabled) */` |
| `/* Phase 3: layout stability (inner content scrolls) */` | `/* Layout */` |

### Step 5 — Verify

- [x] Confirm the eight section banners appear in this order: 1, 1.5, 2, 3, 4, 5, 6, 7, 8.
- [x] Confirm no `/* Phase` comment text remains anywhere in `style.css`.
- [x] Confirm no CSS property or selector was changed (a `git diff` should show only block movements, banner number edits, and comment text changes).

---

## After Implementation
*Implemented: March 6, 2026*

### What changed

`style.css`
- Reordered the Splitter section so it now appears before Book Browser, matching the architecture document.
- Reordered the Entry Manager section so it now appears before Shared UI Patterns, also matching the architecture document.
- Renumbered the moved section banners and replaced old "Phase" comments with plain descriptions of what each comment block means.

### Risks / What might break

- This touches section ordering in one large stylesheet, so a bad move could have hidden or duplicated a style block.
- The header and inline comments were rewritten, so a missed old label could leave the file inconsistent for future maintenance.

### Manual checks

- Open `style.css` and confirm the main section banners read in order: `1`, `1.5`, `2`, `3`, `4`, `5`, `6`, `7`, `8`.
- Search the file for `Phase`. Success means there are no matches.
- Reload the extension in the browser and open the drawer, book browser, splitter, editor panel, and Entry Manager. Success means everything looks and behaves the same as before.
