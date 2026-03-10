# REFACTORING: table.filter-panel.js
*Created: July 3, 2026*

**File:** `src/entry-manager/table/table.filter-panel.js`
**Findings:** 10 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 4 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 3 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **10** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The same "find the row for an entry, skip if missing, then apply a row filter flag" logic is written twice. Keeping two copies makes it easier for them to drift apart later (one gets fixed, the other is forgotten).

**Where:**
- `src/entry-manager/table/table.filter-panel.js`, lines 115-118 - look up the entry row and set the initial "visible" state
- `src/entry-manager/table/table.filter-panel.js`, lines 130-132 - look up the entry row and set the final "filtered" state

**Steps to fix:**
- [x] Extract the shared pattern into a new helper function named `getEntryManagerRow(dom, entryRef)` near the top of the file. It should return the row element or `null`.
- [x] Replace the first copy (lines 115-118) with:
      - `const row = getEntryManagerRow(dom, e);`
      - `if (!row) continue;`
      - `setEntryManagerRowFilterState(row, ...)`
- [x] Replace the second copy (lines 130-132) with the same helper call.

---

### [2] DRY-02 - Magic value

**What:** The value `'stwidFilterScript'` appears 2 times. It represents the key name used to store the "filtered by script" flag on a row and should be a named constant.

**Where:**
- `src/entry-manager/table/table.filter-panel.js`, line 117
- `src/entry-manager/table/table.filter-panel.js`, line 132

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const ROW_FILTER_KEY_SCRIPT = 'stwidFilterScript';`
- [x] Replace each occurrence of the raw literal with `ROW_FILTER_KEY_SCRIPT`.

---

### [3] NAME-01 - Shape-based name

**What:** `inp` (line 53) is an abbreviation that describes the shape (some input) rather than the purpose. Reading the name alone does not tell you that this is the textarea that holds the filter script.

**Where:** `src/entry-manager/table/table.filter-panel.js`, line 53

**Steps to fix:**
- [x] Rename `inp` to `filterScriptTextarea` everywhere it appears in this file.
- [x] Verify the rename is complete (this variable is referenced across multiple nested functions like `updateList`, `saveFilterDebounced`, and `updateHighlight`).

---

### [4] NAME-01 - Shape-based name

**What:** `clone` (line 103) describes how the value was created (a copy) rather than what it represents. It is actually the current script text that will be compiled and executed.

**Where:** `src/entry-manager/table/table.filter-panel.js`, line 103

**Steps to fix:**
- [x] Rename `clone` to `filterScriptSource` everywhere it appears in this file.
- [x] If you later add more script source variants (for example, wrapping or instrumentation), keep names specific (example: `wrappedScriptSource`).

---

### [5] NAME-01 - Shape-based name

**What:** `e` (line 114) is a single-letter name that does not describe the purpose. It holds one "entry reference" (book + entry data) being processed by the filter.

**Where:** `src/entry-manager/table/table.filter-panel.js`, line 114

**Steps to fix:**
- [x] Rename `e` to `entryRef` in both loops (lines 114-133).
- [x] Rename any related variables to match (for example, if you extract helpers, prefer `entryRef.book` / `entryRef.data.uid` over `e.book` / `e.data.uid`).

---

### [6] NAME-01 - Shape-based name

**What:** `script` is used for two different meanings: a DOM element (line 43) and a script source string (line 104). Even though JavaScript allows this kind of shadowing, it makes the code harder to read because the same word refers to different things depending on where you are.

**Where:**
- `src/entry-manager/table/table.filter-panel.js`, line 43
- `src/entry-manager/table/table.filter-panel.js`, line 104

**Steps to fix:**
- [x] Rename the DOM element variable `script` (line 43) to `scriptPanel` (or `scriptPanelEl`).
- [x] Rename the inner string variable `script` (line 104) to `compiledScriptSource` (or `filterScriptWrapperSource`).
- [x] After renaming, quickly rescan the file to ensure no remaining `script` references are ambiguous.

---

### [7] SIZE-01 - Large function

**What:** `buildFilterPanel` is 173 lines long (lines 2-174). It is doing too much: building DOM nodes and also wiring event listeners and also managing localStorage persistence and also compiling/executing the filter script and also applying filter results to the entries list.

**Where:** `src/entry-manager/table/table.filter-panel.js`, lines 2-174

**Steps to fix:**
- [x] Extract the "hint + error element" DOM creation (lines 18-41) into a new function named `buildFilterPanelHintAndError({ entryManagerState })`. It should return `{ hintEl, errorEl }`.
- [x] Extract the script editor UI creation (lines 43-163) into a new function named `buildFilterScriptEditor({ dom, entryManagerState, getEntryManagerEntries, setEntryManagerRowFilterState, SlashCommandParser, debounce, hljs, isTrueBoolean })`. It should return the script editor element (and any needed handles).
- [x] Inside the extracted script editor function, extract the "textarea handlers + debounced functions" setup into `attachFilterScriptHandlers(...)` so the DOM creation part stays short.
- [x] Extract the preview DOM creation (lines 167-171) into a new function named `buildFilterPreview({ dom })`.
- [x] Replace the extracted blocks in `buildFilterPanel` with calls to the new functions.

---

### [8] NEST-01 - Deep nesting

**What:** Inside `buildFilterPanel`, the DOM building blocks reach 4+ levels of indentation (nested element blocks inside nested element blocks). This makes the structure harder to scan because you have to keep track of multiple open blocks at the same time.

**Where:** `src/entry-manager/table/table.filter-panel.js`, lines 16-165 (deepest point: lines 53-161)

**Steps to fix:**
- [x] Extract the nested "script editor element" block (lines 43-163) into a function named `buildFilterScriptEditor(...)`.
- [x] Extract the nested "hint element" block (lines 18-33) into a function named `buildFilterPanelHint(...)`.
- [x] Replace the nested blocks with top-level calls that return elements, then append them in a simple sequence.

---

### [9] NEST-01 - Deep nesting

**What:** Inside `updateList`, the code reaches 4+ levels of indentation due to `try` + `for` loops + inner `if` blocks. This makes it harder to follow what the code is trying to do (reset all rows, then apply the script, then update each row).

**Where:** `src/entry-manager/table/table.filter-panel.js`, lines 106-133 (deepest point: lines 115-118)

**Steps to fix:**
- [x] Extract the "set every row to visible before filtering" loop (lines 114-118) into a new function named `setAllRowsVisible(entries)`. One sentence: it clears the script filter for every row that exists.
- [x] Extract the "execute script for one entry and apply row state" core logic into a new function named `applyScriptResultToRow({ closure, entryRef })`. One sentence: it executes the compiled script and sets the row filter flag.
- [x] Replace the nested logic in `updateList` with a short list of high-level steps: compile, reset rows, apply script to each entry, show or hide error.

---

### [10] NEST-01 - Deep nesting

**What:** Inside `updateList`, there is also a nested "race guard" check inside the second loop (`if (filterStack.at(-1) !== closure) return;`). Mixing this check into the middle of the loop adds another nested decision point and makes the loop harder to read.

**Where:** `src/entry-manager/table/table.filter-panel.js`, lines 120-128 (deepest point: line 126)

**Steps to fix:**
- [x] Extract the race guard into a helper named `isLatestFilterRun(filterStack, closure)` that returns a boolean.
- [x] Replace lines 126-128 with a single, readable check like:
      - `if (!isLatestFilterRun(filterStack, closure)) return;`
- [x] Keep the loop focused on the main job (apply the filter to each entry) and keep concurrency checks in small, named helpers.

---

## After Implementation
*Implemented: March 10, 2026*

### What changed

[`src/entry-manager/table/table.filter-panel.js`](C:\ST Test\SillyTavern\data\default-user\extensions\SillyTavern-WorldInfoDrawer\src\entry-manager\table\table.filter-panel.js)
- Split the large filter-panel builder into smaller helpers for the hint, error area, script editor, handlers, preview, and row lookups.
- Replaced unclear variable names with purpose-based names like `filterScriptTextarea`, `filterScriptSource`, `compiledScriptSource`, `entryRef`, and `scriptPanel`.
- Replaced the repeated row lookup logic and repeated filter-key string with named helpers/constants to make future changes safer.

### Risks / What might break

- The filter box still depends on the same local browser storage key, so any future rename of that key would reset saved scripts unless handled deliberately.
- The new helper split keeps behavior the same, but any outside code that relied on this file’s internal variable names would no longer match.
- The filter execution order still depends on the `filterStack` race guard, so issues in that guard would affect which run wins during fast typing.

### Manual checks

- Open Entry Manager, switch to the script filter, and confirm the saved script text still appears after reloading the browser tab.
- Type a filter script and confirm the syntax-highlighted layer continues to track the textarea content and scroll position.
- Use a script that returns `true` for some entries and `false` for others, and confirm only the expected rows remain visible.
- Enter an invalid script and confirm the error message appears in the filter panel instead of silently failing.
