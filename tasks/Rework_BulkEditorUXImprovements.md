# Bulk Editor UX Improvements: Order Layout, Dirty Indicator, Apply All Changes

## Summary

Three related UX improvements to the Bulk Editor row in the Order Helper:
1. Stack the "Spacing" field directly below "Start" in the Order container instead of placing them side-by-side.
2. Highlight each container's Apply button when a field in that container has been changed, so the user knows there are unapplied changes.
3. Add a new "Apply All Changes" container at the very end of the Bulk Editor that runs all dirty (changed) containers at once, then resets all dirty indicators.

---

## Feature 1: Order Container — Stack Spacing Under Start

### Current Behavior

Inside the Order container, the "Start" and "Spacing" input fields appear side-by-side on the same horizontal line (flex row), making them feel like unrelated controls at a glance.

### Expected Behavior

"Spacing" should appear directly below "Start" — stacked vertically — so they read as a clear top/bottom pair. Direction and the Apply button remain in their current positions after the pair.

### Agreed Scope

- File: `src/orderHelperRender.actionBar.js`
- Section: `buildBulkEditRow`, Order container block (lines ~1080–1165)
- This is a layout/CSS change. The inputs themselves do not change behavior.
- May require a small CSS addition in `style.css` to enable vertical stacking for just the Start+Spacing sub-group.

---

## Feature 2: Dirty Indicator on Apply Buttons

### Current Behavior

When the user changes a value in any container (e.g., picks a different option in the Strategy dropdown, or types a new Start value in the Order container), the container's Apply button (the checkmark icon) looks exactly the same as before — giving no hint that there are unapplied changes.

### Expected Behavior

- When any input in a container is changed, the Apply button in that container changes to a visually distinct "dirty" color (e.g., an orange or gold accent, using SillyTavern's existing warning palette if available, or a subtle warm highlight).
- When Apply is clicked and succeeds, the button returns to its normal appearance.
- The dirty state does not persist across page reloads (session-only; no localStorage).

### Containers that need dirty tracking

All containers with user-editable inputs and an Apply button:

| Container | Inputs to watch |
|---|---|
| State | Toggle button (fa-toggle-on / fa-toggle-off) |
| Strategy | `<select>` |
| Position | `<select>` |
| Depth | `<input type="number">` |
| Outlet | `<input type="text">` |
| Order | Start `<input>`, Spacing `<input>`, Direction radios |
| Recursion | Three checkboxes |
| Budget | One checkbox |
| Probability | `<input type="number">` |
| Sticky | `<input type="number">` |
| Cooldown | `<input type="number">` |
| Delay | `<input type="number">` |

The "Select" container has no input fields of its own (it just selects rows), so it does not need a dirty indicator.

### Implementation approach

Each container should expose a `markDirty()` and `markClean()` helper. Inputs wire a `change`/`input`/`click` listener that calls `markDirty()`. The Apply button's click handler calls `markClean()` after a successful apply. The "Apply All Changes" container (Feature 3) also calls `markClean()` on each container it applies.

Use a CSS class (e.g., `stwid--applyDirty`) on the Apply button to drive the color change via `style.css`. Choose the color during implementation to match the SillyTavern style guide (warm accent, not red/error).

### Agreed Scope

- File: `src/orderHelperRender.actionBar.js` — all Apply buttons in `buildBulkEditRow`
- File: `style.css` — one new CSS rule for the dirty state class on `.menu_button`

---

## Feature 3: "Apply All Changes" Container

### Current Behavior

There is no way to apply multiple containers at once. The user must click each Apply button individually, and if they forget which containers they changed, they may miss some.

### Expected Behavior

A new container is added at the very end of the Bulk Editor content — always the last container, always visible (not conditional on position or other state).

- Label: **"Apply All Changes"**
- Hint icon tooltip: "Applies all containers that have unsaved changes. Skips containers that have not been modified."
- One Apply button (same style as other Apply buttons) that:
  1. Checks which containers are currently dirty.
  2. Runs each dirty container's apply action in order (top to bottom).
  3. Awaits each operation before starting the next.
  4. Resets all dirty indicators (marks all containers clean) after all operations complete.
  5. If no containers are dirty, shows a `toastr.info` message: "No changes to apply."
- The "Apply All Changes" container does NOT have its own dirty indicator (it has no inputs).

### Agreed Scope

- File: `src/orderHelperRender.actionBar.js` — new block at the end of `buildBulkEditRow`, after the Delay container
- No new persisted state needed; dirty tracking is session-only.

---

## Open Questions / Assumptions

- The exact color for the dirty indicator should be chosen during implementation, guided by `STYLE_GUIDE.md` and SillyTavern's existing warning/accent palette. A warm non-error color (e.g., orange-ish) is preferred.
- The "Apply All Changes" button should use `withApplyButtonLock` (the existing busy-lock helper) around the full multi-container apply sequence to prevent double-clicks.
- Dirty tracking is session-only. If the user collapses and re-expands the Bulk Editor row, the dirty state should still be visible (it lives on the DOM node, which persists while the row exists).
- No behavior changes to any existing apply logic — dirty/clean tracking is purely additive.

## Out of Scope

- Persisting dirty state across page reloads.
- Adding dirty indicators to the Visibility row (Row 1) — only the Bulk Editor row is affected.
- Changing what any existing Apply button does — only the visual state and the "Apply All" orchestration are new.
