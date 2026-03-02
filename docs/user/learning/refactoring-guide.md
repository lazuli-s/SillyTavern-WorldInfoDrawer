# Refactoring Guide

*Personal learning notes — written for me, using real examples from this project.*

Refactoring means **reorganizing code without changing what it does**. The feature still works
exactly the same for the user. The goal is to make the code easier to understand, easier to
change, and easier to find things in.

---

## The one test that holds everything together

> If you had to explain what this function/file/class does, could you do it in **one sentence**?

- Yes, one sentence → it's probably well-scoped. Leave it alone.
- "Well, it does X, and also Y, and then it handles Z" → it's doing too much. It's a candidate for splitting.

---

## 1. Remove Redundancy (DRY)

**"DRY" = Don't Repeat Yourself.**

If the same thing is written in more than one place, it should be written in *one* place and
referenced from everywhere else. That way, if you need to change it, you change it once — not
ten times.

### Why it matters

When something is copy-pasted, the copies drift apart over time. Someone fixes a bug in one
copy but forgets the others. Now you have ten slightly-different versions and can't tell which
one is correct.

### Real example — JS: the 12 bulk-edit fields in `actionBar.js`

Every single bulk-edit field in `buildBulkEditRow` (State, Strategy, Position, Depth, etc.)
follows the exact same 5-step pattern:

```
1. Create a labeled container
2. Create an input (toggle, dropdown, or number)
3. Restore the last-used value from localStorage
4. Write a "runApply" function
5. Create an Apply button, wire up the "dirty" amber highlight
```

This pattern is written out in full **12 separate times** — once per field — across ~915 lines.
If the pattern ever needs to change (e.g. how the dirty button works), you have to find and fix
all 12 copies.

The fix: extract the pattern into a shared function that all 12 fields call with their own
specific details. Each field would shrink from ~80 lines to ~10 lines.

### Real example — CSS: `opacity: 0.5` in `style.css`

The value `0.5` appears 5 times in the stylesheet as a raw number:

```css
opacity: 0.5;  /* line 528 */
opacity: 0.5;  /* line 685 */
opacity: 0.5;  /* line 1377 */
/* ...and more */
```

A CSS variable for this already exists at the top of the file:

```css
--stwid-state-disabled-opacity: 0.5;
```

But it isn't used. If you ever want to change that value, you'd have to find every instance
by searching — instead of changing it in one place and having it update everywhere.

---

## 2. Better Naming

**Names should explain *purpose*, not just describe shape.**

A name that tells you *what something is for* is worth far more than a name that tells you
*what it is made of*. You read code much more often than you write it.

### Bad names vs. good names

| Bad | Good | Why |
|-----|------|-----|
| `el` | `applyButton` | What is this element *for*? |
| `val` | `selectedEntryCount` | What value does this hold? |
| `cb` | `onApplySuccess` | What does this callback do? |
| `tmp` | `booksToSave` | What is this temporary thing? |

### This project does naming well

`buildBulkEditRow`, `refreshSelectionCount`, `getSafeTbodyRows`, `withApplyButtonLock` — these
all tell you exactly what they do. You can read a list of function names and understand the
whole flow without reading the function bodies.

### Where naming breaks down in CSS

A CSS class called `.stwid--thinContainer` describes its *shape* (thin). But `.stwid--bulkFieldGroup`
would tell you *where it lives and what it's for*. Shape-based names become confusing when the
same shape is used in multiple places for different purposes.

---

## 3. Break Up Large Files and Functions

**One file should have one job. One function should have one job.**

If a file does 10 things, it should be 10 files that each do 1 thing. If a function does 5 steps,
those steps should each be their own smaller named function.

### Why it matters for learning

When a function is 20 lines, you can read the whole thing in 30 seconds and understand it
completely. When it's 300 lines, your brain has to hold too much at once — you lose the thread.

Smaller files also make it easier to find things. If you know "this is about the Depth bulk-edit
field", you want to open one file called `depth.js` and read 50 lines — not scroll through 900
lines hunting for the Depth block.

### Real example

`orderHelperRender.actionBar.js` is 1,442 lines. The single function `buildBulkEditRow` is
**915 lines** — almost all of it is 12 field blocks, back-to-back, with no way to jump directly
to the one you need.

A well-split version would be:

```
src/
  orderHelperRender.actionBar.js          (~120 lines — just assembles the pieces)
  orderHelperRender.actionBar.bulk.js     (~870 lines — the bulk edit row logic)
  orderHelperRender.actionBar.bulkHelpers.js  (~80 lines — shared helpers)
```

Each file has one job. Each one is findable by name.

---

## 4. Separate Concerns

**"Concerns" = different types of jobs.** The classic three in UI code are:

| Concern | What it means | Where it belongs |
|---------|--------------|-----------------|
| **Structure** | What exists on the page | HTML / JS that builds elements |
| **Appearance** | What it looks like | CSS file |
| **Behavior** | What happens on interaction | JS event handlers and logic |

### Why it matters

When concerns are mixed, a change in one area breaks something in another. If your apply logic
is tangled with your visual layout code, fixing a bug in the visual layout can accidentally
break the apply logic — even though they're unrelated.

### Real example

`buildBulkEditRow` mixes all three concerns inside one giant function:

- It **builds HTML** (creates divs, inputs, buttons)
- It **applies CSS classes** (dirty state, disabled state, tooltips)
- It contains the full **apply logic** for all 12 fields (what happens when you click Apply)

Separating these would mean: the JS that builds the HTML lives in one place, the apply logic
lives in another, the CSS stays in the stylesheet.

---

## 5. Flatten Nested Code

**The further right code goes on screen, the harder it is to follow.**

When you have code inside code inside code inside code, you lose track of where you are. Each
level of indentation is a new context your brain has to remember.

### What deep nesting looks like

```js
function buildRow() {
    const row = ...; {
        const wrap = ...; {
            const menu = ...; {
                const input = ...; {
                    input.addEventListener('change', () => {
                        if (something) {
                            for (const item of items) {
                                // by here you've forgotten what "row" is
                            }
                        }
                    });
                }
            }
        }
    }
}
```

### What flat code looks like

```js
function buildMenu(items) { ... }        // 10 lines
function buildInput(onChange) { ... }    // 10 lines
function buildWrap(menu, input) { ... }  // 10 lines

function buildRow() {
    const input = buildInput(handleChange);
    const menu  = buildMenu(items);
    const wrap  = buildWrap(menu, input);
    ...
}
```

The logic is the same. But each piece is named and findable. The main function reads like
a summary: "build an input, build a menu, wrap them together."

### Where this appears in the project

`actionBar.js` has some very deep nesting inside the column visibility dropdown section
(the block starting around line 195). The nesting comes from building all 5 layers of the
dropdown inline, rather than extracting each layer into a named function.

---

## 6. Delete Dead Code

**Dead code is code that exists but is never called or used.**

It was probably needed once, then the feature changed, but the old code wasn't cleaned up.
It just sits there, taking up space and confusing anyone who reads it — they wonder "what is
this for?" but can't tell if deleting it would break something.

### Dead code in JS

In JS, your linter (`eslint`) will flag unused variables and imports. If a variable is declared
but never read, or a function is defined but never called — that's dead code.

### Dead code in CSS

A CSS class that's defined in the stylesheet but never applied to any HTML element. It takes
up space and makes you wonder what it's for — but it has no effect on anything.

Dead CSS is hard to spot by eye. A tool that scans your HTML for class names can find CSS rules
with no matching element.

### The risk

Be careful before deleting — make sure something isn't called from an unusual place you didn't
check (like a dynamic class name built from a string). When in doubt, search the whole codebase
for the name before deleting.

---

## 7. CSS Variables and Shared Classes (the CSS version of DRY)

CSS has two tools for avoiding copy-paste, equivalent to the JS ideas above:

| Problem | JS solution | CSS solution |
|---------|-------------|-------------|
| Same value written many times | Extract into a named constant | **CSS variable** |
| Same visual pattern used many times | Extract into a shared function | **Shared class** |

### CSS Variables

Define a value once at the top, use it everywhere. Change in one place, updates everywhere.

```css
/* Define once */
--stwid-radius-m: 6px;

/* Use everywhere — now "6px" only lives in one place */
border-radius: var(--stwid-radius-m);
```

**Real problem in `style.css`:** The variable `--stwid-radius-s` (= 4px) exists, but raw `4px`
is still used in multiple places instead. Same for `--stwid-radius-m` (6px) and
`--stwid-radius-l` (8px).

### Shared Classes

If two elements look the same, give them a shared base class instead of writing the same
CSS twice.

**Real example:** `.stwid--visibilityChip` (list panel) and `.stwid--filterChip` (order helper)
are both pill-shaped labels. The comment in `style.css` at line 1417 even says they share the
same visual intent. But they're written as two separate blocks, and they've already drifted
apart (different padding, different gap, different radius). A shared `.stwid--chip` base class
would keep them visually consistent and reduce duplication.

---

## 8. When NOT to Refactor

Refactoring has a cost — it takes time, and moving code around can introduce bugs. So the
question isn't just "could this be cleaner?" but "is the current state *causing a real problem*?"

### Refactor when:

- You can't find where something is (navigation pain)
- Making a small change requires touching 5 different files (coupling pain)
- You've read the same function three times and still can't understand it (comprehension pain)
- You're about to add a new feature and the current structure would make it messy

### Don't refactor when:

- The code just *looks* messy but you can still find and change things easily
- You're in the middle of building a new feature (finish the feature first, refactor after)
- The refactor would take longer than just working with the existing structure
- You'd be changing things that work fine purely for aesthetic reasons

### The rule: refactor when the structure is making the *next thing* harder

---

## Refactoring vs. Rewriting

These are different things, and confusing them is a common mistake.

| | **Refactoring** | **Rewriting** |
|---|---|---|
| The feature works the same after | Always | Only if done right |
| Risk of breaking things | Low | High |
| How much changes at once | A little at a time | Everything at once |
| How you verify it worked | Compare before/after behavior | Hope it works |
| Correct approach | Small steps, test each one | — |

**Rewriting is almost always riskier than it looks.** The existing code, however messy, has had
bugs fixed, edge cases handled, and quirks accounted for. A rewrite starts fresh and loses all
of that. Refactoring preserves it.

---

## Quick Reference

| Concept | One-line summary | Red flag that you need it |
|---------|-----------------|--------------------------|
| **DRY** | Write each thing once, reference it everywhere | Same code block appears 2+ times |
| **Better naming** | Names explain purpose, not shape | You have to read the body to understand the name |
| **Break up large things** | One file, one job. One function, one job | File > 500 lines, function > 50 lines |
| **Separate concerns** | Structure, appearance, behavior in different places | CSS mixed into JS logic, or layout mixed with apply logic |
| **Flatten nesting** | Extract deep levels into named functions | More than 3–4 levels of indentation |
| **Delete dead code** | Remove what's never called or used | Code you're not sure if it's needed |
| **CSS variables** | Define values once at the top, `var(--name)` everywhere | Same pixel/color value written twice in CSS |
| **CSS shared classes** | Same visual pattern? One base class, not two copies | Two elements that look the same but have separate CSS blocks |
| **When NOT to refactor** | Refactor when it causes pain, not for tidiness | "This could be cleaner" (not a good enough reason) |
