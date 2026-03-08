# REFACTORING: constants.js
*Created: July 3, 2026*

**File:** `src/shared/constants.js`
**Findings:** 9 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 0 |
| Magic values | DRY-02 | 9 |
| Shape-based naming | NAME-01 | 0 |
| Large functions | SIZE-01 | 0 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **9** |

---

## Findings

### [1] DRY-02 - Magic value

**What:** The value `'position'` appears 2 times. Both uses mean "the entry field key named position". Keeping this as a raw string in multiple places makes it easy for the values to drift apart later (one gets changed but the other does not).

**Where:**
- `src/shared/constants.js`, line 7
- `src/shared/constants.js`, line 43

**Steps to fix:**
- [x] Near the top of the file (before the exports), introduce a shared source of truth for entry field keys, for example: `const ENTRY_FIELD_KEYS = { POSITION: 'position' };`
- [x] Replace the raw literal at line 7 with `ENTRY_FIELD_KEYS.POSITION` (so `SORT.POSITION` points to the shared key).
- [x] Replace the raw literal at line 43 with `ENTRY_FIELD_KEYS.POSITION` (so the table column key points to the same shared key).

---

### [2] DRY-02 - Magic value

**What:** The value `'depth'` appears 3 times. All 3 uses mean "the entry field key named depth". Keeping it as a repeated raw string makes it harder to keep the file consistent over time.

**Where:**
- `src/shared/constants.js`, line 9
- `src/shared/constants.js`, line 44
- `src/shared/constants.js`, line 69

**Steps to fix:**
- [x] Add `DEPTH: 'depth'` to the shared entry field key object (for example: `ENTRY_FIELD_KEYS.DEPTH`).
- [x] Replace the raw literal at line 9 with `ENTRY_FIELD_KEYS.DEPTH`.
- [x] Replace the raw literal at line 44 with `ENTRY_FIELD_KEYS.DEPTH`.
- [x] Replace the raw literal at line 69 with `ENTRY_FIELD_KEYS.DEPTH`.

---

### [3] DRY-02 - Magic value

**What:** The value `'order'` appears 3 times. All 3 uses mean "the entry field key named order". Duplicating this string increases the chance of accidental inconsistency.

**Where:**
- `src/shared/constants.js`, line 11
- `src/shared/constants.js`, line 47
- `src/shared/constants.js`, line 70

**Steps to fix:**
- [x] Add `ORDER: 'order'` to the shared entry field key object (for example: `ENTRY_FIELD_KEYS.ORDER`).
- [x] Replace the raw literal at line 11 with `ENTRY_FIELD_KEYS.ORDER`.
- [x] Replace the raw literal at line 47 with `ENTRY_FIELD_KEYS.ORDER`.
- [x] Replace the raw literal at line 70 with `ENTRY_FIELD_KEYS.ORDER`.

---

### [4] DRY-02 - Magic value

**What:** The value `'trigger'` appears 3 times. All 3 uses mean "the entry field key named trigger". Repeating it as a raw string makes future edits more error-prone.

**Where:**
- `src/shared/constants.js`, line 15
- `src/shared/constants.js`, line 52
- `src/shared/constants.js`, line 75

**Steps to fix:**
- [x] Add `TRIGGER: 'trigger'` to the shared entry field key object (for example: `ENTRY_FIELD_KEYS.TRIGGER`).
- [x] Replace the raw literal at line 15 with `ENTRY_FIELD_KEYS.TRIGGER`.
- [x] Replace the raw literal at line 52 with `ENTRY_FIELD_KEYS.TRIGGER`.
- [x] Replace the raw literal at line 75 with `ENTRY_FIELD_KEYS.TRIGGER`.

---

### [5] DRY-02 - Magic value

**What:** The value `'sticky'` appears 2 times. Both uses mean "the entry field key named sticky". Keeping it as a raw string in multiple places makes it easy to miss one occurrence during edits.

**Where:**
- `src/shared/constants.js`, line 48
- `src/shared/constants.js`, line 71

**Steps to fix:**
- [x] Add `STICKY: 'sticky'` to the shared entry field key object (for example: `ENTRY_FIELD_KEYS.STICKY`).
- [x] Replace the raw literal at line 48 with `ENTRY_FIELD_KEYS.STICKY`.
- [x] Replace the raw literal at line 71 with `ENTRY_FIELD_KEYS.STICKY`.

---

### [6] DRY-02 - Magic value

**What:** The value `'cooldown'` appears 2 times. Both uses mean "the entry field key named cooldown". Duplicating the raw string makes the file harder to maintain.

**Where:**
- `src/shared/constants.js`, line 49
- `src/shared/constants.js`, line 72

**Steps to fix:**
- [x] Add `COOLDOWN: 'cooldown'` to the shared entry field key object (for example: `ENTRY_FIELD_KEYS.COOLDOWN`).
- [x] Replace the raw literal at line 49 with `ENTRY_FIELD_KEYS.COOLDOWN`.
- [x] Replace the raw literal at line 72 with `ENTRY_FIELD_KEYS.COOLDOWN`.

---

### [7] DRY-02 - Magic value

**What:** The value `'delay'` appears 2 times. Both uses mean "the entry field key named delay". Repeating the raw string makes it easier to accidentally change only one place.

**Where:**
- `src/shared/constants.js`, line 50
- `src/shared/constants.js`, line 73

**Steps to fix:**
- [x] Add `DELAY: 'delay'` to the shared entry field key object (for example: `ENTRY_FIELD_KEYS.DELAY`).
- [x] Replace the raw literal at line 50 with `ENTRY_FIELD_KEYS.DELAY`.
- [x] Replace the raw literal at line 73 with `ENTRY_FIELD_KEYS.DELAY`.

---

### [8] DRY-02 - Magic value

**What:** The value `'automationId'` appears 2 times. Both uses mean "the entry field key named automationId". Keeping it as a repeated raw string makes it easy to miss one occurrence during updates.

**Where:**
- `src/shared/constants.js`, line 51
- `src/shared/constants.js`, line 74

**Steps to fix:**
- [x] Add `AUTOMATION_ID: 'automationId'` to the shared entry field key object (for example: `ENTRY_FIELD_KEYS.AUTOMATION_ID`).
- [x] Replace the raw literal at line 51 with `ENTRY_FIELD_KEYS.AUTOMATION_ID`.
- [x] Replace the raw literal at line 74 with `ENTRY_FIELD_KEYS.AUTOMATION_ID`.

---

### [9] DRY-02 - Magic value

**What:** The value `''` appears 3 times. It represents an intentionally blank label for non-text table columns (select/drag/enabled). Replacing this with a named constant makes the intent clearer.

**Where:**
- `src/shared/constants.js`, line 60
- `src/shared/constants.js`, line 61
- `src/shared/constants.js`, line 62

**Steps to fix:**
- [x] At the top of the file (before the exports), add: `const EMPTY_TABLE_HEADER_LABEL = '';`
- [x] Replace each occurrence of the raw literal `''` with `EMPTY_TABLE_HEADER_LABEL`.

---

## After Implementation
*Implemented: March 7, 2026*

### What changed

[`src/shared/constants.js`](C:\ST Test\SillyTavern\data\default-user\extensions\SillyTavern-WorldInfoDrawer\src\shared\constants.js)
- Added one frozen key map for repeated entry field names.
- Replaced repeated field-name strings in sorting, table columns, and numeric column keys with the shared constants.
- Added one named empty header label so blank table headers have an explicit meaning.

### Risks / What might break

- If a future edit adds a new field key but skips the shared key map, this file could drift back to mixed patterns.
- Any code outside this file that expects these constants to stay as direct string literals would be unusual, but could become harder to compare in debugger output.

### Manual checks

- Open the Entry Manager and confirm the same columns still appear, in the same order, with the same labels.
- Sort or filter using position, depth, order, sticky, cooldown, delay, automation ID, and trigger related controls; success means they behave exactly as before.
- Confirm the first three table headers are still intentionally blank; success means the select, drag, and enabled columns show no visible text label.
