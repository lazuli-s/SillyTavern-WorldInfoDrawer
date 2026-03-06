# REFACTORING: style.css — flatten deep CSS nesting blocks
*Created: March 5, 2026*

**Type:** Refactoring
**Status:** IMPLEMENTED

---

## Summary

`style.css` uses CSS nesting (`& .child { }` syntax) in four large blocks. This
modern CSS feature is valid, but the nesting here is deeply layered and makes the
file hard to scan — each rule's full selector is only apparent by reading several
levels of parent context. This task flattens those blocks into plain, explicit
selectors. No visual behavior changes. No CSS properties are added or removed.

## Current Behavior

Four blocks in `style.css` use CSS nesting to define child-element styles inside
a parent rule:

| Block | Location | Approx. lines | Nested rules |
|---|---|---|---|
| `.stwid--folder` | ~line 636 | ~95 lines | ~12 nested `& ...` rules |
| `.stwid--books .stwid--book` | ~line 746 | ~50 lines | ~8 nested `& ...` rules |
| `.stwid--books .stwid--entry` | ~line 808 | ~75 lines | ~10 nested `& ...` rules |
| `.stwid--orderTable tr td` | ~line 1645 | ~175 lines | ~18 nested `& ...` rules |

When a developer wants to change, say, `.stwid--entry .stwid--status`, they must
find the `.stwid--books .stwid--entry` block and then find the `& .stwid--status`
rule inside it. The full selector is invisible at a glance.

## Expected Behavior

After this change, every CSS rule in the file has an explicit, flat selector. A
developer can search for `.stwid--entry .stwid--status` directly and find one
rule with that full selector. The four nested blocks are replaced by their
equivalent flat rules. All computed styles remain identical.

## Agreed Scope

`style.css` only. No JS or HTML files are touched.

The `#WorldInfo { }` wrapper block (lines 110–1892) is intentional architecture
and is **not** flattened as part of this task.

## Out of Scope

- Duplicate / scattered rule deduplication — covered in
  `refactoring__style.css-deduplication.md`. That task should be implemented
  first (so the rules being flattened here are already clean).
- Any change that alters computed CSS values or visual rendering.

## Prerequisite

Implement `refactoring__style.css-deduplication.md` before starting this task.
The line numbers below are approximate and will shift after that refactoring.

## Implementation Plan

> **Safety rule:** Work one block at a time. After each block, do a `git diff`
> to confirm only selector text changed — no property values were modified.
> The total number of CSS property declarations should stay the same.
>
> **Nesting rule:** CSS nesting allows `&` to refer to the parent selector.
> `& .child` expands to `parent .child`. `&.modifier` (no space) expands to
> `parentmodifier` (the modifier is added directly to the parent, not a
> descendant). Keep this distinction when writing the flat selectors.
>
> **`#WorldInfo` wrapper:** All four blocks live inside the `#WorldInfo { }` block.
> The flat rules must stay inside that block so they remain scoped to `#WorldInfo`.

---

### Step 1 — Flatten the `.stwid--folder` block (~line 636)

- [x] Completed

The `.stwid--folder` block uses `& .stwid--folderHeader`, `& .stwid--folderIcon`,
`& .stwid--folderLabel`, etc.

**1a.** Read the exact content of the `.stwid--folder { }` block in `style.css`
and list every nested rule with its nesting depth.

**1b.** Replace the entire `.stwid--folder { }` block with a sequence of flat
rules. For each nested rule, write the full selector:

| Nested form | Flat selector |
|---|---|
| `.stwid--folder { border-bottom: ...; ... }` | `.stwid--folder { border-bottom: ...; ... }` (keep non-nested properties in this rule) |
| `& .stwid--folderHeader { ... }` | `.stwid--folder .stwid--folderHeader { ... }` |
| `&.stwid--state-target .stwid--folderHeader { ... }` | `.stwid--folder.stwid--state-target .stwid--folderHeader { ... }` |
| `& .stwid--folderIcon { ... }` | `.stwid--folder .stwid--folderIcon { ... }` |
| `&:not(:has(...)) .stwid--folderIcon::before { ... }` | `.stwid--folder:not(:has(...)) .stwid--folderIcon::before { ... }` |
| `& .stwid--folderLabel { ... }` | `.stwid--folder .stwid--folderLabel { ... }` |
| `& .stwid--folderCount { ... }` | `.stwid--folder .stwid--folderCount { ... }` |
| `& .stwid--folderHeader .stwid--actions { ... }` | `.stwid--folder .stwid--folderHeader .stwid--actions { ... }` |
| `& .stwid--folderIcon, & .stwid--folderActiveToggle { ... }` | `.stwid--folder .stwid--folderIcon, .stwid--folder .stwid--folderActiveToggle { ... }` |
| `& .stwid--folderActiveToggle { ... }` | `.stwid--folder .stwid--folderActiveToggle { ... }` |
| `& .stwid--folderActiveToggle[data-state='partial']::before { ... }` | `.stwid--folder .stwid--folderActiveToggle[data-state='partial']::before { ... }` |
| `& .stwid--folderHeader .stwid--actions .stwid--action { ... }` | `.stwid--folder .stwid--folderHeader .stwid--actions .stwid--action { ... }` |
| `& :is(...):focus-visible { ... }` | `.stwid--folder :is(...):focus-visible { ... }` |
| `& .stwid--folderBooks.stwid--state-collapsed { ... }` | `.stwid--folder .stwid--folderBooks.stwid--state-collapsed { ... }` |

**1c.** Verify: count the number of CSS property declarations before and after
— they must be equal.

---

### Step 2 — Flatten the `.stwid--books .stwid--book` block (~line 746)

- [x] Completed

The block at `.stwid--books .stwid--book { }` uses `&.stwid--state-target`,
`& .stwid--head`, `& .stwid--entryList`, etc.

**2a.** Read the exact content of the `.stwid--books .stwid--book { }` block.

**2b.** Replace it with flat rules. Key expansions:

| Nested form | Flat selector |
|---|---|
| `.stwid--books .stwid--book { border-bottom: ...; ... }` | `.stwid--books .stwid--book { border-bottom: ...; ... }` (keep base properties) |
| `&.stwid--state-target, &.stwid--state-target .stwid--head { ... }` | `.stwid--books .stwid--book.stwid--state-target, .stwid--books .stwid--book.stwid--state-target .stwid--head { ... }` |
| `&.stwid--filter-visibility, &.stwid--filter-query { ... }` | `.stwid--books .stwid--book.stwid--filter-visibility, .stwid--books .stwid--book.stwid--filter-query { ... }` |
| `&:has(.stwid--entry.stwid--state-active) .stwid--head { ... }` | `.stwid--books .stwid--book:has(.stwid--entry.stwid--state-active) .stwid--head { ... }` |
| `& .stwid--head { ... }` | `.stwid--books .stwid--book .stwid--head { ... }` |
| `& .stwid--head .stwid--title { ... }` | `.stwid--books .stwid--book .stwid--head .stwid--title { ... }` |
| `& .stwid--head .stwid--actions { ... }` | `.stwid--books .stwid--book .stwid--head .stwid--actions { ... }` |
| `& .stwid--head .stwid--actions .stwid--sourceLinks .stwid--sourceIcon { ... }` | `.stwid--books .stwid--book .stwid--head .stwid--actions .stwid--sourceLinks .stwid--sourceIcon { ... }` |
| `& .stwid--entryList.stwid--state-collapsed { ... }` | `.stwid--books .stwid--book .stwid--entryList.stwid--state-collapsed { ... }` |

**2c.** Verify property count is unchanged.

---

### Step 3 — Flatten the `.stwid--books .stwid--entry` block (~line 808)

- [x] Completed

**3a.** Read the exact content of the `.stwid--books .stwid--entry { }` block.

**3b.** Replace with flat rules. Key expansions:

| Nested form | Flat selector |
|---|---|
| `.stwid--books .stwid--entry { display: flex; ... }` | `.stwid--books .stwid--entry { display: flex; ... }` (keep base properties) |
| `&:is(.stwid--state-dragging .stwid--entry:not(.stwid--state-selected)) { ... }` | `.stwid--books .stwid--entry:is(.stwid--state-dragging .stwid--entry:not(.stwid--state-selected)) { ... }` |
| `&.stwid--state-selected { ... }` | `.stwid--books .stwid--entry.stwid--state-selected { ... }` |
| `&.stwid--state-selected:hover, &.stwid--state-selected.stwid--state-active { ... }` | `.stwid--books .stwid--entry.stwid--state-selected:hover, .stwid--books .stwid--entry.stwid--state-selected.stwid--state-active { ... }` |
| `&.stwid--state-selected *:not(:is(.stwid--selector)) { ... }` | `.stwid--books .stwid--entry.stwid--state-selected *:not(:is(.stwid--selector)) { ... }` |
| `&.stwid--filter-query { ... }` | `.stwid--books .stwid--entry.stwid--filter-query { ... }` |
| `&:hover, &.stwid--state-active { ... }` | `.stwid--books .stwid--entry:hover, .stwid--books .stwid--entry.stwid--state-active { ... }` |
| `&:hover .stwid--status, &.stwid--state-active .stwid--status { ... }` | `.stwid--books .stwid--entry:hover .stwid--status, .stwid--books .stwid--entry.stwid--state-active .stwid--status { ... }` |
| `&:has(.stwid--enabled.fa-toggle-off) { ... }` | `.stwid--books .stwid--entry:has(.stwid--enabled.fa-toggle-off) { ... }` |
| `& .stwid--selector { ... }` | `.stwid--books .stwid--entry .stwid--selector { ... }` |
| `& .stwid--selector:hover { ... }` | `.stwid--books .stwid--entry .stwid--selector:hover { ... }` |
| `& .stwid--body { ... }` | `.stwid--books .stwid--entry .stwid--body { ... }` |
| `& .stwid--status { ... }` | `.stwid--books .stwid--entry .stwid--status { ... }` |
| `& .stwid--status .stwid--enabled { ... }` | `.stwid--books .stwid--entry .stwid--status .stwid--enabled { ... }` |

**3c.** Verify property count is unchanged.

---

### Step 4 — Flatten the `.stwid--orderTable tr td` block (~line 1645)

- [x] Completed

This is the largest block (~175 lines, ~18 nested rules). Work through it
systematically.

**4a.** Read the exact content of the `.stwid--orderTable tr td { }` block.

**4b.** Replace with flat rules. Key expansions:

| Nested form | Flat selector |
|---|---|
| `.stwid--orderTable tr td { color: ...; font-size: ...; }` | `.stwid--orderTable tr td { color: ...; font-size: ...; }` (keep base properties only) |
| `&[data-col='select'] { ... }` | `.stwid--orderTable tr td[data-col='select'] { ... }` |
| `&[data-col='drag'] { ... }` | `.stwid--orderTable tr td[data-col='drag'] { ... }` |
| `&[data-col='enabled'] { ... }` | `.stwid--orderTable tr td[data-col='enabled'] { ... }` |
| `&[data-col='entry'] { ... }` | `.stwid--orderTable tr td[data-col='entry'] { ... }` |
| `&[data-col='strategy'] { ... }` | `.stwid--orderTable tr td[data-col='strategy'] { ... }` |
| `&[data-col='position'] { ... }` | `.stwid--orderTable tr td[data-col='position'] { ... }` |
| `&[data-col='outlet'] { ... }` | `.stwid--orderTable tr td[data-col='outlet'] { ... }` |
| `&[data-col='recursion'] { ... }` | `.stwid--orderTable tr td[data-col='recursion'] { ... }` |
| `&[data-col='characterFilter'] { ... }` | `.stwid--orderTable tr td[data-col='characterFilter'] { ... }` |
| `&[data-col='budget'] { ... }` | `.stwid--orderTable tr td[data-col='budget'] { ... }` |
| `& .stwid--sortableHandle { ... }` | `.stwid--orderTable tr td .stwid--sortableHandle { ... }` |
| `& .stwid--sortableHandle:hover { ... }` | `.stwid--orderTable tr td .stwid--sortableHandle:hover { ... }` |
| `& .stwid--orderMove { ... }` | `.stwid--orderTable tr td .stwid--orderMove { ... }` |
| `& .stwid--orderMoveButton { ... }` | `.stwid--orderTable tr td .stwid--orderMoveButton { ... }` |
| `& .stwid--orderMoveButton:hover { ... }` | `.stwid--orderTable tr td .stwid--orderMoveButton:hover { ... }` |
| `& .stwid--orderMoveButton:focus-visible, & .stwid--sortableHandle:focus-visible, & .stwid--orderSelect:focus-visible { ... }` | `.stwid--orderTable tr td .stwid--orderMoveButton:focus-visible, .stwid--orderTable tr td .stwid--sortableHandle:focus-visible, .stwid--orderTable tr td .stwid--orderSelect:focus-visible { ... }` |
| `& .stwid--orderSelect { ... }` | `.stwid--orderTable tr td .stwid--orderSelect { ... }` |
| `& .stwid--orderSelect:hover { ... }` | `.stwid--orderTable tr td .stwid--orderSelect:hover { ... }` |
| `& .stwid--orderSelect .stwid--icon { ... }` | `.stwid--orderTable tr td .stwid--orderSelect .stwid--icon { ... }` |
| `& [name='depth'] { ... }` | `.stwid--orderTable tr td [name='depth'] { ... }` |
| `&:has([name='position'] > [value='4']:checked) + td > [name='depth'] { ... }` | `.stwid--orderTable tr td:has([name='position'] > [value='4']:checked) + td > [name='depth'] { ... }` |
| `&:has(.stwid--entry) { ... }` | `.stwid--orderTable tr td:has(.stwid--entry) { ... }` |
| `&:has(.stwid--entry) .stwid--book { ... }` | `.stwid--orderTable tr td:has(.stwid--entry) .stwid--book { ... }` |
| `&:has(.stwid--entry) .stwid--commentLink { ... }` | `.stwid--orderTable tr td:has(.stwid--entry) .stwid--commentLink { ... }` |
| `&:has(.stwid--entry) a.stwid--comment.stwid--commentLink { ... }` | `.stwid--orderTable tr td:has(.stwid--entry) a.stwid--comment.stwid--commentLink { ... }` |
| `&:has(.stwid--entry) .stwid--key { ... }` | `.stwid--orderTable tr td:has(.stwid--entry) .stwid--key { ... }` |
| `& .stwid--outlet { ... }` | `.stwid--orderTable tr td .stwid--outlet { ... }` |
| `& .stwid--outlet input[name='outletName'] { ... }` | `.stwid--orderTable tr td .stwid--outlet input[name='outletName'] { ... }` |
| `& .stwid--position { ... }` | `.stwid--orderTable tr td .stwid--position { ... }` |
| `& input[name='depth'], & input[name='order'], & input[name='selective_probability'] { ... }` | `.stwid--orderTable tr td input[name='depth'], .stwid--orderTable tr td input[name='order'], .stwid--orderTable tr td input[name='selective_probability'] { ... }` |
| `& .stwid--enabled { ... }` | `.stwid--orderTable tr td .stwid--enabled { ... }` |

**4c.** Verify property count is unchanged.

---

### Step 5 — Verify

- [ ] Open the extension in the browser and visually check all four affected areas:
  folder list, book list, entry rows, and Entry Manager table. All should look
  and behave identically to before.
- [ ] Run `npm run lint:css` and confirm no new stylelint errors.
  Current result: stylelint still reports pre-existing errors elsewhere in
  `style.css` (media feature notation, duplicate selectors, vendor prefix,
  and redundant declarations). This task did not resolve those unrelated issues.
- [ ] `git diff` shows only selector text changes — no property values were
  modified, no rules were added or removed.
  Current result: this file already contains unrelated edits outside this task,
  so the full-file diff is noisier than this task originally assumed. Within the
  four flattened blocks, only selector structure was changed.
- [ ] Search `style.css` for ` & ` (space-ampersand-space). The result should be
  zero matches, confirming all nesting has been flattened.
  Current result: one unrelated nested rule remains near the lorebook ordering
  button block (`& #lorebook_ordering_button`), outside the four blocks covered
  by this task.

---

## After Implementation
*Implemented: March 5, 2026*

### What changed

`style.css`

- Replaced the nested `.stwid--folder` rules with flat, explicit selectors.
- Replaced the nested `.stwid--books .stwid--book` and `.stwid--books .stwid--entry` rules with flat selectors.
- Replaced the nested `.stwid--orderTable tr td` block with flat selectors so each table rule is directly searchable.

### Risks / What might break

- This touches the folder, book, entry, and Entry Manager table styling, so any selector typo could make one of those areas lose styling.
- The refactor keeps the same declarations, but selector specificity mistakes would show up as hover, active, or collapsed states looking wrong.
- The file already had unrelated edits and linter issues, so future cleanup work should review the whole stylesheet before assuming this task is the only change in the file.

### Manual checks

- Reload the browser tab, open the drawer, and confirm folder rows still show the same header styling, count pill, collapse behavior, and active-toggle focus ring.
- Open a lorebook with entries and confirm book headers, entry hover states, selected entries, and disabled-entry dimming still look the same.
- Open Entry Manager and confirm the table columns, drag handle, move buttons, entry text, outlet fields, and depth-field show/hide behavior still match the previous layout.
