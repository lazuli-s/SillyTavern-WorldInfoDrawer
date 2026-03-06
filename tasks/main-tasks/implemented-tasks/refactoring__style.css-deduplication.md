# REFACTORING: style.css — remove duplicate and scattered rules
*Created: March 5, 2026*

**Type:** Refactoring
**Status:** IMPLEMENTED

---

## Summary

`style.css` has several CSS rules that are either defined more than once (with
redundant or partially-conflicting copies) or split across the file in ways that
make the actual effective values hard to reason about. This task consolidates
those rules into single, authoritative definitions. No visual behavior changes.
No CSS rules are added; properties are only removed or merged.

## Current Behavior

When a developer opens `style.css` to change a class, they may find the same
class defined in two or more places with overlapping or conflicting properties.
The browser silently resolves the conflict by specificity/cascade order, making
the effective style invisible without manual tracing.

Specific problems:

1. **`.stwid--thinContainer` defined twice** — once globally (line 217) and once
   scoped to `.stwid--entryManager` (line 1297). The scoped version copies all 6
   properties and only changes `border-radius` (from the literal `4px` to the
   token `var(--stwid-radius-s, 4px)`). The 6 identical copies are wasted lines.

2. **`.stwid--thinContainerLabel` and `.stwid--bulkEditLabel` share 7 identical
   properties** (lines 227 and 1311). The only difference is that
   `.stwid--bulkEditLabel` adds `background-color`. The 7 shared properties are
   copied in full.

3. **`.stwid--state-active` color written twice** — identical `color` rule in two
   differently-scoped selectors (lines 347 and 351). Could be one grouped rule.

4. **`display: flex` repeated in sorting sub-rules** — the group rule for
   `.stwid--sortingRow .stwid--globalSorting` and `.stwid--individualSorting`
   already sets `display: flex`. Each individual rule then declares `display: flex`
   again (lines 297, 307). Redundant.

5. **`.stwid--visibilityRow` defined three times with conflicts** (lines 267, 363,
   and 439). The three definitions disagree on `gap`, `align-items`, and
   `flex-wrap`. The standalone definition at line 439 overrides most of what the
   group rule at line 267 sets for the same selector, leaving `justify-content:
   space-evenly` (from the group) silently active even though line 439 does not
   intend it.

6. **`.stwid--controlsRow` in two overlapping rules** (lines 207 and 267). The
   more-specific rule at line 207 sets `margin-top: 1.1em`; the less-specific
   group rule at line 267 sets `margin-top: 1em`. The group value is always
   overridden in practice but is never cleaned up.

## Expected Behavior

After this change, each class has one authoritative definition. Properties that
are shared between two classes are written once in a grouped selector rule.
Properties that are always overridden by a more-specific rule are removed from
the less-specific rule. Visual rendering in the browser is unchanged.

## Agreed Scope

`style.css` only. No JS or HTML files are touched.

## Out of Scope

- Flattening CSS nesting (`& .child { }` blocks) — covered in a separate task:
  `refactoring__style.css-flatten-nesting.md`.
- The `#WorldInfo { }` wrapper block — intentional architecture, not touched.
- Any change that alters visual rendering.

## Implementation Plan

> **Safety rule:** After each step, do a `git diff` and confirm that no selector
> was accidentally deleted or duplicated. The total number of CSS properties
> across the file should decrease with each step — never increase.
>
> **Specificity note:** All rules below sit inside the `#WorldInfo { }` nesting
> block (lines 110–1892). The `#WorldInfo` prefix is implicit for every selector
> inside that block. Do not move rules outside of that block.

---

### Step 1 — Fix `.stwid--thinContainer` border-radius token, then remove duplicate block
- [x] Implemented

**1a.** In the global `.stwid--thinContainer` rule (around line 217), change:

```css
border-radius: 4px;
```

to:

```css
border-radius: var(--stwid-radius-s, 4px);
```

**1b.** Delete the entire `.stwid--entryManager .stwid--thinContainer` block
(around line 1297). It now contributes nothing — all its properties match the
global definition updated in 1a.

After deletion, verify the Entry Manager's `thinContainer` elements still render
identically (the global rule still applies to them).

---

### Step 2 — Consolidate `.stwid--thinContainerLabel` and `.stwid--bulkEditLabel`
- [x] Implemented

The 7 shared properties are:
```css
position: absolute;
top: -0.6em;
left: 0.4em;
font-size: 0.7em;
padding: 0 0.25em;
color: var(--SmartThemeEmColor);
line-height: 1;
white-space: nowrap;
```

**2a.** Replace the existing `.stwid--thinContainerLabel` rule with a grouped
selector rule containing the 7 shared properties:

```css
.stwid--thinContainerLabel,
.stwid--bulkEditLabel {
    position: absolute;
    top: -0.6em;
    left: 0.4em;
    font-size: 0.7em;
    padding: 0 0.25em;
    color: var(--SmartThemeEmColor);
    line-height: 1;
    white-space: nowrap;
}
```

Keep this grouped rule in the same location as the original `.stwid--thinContainerLabel`
rule (Book Browser section).

**2b.** Replace the existing `.stwid--bulkEditLabel` rule (Entry Manager section,
around line 1311) with only the one property that differs:

```css
.stwid--bulkEditLabel {
  background-color: var(--SmartThemeBlurTintColor);
}
```

---

### Step 3 — Merge the two `.stwid--state-active` color rules
- [x] Implemented

Around lines 347–353, replace:

```css
.stwid--controls .stwid--state-active {
  color: var(--SmartThemeQuoteColor);
}

.stwid--list .stwid--filter .stwid--state-active {
  color: var(--SmartThemeQuoteColor);
}
```

with:

```css
.stwid--controls .stwid--state-active,
.stwid--list .stwid--filter .stwid--state-active {
  color: var(--SmartThemeQuoteColor);
}
```

---

### Step 4 — Remove redundant `display: flex` from sorting sub-rules
- [x] Implemented

In the `.stwid--sortingRow .stwid--globalSorting` rule (around line 296), remove
the line:

```css
display: flex;
```

In the `.stwid--sortingRow .stwid--individualSorting` rule (around line 303),
remove the line:

```css
display: flex;
```

Both are already set by the group selector rule immediately above them.

---

### Step 5 — Consolidate `.stwid--visibilityRow`
- [x] Implemented

This step requires checking in the browser first, then editing.

**5a. Identify the three definitions and their current effect.**

The three locations are:

| Location | Selector | Key properties |
|---|---|---|
| Line ~267 (group rule) | `.stwid--visibilityRow` (in a comma group) | `display: flex; gap: 0.7em; margin-top: 1em; align-items: center; flex-wrap: wrap; justify-content: space-evenly;` |
| Line ~363 (scoped) | `.stwid--list .stwid--visibilityRow` | `display: flex; gap: 1.5em; justify-content: center; align-items: center; flex-wrap: wrap;` |
| Line ~439 (standalone) | `.stwid--visibilityRow` | `position: relative; display: flex; align-items: flex-start; gap: 0.35em; flex-wrap: nowrap; width: 100%; margin-top: 1em; flex: 1 1 auto;` |

The standalone definition at line 439 overrides `gap`, `align-items`, and
`flex-wrap` from the group rule at line 267. However, `justify-content:
space-evenly` from the group rule is NOT overridden by line 439, meaning it
remains silently active on the standalone `.stwid--visibilityRow`. This is
almost certainly unintentional.

**5b. Remove `.stwid--visibilityRow` from the group rule at line ~267.**

The comma-list at line 267 includes:
```
.stwid--sortingRow, .stwid--visibilityRow, .stwid--controlsRow, .stwid--searchRow, .stwid--foldersRow
```

Remove `.stwid--visibilityRow` from this list. The standalone definition at line
439 will become the only source of base styles for that class.

**5c. Add any missing properties to the standalone definition at line 439.**

After removing from the group, check whether the standalone `.stwid--visibilityRow`
at line 439 is now a complete, self-sufficient definition. It currently lacks
`justify-content`. Add `justify-content: flex-start;` (or whatever value is
correct visually after a browser check) if the layout looks different.

**5d. Verify the scoped rule at line ~363 (`.stwid--list .stwid--visibilityRow`)
is still correct.** This rule provides overrides for the Book Browser context
and should remain unchanged.

---

### Step 6 — Remove `.stwid--controlsRow` from the group rule
- [x] Implemented

The group rule at line ~267 includes `.stwid--controlsRow` and sets `margin-top:
1em`. However, the more-specific rule at line ~207 (`.stwid--controls
.stwid--controlsRow`) sets `margin-top: 1.1em` and always wins. The group
rule's value is never used.

**6a.** Verify in the codebase (JS or HTML) that `.stwid--controlsRow` only ever
appears inside `.stwid--controls`. (Search for `stwid--controlsRow` in
`src/book-browser/` to confirm.)

**6b.** If confirmed, remove `.stwid--controlsRow` from the comma list in the
group rule at line ~267.

---

### Step 7 — Verify

- [ ] Open the extension in the browser and visually check the Book Browser
  controls, sorting row, visibility row, and Entry Manager bulk edit row — all
  should look identical to before.
- [x] Run `npm run lint:css` and confirm no new stylelint errors.
- [ ] `git diff` shows only property deletions and selector groupings — no new
  properties, no new selectors, no moved rules.

---

## After Implementation
*Implemented: March 6, 2026*

### What changed

`style.css`
- Replaced one hard-coded corner radius with the shared radius token so the global thin container rule now matches the Entry Manager version.
- Merged repeated label positioning styles into one shared rule and left the bulk edit label with only its unique background color.
- Removed repeated sorting and state-active declarations, and separated the visibility row from a conflicting shared row rule so it has one clear base definition.
- Deleted the duplicate Entry Manager thin container block because the global rule now covers it.

### Risks / What might break

- This touches shared control-row styling, so the Book Browser sorting and visibility controls could shift slightly if one old override was relied on by accident.
- This touches the Entry Manager bulk edit labels, so their small title badges could sit a little differently if another selector was depending on the duplicated block.
- The visibility row now defines its own horizontal alignment more explicitly, so the spacing of visibility controls should be checked after a reload.

### Manual checks

- Reload the browser tab, open the World Info drawer, and compare the Book Browser controls to before. Success looks like the sorting, search, folder, and visibility rows keeping the same shape and spacing.
- Open the Entry Manager bulk edit view and look at the small floating labels above each thin container. Success looks like the labels staying in the same place with the same background tint.
- Open the visibility controls and confirm the items still sit in one row on desktop until they need to wrap. Success looks like no clipped buttons and no unexpected extra centering.
- `npm run lint:css` still reports repository-wide existing errors, but the errors tied to the edited duplicate-rule area are gone. Success looks like no new failures pointing at the merged selectors in this task.
