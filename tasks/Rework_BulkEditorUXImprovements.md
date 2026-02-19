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

---

## Implementation Plan

### Open Question Resolutions

- **Dirty indicator color**: `var(--warning-color, #e8a97f)` — this is SillyTavern's warm amber used in `.info-block.warning`, matching the "warm non-error" spec requirement.
- **`withApplyButtonLock` usage**: Only containers that already use it keep it. `applyPosition`, `applyDepth`, `applyOutlet`, `applyRecursion`, `applyBudget`, `applyProbability`, `applySticky`, `applyCooldown`, `applyBulkDelay` do not currently use it — no lock added (out of scope).
- **Apply All busy lock**: The "Apply All Changes" button uses `withApplyButtonLock` on its own button to prevent double-clicks.
- **Dirty state on validation failure**: Early `return;` before `saveUpdatedBooks` means `classList.remove('stwid--applyDirty')` is NOT called — dirty indicator correctly persists on validation failure.

### CSS changes — `style.css`

- [x] After `.stwid--orderHelper .stwid--bulkEditContainer[data-field="outlet"] .stwid--input` (line ~1191): add `.stwid--orderStartSpacingPair` rule (`display: flex; flex-direction: column; gap: 0.25em`) for Feature 1.
- [x] After that: add `.stwid--orderHelper .stwid--bulkEditContainer .stwid--applyDirty` rule (`color: var(--warning-color, #e8a97f)`) for Feature 2.

### JS changes — `src/orderHelperRender.actionBar.js`

- [x] After `withApplyButtonLock` definition (~line 630): add `const applyRegistry = [];` to hold `{ isDirty, runApply }` entries for "Apply All Changes".

**Feature 1 — Order container layout:**
- [x] Wrap `startLbl` and `stepLbl` in a new `div.stwid--orderStartSpacingPair` before appending to `orderContainer`, replacing the two direct `orderContainer.append(startLbl)` / `orderContainer.append(stepLbl)` calls.

**Feature 2 — Dirty tracking (12 containers):**

For each container: extract the anonymous click handler to a named `runApplyXxx` async function, add `applyXxx.classList.remove('stwid--applyDirty')` at the end of the success path (last line before the closing `}` of the save block), push `{ isDirty: () => applyXxx.classList.contains('stwid--applyDirty'), runApply: runApplyXxx }` to `applyRegistry`, and add input dirty-wiring listeners as noted.

- [x] **State** (`applyActiveState`): extract `runApplyActiveState`, add `classList.remove` after `saveUpdatedBooks`, push registry. After block: add `activeToggle.addEventListener('click', () => applyActiveState.classList.add('stwid--applyDirty'))`.
- [x] **Strategy** (`applyStrategy`): extract `runApplyStrategy`, add `classList.remove` after `saveUpdatedBooks`, push registry. After block: add `strategySelect.addEventListener('change', () => applyStrategy.classList.add('stwid--applyDirty'))`.
- [x] **Position** (`applyPosition`): extract `runApplyPosition` (no `withApplyButtonLock`), add `classList.remove` after `saveUpdatedBooks`, push registry. After block: add `positionSelect.addEventListener('change', () => applyPosition.classList.add('stwid--applyDirty'))`.
- [x] **Depth** (`applyDepth`): extract `runApplyDepth` (no lock), add `classList.remove` after `saveUpdatedBooks`, push registry. After block: add `depthInput.addEventListener('change', () => applyDepth.classList.add('stwid--applyDirty'))`.
- [x] **Outlet** (`applyOutlet`): extract `runApplyOutlet` (no lock), add `classList.remove` after `filterIndicatorRefs.outlet?.()`, push registry. After block: add `outletInput.addEventListener('input', () => applyOutlet.classList.add('stwid--applyDirty'))`.
- [x] **Order** (`apply`): extract `runApplyOrder`, add `classList.remove` after `saveUpdatedBooks`, push registry. After `apply` block: add dirty listeners for `dom.order.start` change, `dom.order.step` change, and both direction radio `change` events (inside their respective blocks, referencing `apply`).
- [x] **Recursion** (`applyRecursion`): extract `runApplyRecursion`, add `classList.remove` after `saveUpdatedBooks`, push registry. After block: iterate `recursionCheckboxes.values()` and add `change` dirty listener on each.
- [x] **Budget** (`applyBudget`): extract `runApplyBudget`, add `classList.remove` after `saveUpdatedBooks`, push registry. After block: add `budgetIgnoreCheckbox.addEventListener('change', () => applyBudget.classList.add('stwid--applyDirty'))`.
- [x] **Probability** (`applyProbability`): extract `runApplyProbability` (no lock), add `classList.remove` after `saveUpdatedBooks`, push registry. After block: add `probabilityInput.addEventListener('change', () => applyProbability.classList.add('stwid--applyDirty'))`.
- [x] **Sticky** (`applySticky`): extract `runApplySticky` (no lock), add `classList.remove` after `saveUpdatedBooks`, push registry. After block: add `stickyInput.addEventListener('change', () => applySticky.classList.add('stwid--applyDirty'))`.
- [x] **Cooldown** (`applyCooldown`): extract `runApplyCooldown` (no lock), add `classList.remove` after `saveUpdatedBooks`, push registry. After block: add `cooldownInput.addEventListener('change', () => applyCooldown.classList.add('stwid--applyDirty'))`.
- [x] **Delay** (`applyBulkDelay`): extract `runApplyBulkDelay` (no lock), add `classList.remove` after `saveUpdatedBooks`, push registry. After block: add `bulkDelayInput.addEventListener('change', () => applyBulkDelay.classList.add('stwid--applyDirty'))`.

**Feature 3 — Apply All Changes container:**
- [x] After `row.append(bulkDelayContainer)` and before the collapsible-wrapper code: add a new `applyAllContainer` (`data-field="applyAll"`) with label "Apply All Changes", hint tooltip, and one Apply button. Button click uses `withApplyButtonLock`; iterates `applyRegistry`, collects dirty entries, runs each `runApply` in sequence with `await`, shows `toastr.info` if none dirty.

---

## After Implementation

### What changed

- Files changed: `src/orderHelperRender.actionBar.js`, `style.css`, `FEATURE_MAP.md`
  - `buildBulkEditRow()` (actionBar.js) — three sets of changes:
    - **Feature 1**: `startLbl` and `stepLbl` are now wrapped in a `div.stwid--orderStartSpacingPair` that stacks them vertically, instead of both sitting in the outer flex row.
    - **Feature 2**: All 12 Apply buttons (State, Strategy, Position, Depth, Outlet, Order, Recursion, Budget, Probability, Sticky, Cooldown, Delay) now turn amber when their inputs are changed and return to normal after a successful apply. Each click handler was extracted into a named `runApplyXxx` async function and registered in a new `applyRegistry` array.
    - **Feature 3**: A new "Apply All Changes" container was added at the end of the Bulk Editor. Its single Apply button runs every dirty container's apply action in order, then shows a `toastr.info` if nothing was dirty.
  - `style.css` — two new rules: `.stwid--orderStartSpacingPair` (flex column layout) and `.stwid--applyDirty` (warm amber color via `var(--warning-color, #e8a97f)`).
  - `FEATURE_MAP.md` — updated bulk edit row entry to list all containers and the two new features.

### Risks / What might break

- The dirty indicator relies on `classList.remove('stwid--applyDirty')` being called at the end of each success path. If a container's apply logic has multiple exit points (early `return` before save), the dirty state correctly persists — but if a new exit path is added in the future after the save, it might accidentally skip the `remove` call.
- "Apply All Changes" calls each `runApply` in sequence using `await`. Containers without `withApplyButtonLock` (Position, Depth, Outlet, Recursion, Budget, Probability, Sticky, Cooldown, Delay) don't guard against concurrent calls, but since "Apply All" is serial and its own button has `withApplyButtonLock`, double-triggering should not occur in practice.
- The `stwid--orderStartSpacingPair` wrapper changes the flex layout of the Order container. If any CSS rule previously targeted `startLbl` or `stepLbl` as direct children of `orderContainer`, it may need updating — but no such rule exists currently.

### Manual checks

- [ ] Open the Order Helper Bulk Editor. Inside the Order container, confirm "Start" and "Spacing" labels appear stacked top/bottom (not side by side). (Success: vertical pair.)
- [ ] Change the value in the Strategy dropdown. Confirm the Strategy Apply button turns amber. Click Apply. Confirm the button returns to its normal color. (Success: dirty indicator lights and clears correctly.)
- [ ] Change values in two different containers (e.g., Strategy and Depth). Click "Apply All Changes". Confirm both changes are applied to selected entries and both Apply buttons return to normal. (Success: Apply All runs both in sequence.)
- [ ] Click "Apply All Changes" without changing anything. Confirm a `toastr.info` toast says "No changes to apply." (Success: nothing fires when nothing is dirty.)
- [ ] Change Strategy dropdown, then click the Strategy Apply button directly. Confirm only that container's dirty state clears; other containers are unaffected. (Success: per-container dirty tracking is isolated.)
