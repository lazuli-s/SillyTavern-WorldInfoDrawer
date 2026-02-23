# TASK: Remove redundant `body.stwid--` prefix from extension-class CSS rules
*Created: February 23, 2026*

**Type:** REFACTORING
**Status:** DOCUMENTED

---

## Summary

The stylesheet (`style.css`) prefixes nearly every CSS rule with `body.stwid-- #WorldInfo`.
That two-part prefix was added to gate styles behind the extension being active and to scope them to
the drawer container. But for most rules it is only half-necessary: the `body.stwid--` part adds
nothing, because the classes those rules target (`.stwid--*`) are only ever added to the DOM by the
extension itself — there is nothing to accidentally style when the extension is inactive. Removing
the redundant part makes each selector about 20 characters shorter, cuts indirection, and makes the
file easier to read at a glance.

---

## Current Behavior

`style.css` contains approximately 140 selectors that begin with `body.stwid-- #WorldInfo`.
The `body.stwid--` portion is a CSS class that the extension adds to the `<body>` element at the
moment it activates (see `src/drawer.js` line 182). Its intended job is to act as an "on/off
switch" — styles under it should not apply unless the extension is running.

There are two different types of rules hiding behind that prefix:

1. **Rules that genuinely need the state gate.**
   These override or hide parts of SillyTavern's own `#WorldInfo` element: its size, its layout,
   its `openDrawer` state, and its built-in child `#wi-holder`. Without `body.stwid--`, those
   overrides would always apply — even if the extension is disabled — potentially breaking the
   normal SillyTavern World Info panel.

2. **Rules that do not need the state gate.**
   These style elements the extension itself created (anything with a `.stwid--` class).
   Because `.stwid--*` classes only exist when the extension puts them there, the rule can never
   accidentally match anything if the extension hasn't run. The `body.stwid--` guard is redundant.

---

## Expected Behavior

After this refactoring, `style.css` will have two distinct selector patterns:

- **`body.stwid-- #WorldInfo { … }`** — kept only for the three rules that genuinely need the
  state gate (see Implementation Plan).
- **`#WorldInfo .stwid--foo { … }`** — used for all other rules (extension-owned elements).

Visually and functionally the extension will look and behave identically. This is a pure
code-quality change — no behavior changes.

---

## Known CSS Pattern (relevant to future `css-audit` skill)

The `body.stwid--` prefix is **intentionally kept** on rules that touch ST-owned DOM. The future
`css-audit` skill must understand this distinction and must NOT flag the retained `body.stwid--`
occurrences as violations. Only bare `body.stwid--` usage in front of `.stwid--*` selectors should
be flagged.

---

## Agreed Scope

Single file: **`style.css`** (root of the extension).
No JavaScript files are touched. No behavior changes. No visual changes.

---

## Out of Scope

- Rewriting any other selector patterns (combinators, pseudo-classes, etc.)
- Changing any property values or declaration order
- Auditing for other Google CSS Style Guide violations (that is the job of the `css-audit` skill)

---

## Implementation Plan

### Step 1 — Identify the three rules to keep unchanged

These three selectors must retain the full `body.stwid-- #WorldInfo` prefix because they override
or hide SillyTavern-owned elements:

| Selector | Why it must keep the prefix |
|---|---|
| `body.stwid-- #WorldInfo { … }` | Sets layout/sizing overrides and CSS tokens on ST's own `#WorldInfo` element |
| `body.stwid-- #WorldInfo.openDrawer { … }` | Forces `display: flex` on ST's own element when it has the `openDrawer` class |
| `body.stwid-- #WorldInfo #wi-holder { … }` | Hides ST's own child element `#wi-holder` |

### Step 2 — Replace `body.stwid-- #WorldInfo` with `#WorldInfo` in all other rules

For every other occurrence of `body.stwid-- #WorldInfo` in `style.css` (where the next selector
token after `#WorldInfo` is a `.stwid--` class, a `>` combinator to a `.stwid--` class, or a space
to a `.stwid--` class), replace the full prefix `body.stwid-- #WorldInfo` with just `#WorldInfo`.

- [ ] Open `style.css`.
- [ ] For each rule **not** listed in Step 1, change `body.stwid-- #WorldInfo` → `#WorldInfo`.
  Do this for every selector line (comma-separated multi-selectors each get their own line changed).
- [ ] Verify the three Step 1 rules still have the full `body.stwid-- #WorldInfo` prefix.
- [ ] Verify the one rule at line 15 (`body #WorldInfo > .stwid--body { display: none; }`) is
  untouched — it uses a different, intentional pattern and belongs to a separate concern.

### Step 3 — Confirm no unintended changes

- [ ] Do a final `grep` for `body.stwid--` in `style.css` and confirm only the three expected
  selectors remain.
- [ ] Do a final `grep` for `body.stwid-- #WorldInfo` and confirm the count equals exactly 3.

---

## After Implementation

*(To be filled in after the task is completed.)*
