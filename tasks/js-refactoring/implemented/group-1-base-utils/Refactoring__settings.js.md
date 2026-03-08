# REFACTORING: settings.js
*Created: March 7, 2026*

**File:** `src/shared/settings.js`
**Findings:** 8 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 2 |
| Magic values | DRY-02 | 3 |
| Shape-based naming | NAME-01 | 2 |
| Large functions | SIZE-01 | 0 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **8** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The file repeats the same "validate a value is inside an enum, otherwise set a default" logic twice. This makes it easier for future edits to accidentally change one validation but not the other.

**Where:**
- `src/shared/settings.js`, lines 68-70 - validate `this.sortLogic` against `SORT`, fallback to `SORT.TITLE`
- `src/shared/settings.js`, lines 71-73 - validate `this.sortDirection` against `SORT_DIRECTION`, fallback to `SORT_DIRECTION.ASCENDING`

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `ensureEnumValue(value, enumObject, defaultValue)` near the top of the file.
- [x] Replace the first copy (lines 68-70) with a call to `ensureEnumValue(...)`.
- [x] Replace the second copy (lines 71-73) with a call to `ensureEnumValue(...)`.

---

### [2] DRY-01 - Duplicated code block

**What:** The file repeats the same "parse a boolean setting with a default" assignment three times. Keeping this as repeated lines makes it harder to add a new boolean setting without forgetting the same normalization step.

**Where:**
- `src/shared/settings.js`, line 78 - normalize `this.useBookSorts`
- `src/shared/settings.js`, line 79 - normalize `this.featureFolderGrouping`
- `src/shared/settings.js`, line 80 - normalize `this.featureAdditionalMatchingSources`

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `applyBooleanSettingDefaults()` near the top of the file.
- [x] Move the three normalization lines (78-80) into `applyBooleanSettingDefaults()`.
- [x] Replace lines 78-80 with a single call to `applyBooleanSettingDefaults()`.

---

### [3] DRY-02 - Magic value

**What:** The value `'worldInfoDrawer'` appears 2 times. It represents the extension settings storage key and should be a named constant.

**Where:**
- `src/shared/settings.js`, line 54
- `src/shared/settings.js`, line 66

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const WORLD_INFO_DRAWER_SETTINGS_KEY = 'worldInfoDrawer';`
- [x] Replace each occurrence of the raw literal with `WORLD_INFO_DRAWER_SETTINGS_KEY`.

---

### [4] DRY-02 - Magic value

**What:** The value `SORT.TITLE` appears 2 times. It represents the default sort choice and should be a named constant so there is one place to change it.

**Where:**
- `src/shared/settings.js`, line 40
- `src/shared/settings.js`, line 69

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const DEFAULT_SORT_LOGIC = SORT.TITLE;`
- [x] Replace each occurrence of `SORT.TITLE` with `DEFAULT_SORT_LOGIC`.

---

### [5] DRY-02 - Magic value

**What:** The value `SORT_DIRECTION.ASCENDING` appears 2 times. It represents the default sort direction and should be a named constant so there is one place to change it.

**Where:**
- `src/shared/settings.js`, line 42
- `src/shared/settings.js`, line 72

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const DEFAULT_SORT_DIRECTION = SORT_DIRECTION.ASCENDING;`
- [x] Replace each occurrence of `SORT_DIRECTION.ASCENDING` with `DEFAULT_SORT_DIRECTION`.

---

### [6] NAME-01 - Shape-based name

**What:** `saved` (line 54) describes that the value was saved, but not what it contains. A more specific name makes the code easier to read without having to inspect the value.

**Where:** `src/shared/settings.js`, line 54

**Steps to fix:**
- [x] Rename `saved` to `savedSettings` everywhere it appears in this file.

---

### [7] NAME-01 - Shape-based name

**What:** `key` (line 56) describes that the value is a key, but not what kind of key. A more specific name helps a reader understand what is being looped over.

**Where:** `src/shared/settings.js`, line 56

**Steps to fix:**
- [x] Rename `key` to `settingsKey` everywhere it appears in this file.

---

### [8] NEST-01 - Deep nesting

**What:** Inside `constructor`, the block starting at line 55 reaches 4 levels of indentation. The innermost logic is hard to follow because the reader must keep multiple "if/for" conditions in mind at the same time.

**Where:** `src/shared/settings.js`, lines 55-61 (deepest point: line 58)

**Steps to fix:**
- [x] Extract the inner block (lines 56-61) into a new function named `applySavedSettings(savedSettings)`. It should copy known keys from `savedSettings` onto `this`.
- [x] Replace the `for` loop body in `constructor` with a call to `applySavedSettings(savedSettings)`.
- [x] (Optional) Consider returning early if `savedSettings` is not an object, so the constructor has fewer nested blocks.

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`src/shared/settings.js`
- Added named constants for the settings storage key and the default sort values, so those values now live in one place.
- Extracted small helper functions for enum validation, copying saved settings, and normalizing boolean settings to remove repeated code.
- Simplified the constructor so it reads more directly and has less nesting.

### Risks / What might break

- The new helper functions use `.call(this)`, so future edits need to keep that binding pattern or convert them into class methods.
- Any future code that expects the old repeated constructor blocks to exist in place will need to follow the new helper-based structure instead.

### Manual checks

- Reload the browser tab and open the extension settings drawer. Success looks like the saved sorting and feature toggle values still loading correctly.
- Change the sort mode and sort direction, reload the tab, and confirm the same values are still selected after reload.
- Toggle the folder grouping and additional matching sources options, reload the tab, and confirm those toggles keep their saved on/off state.
