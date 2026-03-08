# REFACTORING: utils.js
*Created: July 3, 2026*

**File:** `src/shared/utils.js`
**Findings:** 4 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 0 |
| Magic values | DRY-02 | 0 |
| Shape-based naming | NAME-01 | 4 |
| Large functions | SIZE-01 | 0 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **4** |

---

## Findings

### [1] NAME-01 -- Shape-based name

**What:** `res` and `rej` (line 30) describe the *shape* of the values (generic callback functions) rather than their purpose. Someone reading the code has to already know how Promises work to understand what these callbacks do.

**Where:** `src/shared/utils.js`, line 30

**Steps to fix:**
- [x] Rename `res` to `resolvePromise` everywhere it appears in this file.
- [x] Rename `rej` to `rejectPromise` everywhere it appears in this file.

---

### [2] NAME-01 -- Shape-based name

**What:** `opt` (line 45) is short for "option", but it still does not say what the element is used for. Naming it after its role makes the loop easier to understand at a glance.

**Where:** `src/shared/utils.js`, line 45

**Steps to fix:**
- [x] Rename `opt` to `optionEl` everywhere it appears in this file.

---

### [3] NAME-01 -- Shape-based name

**What:** `s` and `d` (line 41) are single-letter names that describe neither purpose nor meaning. A reader has to inspect the destructuring expression to learn that they mean "sort" and "direction".

**Where:** `src/shared/utils.js`, line 41

**Steps to fix:**
- [x] Rename `s` to `optionSort` everywhere it appears in this file.
- [x] Rename `d` to `optionDirection` everywhere it appears in this file.

---

### [4] NAME-01 -- Shape-based name

**What:** `closure` (line 88) is a generic term that does not tell the reader what it represents in this feature. A name tied to its job (a parsed command that can be executed) makes the code easier to follow.

**Where:** `src/shared/utils.js`, line 88

**Steps to fix:**
- [x] Rename `closure` to `commandClosure` everywhere it appears in this file.
- [x] If `commandClosure` is ever passed across module boundaries in the future, search project-wide before renaming to avoid breaking other files.

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`src/shared/utils.js`
- Renamed the Promise callback parameters in `createDeferred` so their purpose is clear at a glance.
- Renamed the sort label destructuring variables and the generated `<option>` element variable to more descriptive names.
- Renamed the parsed slash-command result from `closure` to `commandClosure` before execution.

### Risks / What might break

- These are local-only renames, so break risk is low, but future edits could accidentally reintroduce vague short names.
- If someone later copies old snippets that still use the previous variable names, they may get confused while comparing code.

### Manual checks

- Reload the extension UI and open any sort dropdown. Success looks like the dropdown still shows all sort options and keeps the selected value.
- Trigger any feature that runs a slash command integration. Success looks like the command still executes and no new error appears in the browser console.
- Use any action that waits on World Info updates. Success looks like the UI still refreshes normally without hanging.
