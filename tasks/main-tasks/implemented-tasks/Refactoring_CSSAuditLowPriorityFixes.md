# Refactoring â€” CSS Audit Low Priority Fixes

**Status:** IMPLEMENTED
**Date:** 2026-02-27
**Source:** `tasks/main-tasks/documented/CSSAudit_2026-02-27.md`
**File changed:** `style.css`

---

## Context

The CSS audit flagged 17 violations at three priority tiers. High and medium priority findings have already been applied. This task addresses the **low priority** findings only (excluding NAME findings, which are tracked separately).

Five low-priority rules have violations:

| ID | Rule | Description |
| --- | --- | --- |
| FMT-01 | Formatting | Double quotes in `[data-selected]` attribute selectors |
| FMT-03 | Formatting | Duplicate section number `5)` in comments |
| FMT-04 | Formatting | Parent selectors repeated as prefix across 3+ rule blocks |
| PROP-01 | Properties | `padding-left`/`padding-right` written separately instead of `padding-inline` |
| DGR-03 | Danger | Element-qualified class selectors (`i.fa-solidâ€¦` prefix on class-only rules) |

FMT-04 is by far the largest change â€” it involves restructuring ~60 selectors across five separate areas using CSS nesting. All other steps are small, targeted fixes.

---

## Findings to Fix

### FMT-01 â€” Double quotes in attribute selectors

The style guide requires single quotes in attribute selectors. Two violations remain:

**Line 533** (current):
```css
.stwid--small-multiselect a[data-selected="true"] {
```
Fix:
```css
.stwid--small-multiselect a[data-selected='true'] {
```

**Line 551** (current):
```css
.stwid--small-multiselect a[data-selected="true"] .multiselect-check {
```
Fix:
```css
.stwid--small-multiselect a[data-selected='true'] .multiselect-check {
```

---

### FMT-03 â€” Duplicate section number 5

Two section header comments both use `5)`. The PIR for the nesting refactoring renamed the first one to "5) Shared UI Patterns (drawer-internal)", but both still carry the number `5`.

**Current state:**
- Line 1093: `/* 5) Shared UI Patterns (drawer-internal) */`
- Line 1112: `/* 5) Context Menu + Modals */`

Fix â€” rename the context menu header to `5.5)`:
```css
/* 5.5) Context Menu + Modals */
```

---

### PROP-01 â€” Padding shorthand

Two rules use separate `padding-left`/`padding-right` declarations instead of the `padding-inline` shorthand.

**Lines 1545â€“1546** (inside `.stwid-compactInput`):
```css
  padding-left: 5px;
  padding-right: 5px;
```
Fix:
```css
  padding-inline: 5px;
```

**Lines 1979â€“1980** (inside the `.stwid--orderInputTight` rule):
```css
  padding-left: 5px;
  padding-right: 5px;
```
Fix:
```css
  padding-inline: 5px;
```

---

### DGR-03 â€” Element-qualified class selectors

Two selectors prefix a class name with a specific HTML element type (`i.fa-solid.fa-fw.fa-circle-question`). The style guide discourages this unless the element type is genuinely required for specificity. In both cases the class alone is sufficient.

> **Risk note:** If removing the element qualifier causes a styling conflict with a SillyTavern rule that targets `i` elements specifically, the element qualifier may need to be restored. Verify in the browser after applying.

**Line 192** (current):
```css
i.fa-solid.fa-fw.fa-circle-question.stwid--thinContainerLabelHint {
```
Fix â€” keep only the extension class:
```css
.stwid--thinContainerLabelHint {
```

**Line 1502** (current):
```css
i.fa-solid.fa-fw.fa-circle-question.stwid--bulkEditLabelHint {
```
Fix:
```css
.stwid--bulkEditLabelHint {
```

---

### FMT-04 â€” Nest repeated parent selectors

Five selector groups repeat a common ancestor prefix across 3+ rule blocks. The style guide requires these to be collapsed with CSS nesting. All these groups are already inside the `#WorldInfo {}` nesting block (or in the flat outer sections), so nesting is safe and well-supported by the current browser baseline.

**What nesting does:** Instead of writing `.stwid--folder .stwid--folderHeader { }` and `.stwid--folder .stwid--folderIcon { }` as separate flat rules, they become child rules inside one `.stwid--folder { }` block using `&` syntax. No behavior or visual change â€” it is a formatting-only restructure.

**Group 5a â€” `.stwid--folder` (lines ~585â€“690, ~11 rules)**

The `.stwid--folder` block already exists at line 585. Move all the `.stwid--folder .stwid--xxxxx` rules inside it. Exceptions that must stay flat or be handled carefully:
- Lines 666â€“676 (`.stwid--folder .stwid--actions .stwid--action` grouped with `.stwid--book .stwid--actions .stwid--action`) â€” this rule applies to BOTH folder and book, so it cannot go inside `.stwid--folder {}`. Leave it flat.
- Line 613 (`.stwid--folder:not(:has(...)) .stwid--folderIcon::before`) â€” becomes `&:not(:has(...)) .stwid--folderIcon::before { }` inside the block.

Result structure:
```css
.stwid--folder {
  /* existing folder props */

  & .stwid--folderHeader { ... }               /* was line 591 */
  &.stwid--state-target .stwid--folderHeader { ... } /* was line 604 */
  & .stwid--folderIcon { ... }                 /* was line 609 */
  &:not(:has(.stwid--folderBooks.stwid--state-collapsed)) .stwid--folderIcon::before { ... } /* was line 613 */
  & .stwid--folderLabel { ... }                /* was line 617 */
  & .stwid--folderCount { ... }                /* was line 626 */
  & .stwid--folderHeader .stwid--actions { ... } /* was line 635 */
  & .stwid--folderIcon,
  & .stwid--folderActiveToggle { ... }         /* was lines 642â€“643 */
  & .stwid--folderActiveToggle { ... }         /* was line 650 */
  & .stwid--folderActiveToggle[data-state='partial']::before { ... } /* was line 654 */
  & .stwid--folderHeader .stwid--actions .stwid--action { ... } /* was line 679 */
  & :is(.stwid--folderActiveToggle, .stwid--action):focus-visible { ... } /* was line 684 */
  & .stwid--folderBooks.stwid--state-collapsed { ... } /* was line 690 */
}

/* leave flat â€” shared with .stwid--book */
.stwid--folder .stwid--actions .stwid--action,
.stwid--book .stwid--actions .stwid--action { ... }
.stwid--folder .stwid--actions .stwid--action:hover,
.stwid--book .stwid--actions .stwid--action:hover { ... }
```

**Group 5b â€” `.stwid--books .stwid--book` (lines ~695â€“752, ~10 rules)**

The `.stwid--books .stwid--book` block already exists at line 695. Move all subsequent `.stwid--books .stwid--book.stwid--xxx` and `.stwid--books .stwid--book .stwid--xxx` rules inside it.

Result structure:
```css
.stwid--books .stwid--book {
  /* existing props */

  &.stwid--state-target,
  &.stwid--state-target .stwid--head { ... }
  &.stwid--filter-visibility,
  &.stwid--filter-query { ... }
  &:has(.stwid--entryList .stwid--entry.stwid--state-active) .stwid--head { ... }
  & .stwid--head { ... }
  & .stwid--head .stwid--title { ... }
  & .stwid--head .stwid--actions { ... }
  & .stwid--head .stwid--actions .stwid--sourceLinks .stwid--sourceIcon { ... }
  & .stwid--entryList.stwid--state-collapsed { ... }
}
```

**Group 5c â€” `.stwid--books .stwid--entry` (lines ~757â€“848, ~16 rules)**

The `.stwid--books .stwid--entry` block already exists at line 757. Move all subsequent `.stwid--books .stwid--entry.stwid--xxx` and `.stwid--books .stwid--entry .stwid--xxx` rules inside it.

Result structure:
```css
.stwid--books .stwid--entry {
  /* existing props */

  &:is(.stwid--state-dragging .stwid--entry:not(.stwid--state-selected)) { ... }
  &.stwid--state-selected { ... }
  &.stwid--state-selected:hover,
  &.stwid--state-selected.stwid--state-active { ... }
  &.stwid--state-selected *:not(:is(.stwid--selector)) { ... }
  &.stwid--filter-query { ... }
  &:hover,
  &.stwid--state-active { ... }
  &:hover .stwid--status,
  &.stwid--state-active .stwid--status { ... }
  &:has(.stwid--enabled.fa-toggle-off) { ... }
  & .stwid--selector { ... }
  & .stwid--selector:hover { ... }
  & .stwid--body { ... }
  & .stwid--status { ... }
  & .stwid--status .stwid--enabled { ... }
}
```

**Group 5d â€” `.stwid--blocker .stwid--listDropdownMenu .stwid--listDropdownItem` (lines ~1188â€“1229, ~5 rules)**

This section is in the flat (outside `#WorldInfo {}`) context menu area. Nest the item-level sub-rules inside `.stwid--blocker .stwid--listDropdownMenu .stwid--listDropdownItem {}`.

Note: Lines 1206 and 1212 use `.stwid--listDropdownMenu .stwid--listDropdownItem` without the `.stwid--blocker` prefix â€” these must remain outside the new nesting block.

Result structure:
```css
.stwid--blocker .stwid--listDropdownMenu .stwid--listDropdownItem {
  /* existing props */

  &:hover { ... }
  & #lorebook_ordering_button { ... }
  &.stwid--bookSort { ... }
  &.stwid--bookSort select { ... }
}

/* leave flat â€” no .stwid--blocker prefix */
.stwid--listDropdownMenu .stwid--listDropdownItem .stwid--icon { ... }
.stwid--listDropdownMenu .stwid--listDropdownItem .stwid--label { ... }
```

**Group 5e â€” `.stwid--orderTable tr td` (lines ~1740â€“1995, ~30 rules)**

This is the largest group and is in the flat orderHelper section (outside `#WorldInfo {}`). The `.stwid--orderTable tr td {}` block already exists at line 1740. Move all subsequent `.stwid--orderTable tr td[data-col='...']` and `.stwid--orderTable tr td .stwid--xxx` rules inside it.

Result structure:
```css
.stwid--orderTable tr td {
  /* existing props */

  &[data-col='select'] { ... }
  &[data-col='drag'] { ... }
  &[data-col='enabled'] { ... }
  &[data-col='entry'] { ... }
  &[data-col='strategy'] { ... }
  &[data-col='position'] { ... }
  &[data-col='outlet'] { ... }
  &[data-col='recursion'] { ... }
  &[data-col='characterFilter'] { ... }
  &[data-col='budget'] { ... }
  /* second .stwid--orderTable tr td block (line 1851) merges here */
  & .stwid--sortableHandle { ... }
  & .stwid--sortableHandle:hover { ... }
  & .stwid--orderMove { ... }
  & .stwid--orderMoveButton { ... }
  & .stwid--orderMoveButton:hover { ... }
  & .stwid--orderMoveButton:focus-visible,
  & .stwid--sortableHandle:focus-visible,
  & .stwid--orderSelect:focus-visible { ... }
  & .stwid--orderSelect { ... }
  & .stwid--orderSelect:hover { ... }
  & .stwid--orderSelect .stwid--icon { ... }
  & [name='depth'] { ... }
  &:has([name='position'] > [value='4']:checked) + td > [name='depth'] { ... }
  &:has(.stwid--entry) { ... }
  &:has(.stwid--entry) .stwid--book { ... }
  &:has(.stwid--entry) .stwid--commentLink { ... }
  &:has(.stwid--entry) a.stwid--comment.stwid--commentLink { ... }
  &:has(.stwid--entry) .stwid--key { ... }
  & .stwid--outlet { ... }
  & .stwid--outlet input[name='outletName'] { ... }
  & .stwid--position { ... }
  & input[name='depth'],
  & input[name='order'],
  & input[name='selective_probability'] { ... }
  & .stwid--enabled { ... }
}
```

> Note: There are currently **two separate** `.stwid--orderTable tr td { }` blocks in the file (around lines 1740 and 1851). Both must be merged into one nested block during this step.

---

## Implementation Plan

Work through steps in this order. Steps 1â€“4 are small, safe, and independent â€” do them first. Step 5 is the only complex step and should be done last, one sub-group at a time.

### Step 1 â€” FMT-01: Change double quotes to single quotes

- [x] Line 533: Change `[data-selected="true"]` to `[data-selected='true']`
- [x] Line 551: Change `[data-selected="true"]` to `[data-selected='true']`

### Step 2 â€” FMT-03: Renumber duplicate section 5 header

- [x] Line 1112: Change `/* 5) Context Menu + Modals */` to `/* 5.5) Context Menu + Modals */`

### Step 3 â€” DGR-03: Remove element qualifiers from class selectors

- [x] Line 192: Replace `i.fa-solid.fa-fw.fa-circle-question.stwid--thinContainerLabelHint` with `.stwid--thinContainerLabelHint`
- [x] Line 1502: Replace `i.fa-solid.fa-fw.fa-circle-question.stwid--bulkEditLabelHint` with `.stwid--bulkEditLabelHint`

### Step 4 â€” PROP-01: Replace separate padding properties with shorthand

- [x] Lines 1545â€“1546: Replace `padding-left: 5px; padding-right: 5px;` with `padding-inline: 5px;`
- [x] Lines 1979â€“1980: Replace `padding-left: 5px; padding-right: 5px;` with `padding-inline: 5px;`

### Step 5 â€” FMT-04: Nest repeated parent selectors

Work through each group one at a time. Reload and verify in the browser after completing each group before moving to the next.

- [x] **5a** â€” Nest `.stwid--folder` sub-rules (lines ~585â€“690). Leave the shared action affordance rules (lines 666â€“676) flat outside the block.
- [x] **5b** â€” Nest `.stwid--books .stwid--book` sub-rules (lines ~695â€“752) inside the existing `.stwid--books .stwid--book {}` block.
- [x] **5c** â€” Nest `.stwid--books .stwid--entry` sub-rules (lines ~757â€“848) inside the existing `.stwid--books .stwid--entry {}` block.
- [x] **5d** â€” Nest `.stwid--blocker .stwid--listDropdownMenu .stwid--listDropdownItem` sub-rules (lines ~1188â€“1229). Leave the two prefix-less `.stwid--listDropdownMenu .stwid--listDropdownItem` rules flat.
- [x] **5e** â€” Nest `.stwid--orderTable tr td` sub-rules (lines ~1740â€“1995). Merge the two separate `tr td` blocks into one nested block.

### Step 6 â€” Verify

- [ ] Reload the World Info drawer in the browser.
- [ ] Confirm hint icons (`fa-circle-question`) still appear on thin-container labels and bulk-edit rows and have correct sizing/opacity.
- [ ] Confirm the small multiselect controls (tab bar items) still show selected state correctly.
- [ ] Confirm folder rows, book rows, and entry rows still render and hover correctly in the list panel.
- [ ] Confirm the context menu (book sort dropdown) still opens and items display correctly.
- [ ] Confirm the Order Helper table renders all columns with correct widths, drag handles, move buttons, and select dropdowns.
- [ ] Confirm Order Helper inline inputs (depth, order, probability) still have appropriate padding.

---

## After Implementation
*Implemented: February 28, 2026*

### What changed

`style.css`
- Switched the two multiselect `[data-selected]` selectors to single quotes.
- Renamed the duplicated section header from `5)` to `5.5)`.
- Removed the unnecessary `i` element prefix from two question-icon hint selectors.
- Replaced two `padding-left`/`padding-right` pairs with `padding-inline`.
- Nested the five repeated parent-selector groups (`folder`, `book`, `entry`, context-menu item, and order-table `td`) and merged the duplicate order-table `td` blocks.

`tasks/main-tasks/implemented-tasks/Refactoring_CSSAuditLowPriorityFixes.md`
- Marked implementation checklist steps 1 through 5 as complete.
- Updated task status to `IMPLEMENTED`.
- Added this post-implementation summary section.

### Risks / What might break

- This changes many selector shapes in the folder/book/entry list area, so hover or selected-state visuals might differ if any nested selector was moved incorrectly.
- This changes context-menu selector structure, so book menu row styles might miss hover or alignment in some menu states.
- This merges the Order Helper table `td` styling into one nested block, so some column widths or inline control spacing could shift if a selector no longer matches.

### Manual checks

- Reload the page, open World Info Drawer, and confirm folder, book, and entry rows still show normal, hover, and selected visuals exactly as before.
- Open a book context menu and confirm each row still has correct height, hover highlight, icon/label alignment, and the sort row still looks distinct.
- Open Order Helper and confirm all columns keep expected widths and controls (drag handle, move buttons, select controls, depth/order/probability inputs) remain aligned and usable.

