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
- [ ] Rename the `runFn` parameter in `createApplyButton(...)` (line 23) to `runApply`.
- [ ] Update references inside `createApplyButton(...)` to use `runApply` (lines 27 and 30).

---

### [2] NAME-01 - Shape-based name

**What:** `dom` (lines 69 and 159) is a very generic name that forces the reader to inspect the code to learn what it contains. In this file, it specifically holds Entry Manager DOM references (it is used as `dom.order?.tbody`).

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js`, line 69
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js`, line 159

**Steps to fix:**
- [ ] Rename the `dom` parameter in `getSafeTbodyRows(dom)` (line 69) to `entryManagerDom`, and update the reference on line 70 accordingly.
- [ ] In `runApplyNonNegativeIntegerField(...)` destructuring (lines 153-165), keep the external property name stable but rename the local variable by changing `dom,` (line 159) to `dom: entryManagerDom,`.
- [ ] Update the call `getSafeTbodyRows(dom)` (line 178) to `getSafeTbodyRows(entryManagerDom)`.

---

### [3] NAME-01 - Shape-based name

**What:** Inside `getBulkTargets(...)`, the names `tr` and `uid` (lines 82 and 86) are abbreviations that describe the data shape (table row / ID) instead of their role. This makes the loop harder to read because the meaning is not obvious without knowing HTML and the surrounding code.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js`, lines 82-96

**Steps to fix:**
- [ ] In `getBulkTargets(...)` (line 78), rename the loop variable `tr` (line 82) to `rowEl`.
- [ ] Rename `uid` (line 86) to `entryUid`, updating all uses in the function body (lines 86-91, and the `targets.push(...)` line).
- [ ] Keep the returned object shape stable for callers by building the target object with explicit keys: `targets.push({ tr: rowEl, bookName, uid: entryUid, entryData });` (line 96).