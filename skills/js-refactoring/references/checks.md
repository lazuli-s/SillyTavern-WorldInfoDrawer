# JS Refactor — Checks Reference

Six check families. Apply every check to the full file. Record all violations found, not just the first.

---

## DRY-01 — Duplicated code blocks

**What to flag:** The same logic (same steps in the same order) written out in full two or more times. Inline variations of the same pattern count — the shapes do not have to be byte-for-byte identical.

**Red flag:** Two or more code blocks that could be replaced by one shared function plus different arguments.

**Threshold:** 2+ occurrences of the same pattern.

**Finding should include:**
- How many copies exist and where each one starts (file + line number)
- What the shared pattern is (describe in one sentence)
- A suggested name for the extracted function

---

## DRY-02 — Magic values (unnamed constants)

**What to flag:** A raw literal value — a number, string, or boolean — that appears two or more times and clearly represents a named concept (a threshold, a timeout, a key name, a pixel size, etc.).

**Red flag:** The same value appears twice and you can give it a meaningful name without hesitation (e.g. `50` → `MAX_FUNCTION_LINES`, `'apply-button'` → `APPLY_BUTTON_CLASS`).

**Threshold:** 2+ occurrences of the same literal that has an obvious name.

**Do not flag:** Values that are genuinely arbitrary (e.g. `0`, `1`, `true`, `false` used in obvious boolean contexts), or values that appear twice purely by coincidence with no shared semantic meaning.

**Finding should include:**
- The value, how many times it appears, and the line numbers
- A suggested constant name

---

## NAME-01 — Shape-based naming

**What to flag:** Variable or function names that describe their data type or shape instead of their purpose or role.

**Common offenders:**

| Bad (shape) | Good (purpose) | Why |
|---|---|---|
| `el`, `elem`, `node` | `applyButton`, `entryRow` | What is this element *for*? |
| `val`, `v`, `value` | `selectedCount`, `depthValue` | What value does this hold? |
| `cb`, `fn`, `func` | `onApplySuccess`, `onClose` | What does this callback do? |
| `tmp`, `temp`, `res` | `booksToSave`, `filteredEntries` | What is this temporarily holding? |
| `data`, `obj`, `item` | `worldEntry`, `bookConfig` | What kind of data? |
| `str`, `arr`, `num` | `entryKey`, `visibleRows` | What string/array/number? |
| `wrap`, `container` | `bulkFieldGroup`, `editorPane` | What does this wrap? |
| `handleX`, `doX` | Describe what X actually is | "handle" and "do" say nothing |

**Threshold:** Flag any name that requires reading the function body to understand what the variable actually holds or does.

**Finding should include:**
- The name, its location (line number), and why it's shape-based
- A suggested replacement name

---

## SIZE-01 — Large functions

**What to flag:** Any function whose body exceeds 50 lines.

**Threshold:** > 50 lines (count from the opening `{` to the closing `}`).

**One-sentence test:** Apply this to every large function — "If you had to explain what this function does, could you do it in one sentence?" If the answer requires "and also" or "and then", the function is doing too much.

**Finding should include:**
- Function name, start line, end line, and total line count
- The one-sentence test result: what is this function doing that could be split?
- Suggested sub-functions to extract (name each one and describe its job in one sentence)

---

## NEST-01 — Deep nesting

**What to flag:** Code with more than 3 levels of indentation inside a single function. Count from the function body, not the file root. A 4th level of indentation (e.g. `if` inside `for` inside `if` inside the function) is the trigger.

**What deep nesting looks like:**
```js
function buildRow() {
    // level 1
    if (condition) {
        // level 2
        for (const item of items) {
            // level 3
            if (item.active) {
                // level 4 — FLAG THIS
            }
        }
    }
}
```

**Threshold:** 4+ levels of indentation within a single function.

**Finding should include:**
- Function name and the line range where deep nesting occurs
- Which nested block is the deepest
- A suggestion for which inner block to extract into its own named function

---

## DEAD-01 — Dead code

**What to flag:** Code that is defined but never used anywhere in the file:
- Variables declared but never read
- Functions defined but never called (within this file or as exports used elsewhere)
- Imports that are never referenced

**Be careful:** Before flagging a function as dead, search for its name across the whole file. A function called from an event listener or as a callback may look unused at first glance. Only flag it if it genuinely has zero call sites.

**Threshold:** Zero references to the declared name anywhere in the file.

**Finding should include:**
- The name, what it is (variable / function / import), and the line where it is declared
- Confirmation that no reference to this name exists in the file (note any search you did)
- Whether it is safe to delete (caution if it might be called dynamically from a string)
