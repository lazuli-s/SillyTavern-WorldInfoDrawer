# TASK: Remove `.stwid--orderHelper` parent prefix and rename conflicting classes
*Created: February 23, 2026*

**Type:** REFACTORING
**Status:** NO_ISSUES

---

## Summary

Many CSS rules in `style.css` are unnecessarily prefixed with `.stwid--orderHelper` as a parent
scope. Because every order helper element already has a unique `stwid--` class name, the parent
prefix adds nothing — the classes can't accidentally match anything outside the order helper. This
task removes the redundant prefix, renames the two class names that actually conflict with list
panel classes, and adds a formal naming rule to prevent this pattern from being introduced again.

---

## Current Behavior

`style.css` contains roughly 50 selectors inside the Order Helper section (section 6) that begin
with `.stwid--orderHelper` as a parent. For example:

```css
.stwid--orderHelper .stwid--bulkEditRow { … }
.stwid--orderHelper .stwid--RowTitle { … }
.stwid--orderHelper .stwid--orderTable .stwid--columnHeader { … }
```

Most of these class names are unique to the order helper, so the `.stwid--orderHelper` parent adds
no disambiguation — it only makes each selector longer and harder to read.

Two class names genuinely conflict with list panel class names and have *different* styles in each
context:

| Class | In list panel | In order helper |
|---|---|---|
| `.stwid--visibilityRow` | The row with Book Visibility button + chips + Order Helper toggle | The action bar at the top of the order helper table |
| `.stwid--filter` | The container wrapping the search bar and visibility row | The expandable script-filter panel with JS code input |

---

## Expected Behavior

After this refactoring:

1. The two conflicting classes are renamed in both CSS and JS:
   - `.stwid--visibilityRow` (order helper action bar) → **`.stwid--order-action-bar`**
   - `.stwid--filter` (order helper script-filter panel) → **`.stwid--script-filter`**

2. The `.stwid--orderHelper` parent prefix is removed from all other descendant selectors in
   section 6 of `style.css`.

3. The `.stwid--orderHelper` class itself is **kept** on:
   - The root element layout rules (shared with `.stwid--editor` in section 1.5)
   - All compound selectors (no space between classes, e.g. `.stwid--orderHelper.stwid--hideKeys`)

4. A new formal naming rule (NAME-06) is added to the `Rework_NewCSSskills.md` planning doc:
   *Give each class a name unique enough that no parent scope is needed to distinguish it.*

The extension will look and behave identically after this change. This is a pure code-quality
refactoring — no behavior changes.

---

## Agreed Scope

Files affected:
- **`style.css`** — CSS renames and prefix removal
- **`src/orderHelperRender.actionBar.js`** — creates the action bar element (owns `.stwid--visibilityRow` → `.stwid--order-action-bar`)
- **`src/orderHelperRender.filterPanel.js`** — creates the script filter element (owns `.stwid--filter` → `.stwid--script-filter`)
- **`src/orderHelperRender.js`** — may reference either class name; check and update
- **`src/orderHelper.js`** — may reference either class name; check and update
- **`tasks/Rework_NewCSSskills.md`** — add the new NAME-06 rule

---

## Out of Scope

- Removing the `body.stwid-- #WorldInfo` prefix (that is covered by `Refactoring_stylecss.md`)
- Any other Google CSS Style Guide rule violations
- Changes to any other CSS class names
- Any behavior or visual changes

---

## Implementation Plan

### Step 1 — Rename conflicting classes in `style.css`

- [x] In `style.css`, replace every occurrence of `.stwid--orderHelper .stwid--visibilityRow`
  with `.stwid--order-action-bar`. This covers the selector root AND all descendant selectors
  (e.g. `.stwid--orderHelper .stwid--visibilityRow .stwid--inputWrap` →
  `.stwid--order-action-bar .stwid--inputWrap`).
- [x] In `style.css`, replace every occurrence of `.stwid--orderHelper .stwid--filter`
  with `.stwid--script-filter`. This covers the selector root AND all descendants
  (e.g. `.stwid--orderHelper .stwid--filter .stwid--main` → `.stwid--script-filter .stwid--main`).
- [x] Verify that the list panel's `.stwid--list .stwid--filter` (lines ~279–284) and the
  standalone `.stwid--visibilityRow` rules (lines ~292–369) are **untouched**.

### Step 2 — Remove `.stwid--orderHelper` parent prefix from all other section-6 descendant rules

- [x] For every remaining selector in section 6 that begins with `.stwid--orderHelper ` (with a
  space — meaning it is scoping a child element), remove the `.stwid--orderHelper ` prefix,
  leaving only the child selector. Example: `.stwid--orderHelper .stwid--bulkEditRow` →
  `.stwid--bulkEditRow`.
- [x] **Do NOT** remove `.stwid--orderHelper` from compound selectors (no space between classes).
  These selectors target the root element itself:
  - `.stwid--orderHelper.stwid--hideKeys .stwid--key`
  - `.stwid--orderHelper.stwid--hide-col-strategy [data-col='strategy']`
  - (and all other `.stwid--orderHelper.stwid--hide-col-*` rules)
- [x] **Do NOT** remove `.stwid--orderHelper` from the root-element layout rules in section 1.5:
  ```css
  body.stwid-- #WorldInfo .stwid--editor,
  .stwid--orderHelper { … }
  ```
  and the shared `stwid--orderTableWrap` rule:
  ```css
  body.stwid-- #WorldInfo .stwid--list .stwid--books,
  .stwid--orderTableWrap { … }
  ```

### Step 3 — Rename conflicting classes in JS source files

- [x] In `src/orderHelperRender.actionBar.js`: find every place the class `stwid--visibilityRow`
  is assigned to an element (look for `classList.add`, `className`, or HTML string containing
  `stwid--visibilityRow`). Rename each one to `stwid--order-action-bar`.
- [x] In `src/orderHelperRender.filterPanel.js`: find every place the class `stwid--filter`
  is assigned to an element. Rename each one to `stwid--script-filter`.
- [x] Grep `src/orderHelperRender.js` for `stwid--visibilityRow` and `stwid--filter`; rename
  any matches found in the order helper context.
- [x] Grep `src/orderHelper.js` for `stwid--visibilityRow` and `stwid--filter`; rename any
  matches found in the order helper context.
- [x] Grep the full `src/` directory for `stwid--visibilityRow` and `stwid--filter` to catch
  any remaining references in other order helper files (e.g. `orderHelperRender.tableBody.js`,
  `orderHelperState.js`). Rename any order-helper-context matches found.

### Step 4 — Verify no unintended changes

- [x] Grep `style.css` for `.stwid--orderHelper ` (with trailing space). Confirm zero results
  remain — all remaining `.stwid--orderHelper` occurrences should be either compound selectors
  or root-element rules.
- [x] Grep `style.css` for `.stwid--visibilityRow`. Confirm only list panel rules remain
  (section 2, lines ~292–369). No order helper usage should remain.
- [x] Grep `style.css` for `.stwid--filter`. Confirm only list panel rules remain (section 2,
  lines ~279–289). No order helper usage should remain.

---

## After Implementation

*Implemented: February 23, 2026*

### What changed

- `style.css`
  - Renamed the Order Helper action bar selector from `.stwid--visibilityRow` to `.stwid--order-action-bar`.
  - Renamed the Order Helper script filter panel selector from `.stwid--filter` to `.stwid--script-filter`.
  - Removed redundant `.stwid--orderHelper ` parent prefixes from Order Helper descendant selectors while keeping root/compound selectors unchanged.
- `src/orderHelperRender.actionBar.js`
  - Updated the class assigned to the action bar container from `stwid--visibilityRow` to `stwid--order-action-bar`.
- `src/orderHelperRender.filterPanel.js`
  - Updated the class assigned to the script filter panel container from `stwid--filter` to `stwid--script-filter`.
- `tasks/main-tasks/documented-tasks/Refactoring_OrderHelperClassNames.md`
  - Marked all implementation checklist items complete.
  - Updated status and added this completion summary.

### Risks / What might break

- This touches Order Helper class names, so it might affect spacing or alignment in the top action bar if any selector was missed.
- This touches the script filter panel class, so it might affect showing/hiding that panel if a class reference was missed in UI logic.
- This touches many CSS selectors at once, so it might affect a few visual details (like chip styling or table spacing) in the Order Helper area.

### Manual checks

- Open Order Helper and confirm the top action bar is visible and laid out normally.
  Success: controls (select all, key toggle, column visibility, sort, filter button) appear in one row as before.
- Click the filter button in Order Helper to open and close the script filter panel.
  Success: panel opens and closes correctly, and the editor/preview areas render normally.
- Apply a few column filters and confirm active filter chips still render and can be cleared.
  Success: chips appear with the same style as before, and clearing a chip updates the table rows correctly.

---

## Post-Implementation Review
*Reviewed: February 23, 2026*

### Files Inspected
- `style.css`
- `src/orderHelperRender.actionBar.js`
- `src/orderHelperRender.filterPanel.js`
- `src/orderHelperRender.js`
- `src/orderHelper.js`
- `tasks/Rework_NewCSSskills.md`

### No Issues Found

The implementation correctly:

1. **Renamed `.stwid--visibilityRow` → `.stwid--order-action-bar`** in both CSS and JS:
   - `style.css`: All order helper action bar selectors now use `.stwid--order-action-bar`
   - `src/orderHelperRender.actionBar.js`: Line 43 uses `stwid--order-action-bar`
   - List panel's `.stwid--visibilityRow` rules (section 2, lines 283-369) remain untouched

2. **Renamed `.stwid--filter` → `.stwid--script-filter`** in both CSS and JS:
   - `style.css`: All order helper script filter selectors now use `.stwid--script-filter`
   - `src/orderHelperRender.filterPanel.js`: Line 36 uses `stwid--script-filter`
   - List panel's `.stwid--list .stwid--filter` rules (section 2, lines 279-289) remain untouched

3. **Removed redundant `.stwid--orderHelper ` parent prefixes**:
   - Only 1 occurrence remains: the root element rule `.stwid--orderHelper { ... }` (correct)
   - All 15 compound selectors preserved: `.stwid--orderHelper.stwid--hideKeys`, `.stwid--orderHelper.stwid--hide-col-*` (correct)

4. **Added NAME-06 rule** to `tasks/Rework_NewCSSskills.md`:
   - Rule text: "Give each class a name that is unique enough on its own that no parent scope is needed to distinguish it from similar classes elsewhere."

5. **JS best practices verified**:
   - `src/orderHelperRender.filterPanel.js`: Uses `DOMPurify.sanitize()` for user input (SEC-02 compliant)
   - Both files use `await new Promise(resolve => setTimeout(resolve, 0))` to yield during heavy loops (PERF-03 compliant)
   - `buildBulkEditRow` returns a `cleanup` function for event listener removal (PERF-02 compliant)
