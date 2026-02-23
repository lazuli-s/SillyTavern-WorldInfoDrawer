# TASK: Refactor style.css to use CSS nesting
*Created: February 23, 2026*

**Type:** REFACTORING
**Status:** IMPLEMENTED

---

## Summary

`style.css` repeats `#WorldInfo` on approximately 130 selectors throughout the panel section.
CSS nesting â€” a modern browser feature that requires no build step â€” lets you write `#WorldInfo`
once as a wrapper block, and all rules inside it automatically inherit that scope. This makes the
file significantly shorter, removes visual clutter from every selector, and makes the scoping
intent obvious at a glance.

This approach is more complete than the earlier `Refactoring_stylecss.md` plan (which proposed
removing only `body.stwid--`). CSS nesting eliminates both `body.stwid--` and `#WorldInfo`
repetition at once, making the earlier task redundant for the panel-section rules.

---

## Background: CSS Nesting

CSS nesting is a native browser feature (Chrome 112+, Firefox 117+, Safari 16.5+, all released
2023). It works without any build tool or compilation step â€” the browser reads it directly.

Instead of:
```css
#WorldInfo .stwid--list { â€¦ }
#WorldInfo .stwid--editor { â€¦ }
#WorldInfo .stwid--splitter { â€¦ }
```

You write:
```css
#WorldInfo {
  .stwid--list { â€¦ }
  .stwid--editor { â€¦ }
  .stwid--splitter { â€¦ }
}
```

The browser treats both forms identically.

---

## Current Behavior

`style.css` has ~130 selectors in the panel section (sections 1.5 through 4) that all begin with
either `body.stwid-- #WorldInfo` or `#WorldInfo`. Each rule repeats the full prefix explicitly.

---

## Expected Behavior

After this refactoring:

- A single `#WorldInfo { }` nesting block wraps all panel-section rules.
- Rules inside the block are written with just their own class name (e.g. `.stwid--list { }`),
  with no `#WorldInfo` prefix.
- `#WorldInfo` appears only a handful of times at the top of the file, for rules that genuinely
  target the `#WorldInfo` element itself rather than elements inside it.
- No visual or behavioral changes. This is a pure code-quality change.

---

## What Stays Flat (Outside the Nesting Block)

These rules must remain outside `#WorldInfo { }` because they either target `#WorldInfo` the
element itself, or use `body.stwid--` as a genuine on/off gate for SillyTavern-owned elements.

| Selector | Reason to keep flat |
|---|---|
| `body #WorldInfo > .stwid--body { display: none; }` | Default hide rule â€” must apply before the extension activates, so it cannot be scoped inside `#WorldInfo {}` |
| `body.stwid-- #WorldInfo { }` | Overrides ST's own `#WorldInfo` element (sizing, layout, CSS tokens). KEEP. |
| `body.stwid-- #WorldInfo.openDrawer { }` | Forces `display: flex` on ST's own element when it has the `openDrawer` class. KEEP. |
| `body.stwid-- #WorldInfo #wi-holder { }` | Hides ST's own child element. KEEP. |
| `body.stwid-- #WorldInfo > .stwid--body { }` | Overrides the default-hide rule above â€” `body.stwid--` is the genuine state gate here. KEEP. |
| `body.stwid-- #WorldInfo > .stwid--body.stwid--isLoading { }` | Same state gate. KEEP. |
| `body.stwid-- #WorldInfo > .stwid--body.stwid--isLoading::after { }` | Same state gate. KEEP. |

The orderHelper section (section 6), the context menu section (`.stwid--blocker`), and the Move
Book dialog (`.stwid--moveBookContent`) are already flat and stay flat â€” they render outside
`#WorldInfo`.

---

## Grouped Selectors That Need Splitting

Three rules in the current file use a grouped selector (comma-separated) that mixes one selector
inside `#WorldInfo` and one selector outside. These must be split into two separate rules.

### Split 1 â€” Shared layout shell (flex-column fill)

**Current (lines 101â€“109):**
```css
body.stwid-- #WorldInfo .stwid--editor,
.stwid--orderHelper {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}
```

**After:**
```css
/* Inside #WorldInfo { } */
.stwid--editor {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}

/* Outside â€” orderHelper renders outside #WorldInfo */
.stwid--orderHelper {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}
```

### Split 2 â€” Shared layout shell (scrollable fill wrapper)

**Current (lines 112â€“117):**
```css
body.stwid-- #WorldInfo .stwid--list .stwid--books,
.stwid--orderTableWrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
```

**After:**
```css
/* Inside #WorldInfo { } */
.stwid--list .stwid--books {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

/* Outside */
.stwid--orderTableWrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
```

### Split 3 â€” Focus ring rule (section 5, lines 940â€“945)

**Current:**
```css
body.stwid-- #WorldInfo :is(.stwid--action, .stwid--folderAction, .stwid--folderMenu, .stwid--folderToggle, .stwid--orderFilterButton):focus-visible,
body.stwid-- #WorldInfo .stwid--multiselectDropdownOption:focus-visible,
.stwid--blocker .stwid--listDropdownItem:focus-visible {
  outline: var(--stwid-focus-ring);
  outline-offset: var(--stwid-focus-ring-offset);
}
```

**After:**
```css
/* Inside #WorldInfo { } */
:is(.stwid--action, .stwid--folderAction, .stwid--folderMenu, .stwid--folderToggle, .stwid--orderFilterButton):focus-visible,
.stwid--multiselectDropdownOption:focus-visible {
  outline: var(--stwid-focus-ring);
  outline-offset: var(--stwid-focus-ring-offset);
}

/* Outside â€” context menu renders inside .stwid--blocker at document level */
.stwid--blocker .stwid--listDropdownItem:focus-visible {
  outline: var(--stwid-focus-ring);
  outline-offset: var(--stwid-focus-ring-offset);
}
```

---

## Agreed Scope

Single file: **`style.css`** (root of the extension).
No JavaScript files are touched. No behavior changes. No visual changes.

The CSS nesting feature is already supported by modern browsers that SillyTavern targets â€” the
codebase already uses `color-mix()`, `rgb(from â€¦)`, and CSS anchor positioning, which require the
same or newer baseline.

---

## Out of Scope

- The orderHelper section (section 6) â€” no `#WorldInfo` repetition to remove there.
- Any other CSS style guide violations (naming, formatting, danger rules).
- Changes to property values, declaration order, or visual appearance.

---

## Implementation Plan

### Step 1 â€” Verify stylelint supports CSS nesting

- [x] Open `.stylelintrc.json` and confirm that the stylelint configuration does not block CSS
  nesting syntax. If it does, update the config to allow it before proceeding.

### Step 2 â€” Identify the seven flat rules (see table above)

Before touching anything, mark these seven rules mentally as "do not move":
`body #WorldInfo > .stwid--body`,
`body.stwid-- #WorldInfo { }`,
`body.stwid-- #WorldInfo.openDrawer`,
`body.stwid-- #WorldInfo #wi-holder`,
and the three `body.stwid-- #WorldInfo > .stwid--body*` loading rules.

### Step 3 â€” Split the three grouped selectors (see Grouped Selectors section above)

- [x] Split the `stwid--editor` / `stwid--orderHelper` grouped rule into two separate rules
  (duplicate the declarations). Leave the `stwid--orderHelper` copy in place; the
  `stwid--editor` copy will move into the nesting block in Step 5.
- [x] Split the `stwid--list .stwid--books` / `stwid--orderTableWrap` grouped rule the same way.
- [x] Split the focus-ring grouped rule (section 5, lines 940â€“945) the same way. Leave the
  `.stwid--blocker` copy in place; the `#WorldInfo` copy will move in Step 5.

### Step 4 â€” Create the `#WorldInfo { }` nesting block

- [x] After the seven flat rules (after the last `body.stwid-- #WorldInfo > .stwid--body`
  loading rule, around line 92), open a new `#WorldInfo { }` block with a section comment:

```css
/* ------------------------------------------------------------------ */
/* Panel â€” all extension-owned elements inside #WorldInfo              */
/* ------------------------------------------------------------------ */
#WorldInfo {

}
```

### Step 5 â€” Move all remaining `#WorldInfo`-scoped rules inside the block

Process sections 1.5 through 4 one section at a time:

- [x] Section 1.5 (shared layout shells): move the `stwid--editor` and
  `stwid--list .stwid--books` halves (created in Step 3) inside the block. Remove any
  remaining `body.stwid-- #WorldInfo` or `#WorldInfo` prefix from each selector.
- [x] Section 2 (List Panel, lines ~125â€“765): move all rules inside the block, removing the
  `body.stwid-- #WorldInfo` prefix from every selector.
- [x] Section 3 (Splitter, lines ~773â€“786): move inside the block.
- [x] Section 4 (Editor Panel, lines ~794â€“919): move inside the block.
- [x] Section 5 (Context Menu, lines ~936â€“945): move the `#WorldInfo`-scoped focus-ring half
  (created in Step 3) and the `:is(â€¦)` border-radius rule inside the block.

### Step 6 â€” Close the nesting block and verify structure

- [x] Close the `#WorldInfo { }` block.
- [x] Confirm the file structure reads top-to-bottom as:
  1. Section comment + flat drawer rules (the 7 flat rules)
  2. `#WorldInfo { }` nesting block (sections 1.5â€“5)
  3. Flat: `.stwid--blocker` and `.stwid--moveBookContent` (context menu / modals)
  4. Section 6: orderHelper (unchanged)
  5. Section 7: misc (unchanged)

### Step 7 â€” Final verification

- [x] `grep` for `#WorldInfo` in `style.css` and confirm it appears only in the 7 flat rules
  plus the single opening line of the nesting block.
- [x] `grep` for `body.stwid--` and confirm it appears only in the 7 flat rules.
- [x] Run `npm run lint:css` and confirm no new stylelint errors.

---

## Relationship to Other Tasks

- **`Refactoring_stylecss.md`** (remove `body.stwid--` only): that task is now superseded by
  this one. Once CSS nesting is in place, the `body.stwid--` removal is no longer needed for
  the panel section â€” nesting handles it automatically. The `Refactoring_stylecss.md` plan
  should be marked superseded rather than implemented.

---

## After Implementation
*Implemented: February 23, 2026*

### What changed

`style.css`
- Added one `#WorldInfo {}` nesting wrapper for panel rules (sections 1.5 through 5 scoped rules).
- Removed repeated `body.stwid-- #WorldInfo` prefixes from panel selectors inside that wrapper.
- Split mixed-scope grouped selectors so outside-drawer rules (`.stwid--orderHelper`, `.stwid--orderTableWrap`, `.stwid--blocker ...:focus-visible`) stay flat.

`tasks/main-tasks/documented-tasks/Refactoring_stylecssNesting.md`
- Marked all implementation checklist items complete.
- Updated task status from `DOCUMENTED` to `IMPLEMENTED`.
- Added this implementation summary, risk list, and manual checks.

### Risks / What might break

- This touches many selector headers, so it might affect which elements receive styles if any selector was moved to the wrong scope.
- This touches focus-visible styling split rules, so it might affect keyboard focus outlines in either the drawer or context menu.
- This touches layout shell selector grouping, so it might affect editor/list fill behavior if one split rule was misplaced.

### Manual checks

- Reload the extension UI and open the World Info drawer. Success: list panel, splitter, and editor panel look and size the same as before.
- Open a book, select entries, and use keyboard Tab navigation on actions. Success: focus outlines still appear on drawer controls and on context menu items.
- Open Order Helper and scroll the table area. Success: Order Helper still fills available space and its table wrapper still scrolls normally.
