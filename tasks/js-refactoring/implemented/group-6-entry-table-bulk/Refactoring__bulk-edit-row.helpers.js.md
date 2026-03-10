# REFACTORING: bulk-edit-row.helpers.js
*Created: March 7, 2026*

**File:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js`
**Findings:** 3 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 0 |
| Magic values | DRY-02 | 0 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 0 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **3** |

---

## Findings

### [1] NAME-01 - Shape-based name

**What:** `runFn` (line 23) describes its shape (it is "a function") rather than its purpose. From the name alone, it is not clear what the function does when the user clicks Apply.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js`, line 23

**Steps to fix:**
- [x] Rename the `runFn` parameter in `createApplyButton(...)` (line 23) to `runApply`.
- [x] Update references inside `createApplyButton(...)` to use `runApply` (lines 27 and 30).

---

### [2] NAME-01 - Shape-based name

**What:** `dom` (lines 69 and 159) is a very generic name that forces the reader to inspect the code to learn what it contains. In this file, it specifically holds Entry Manager DOM references (it is used as `dom.order?.tbody`).

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js`, line 69
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js`, line 159

**Steps to fix:**
- [x] Rename the `dom` parameter in `getSafeTbodyRows(dom)` (line 69) to `entryManagerDom`, and update the reference on line 70 accordingly.
- [x] In `runApplyNonNegativeIntegerField(...)` destructuring (lines 153-165), keep the external property name stable but rename the local variable by changing `dom,` (line 159) to `dom: entryManagerDom,`.
- [x] Update the call `getSafeTbodyRows(dom)` (line 178) to `getSafeTbodyRows(entryManagerDom)`.

---

### [3] NAME-01 - Shape-based name

**What:** Inside `getBulkTargets(...)`, the names `tr` and `uid` (lines 82 and 86) are abbreviations that describe the data shape (table row / ID) instead of their role. This makes the loop harder to read because the meaning is not obvious without knowing HTML and the surrounding code.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js`, lines 82-96

**Steps to fix:**
- [x] In `getBulkTargets(...)` (line 78), rename the loop variable `tr` (line 82) to `rowEl`.
- [x] Rename `uid` (line 86) to `entryUid`, updating all uses in the function body (lines 86-91, and the `targets.push(...)` line).
- [x] Keep the returned object shape stable for callers by building the target object with explicit keys: `targets.push({ tr: rowEl, bookName, uid: entryUid, entryData });` (line 96).

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js`
- Renamed vague helper parameters so their purpose is clearer when reading the bulk-edit code.
- Renamed abbreviated loop variables inside bulk target collection, while keeping the returned object shape unchanged for existing callers.
- Kept the public behavior the same and limited the change to local readability improvements.

### Risks / What might break

- If any future edit inside this file accidentally uses the old local names, it will fail until renamed to the new ones.
- The returned target object still uses `tr` and `uid` for compatibility, so a future cleanup could be confusing if someone assumes those keys were renamed too.

### Manual checks

- Open Entry Manager and use a bulk-edit number field. Success looks like the Apply button still updates selected rows and saves changes.
- Use a bulk action that depends on selected table rows. Success looks like only selected, visible rows are changed.
- Reload the page and repeat one bulk number edit. Success looks like there are no console errors from the renamed helpers.
