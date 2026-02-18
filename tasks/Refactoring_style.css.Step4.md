# Refactoring style.css — Step 4: Over-specific Selector Reduction

> **Goal:** Shorten deeply nested CSS selectors where extension-unique class names already guarantee scope. The root boundary `body.stwid-- #WorldInfo` is always preserved. No visual or behavioral changes — the browser should render the UI identically before and after.

> **Line numbers** reference the post-Step-3 file (1,694 lines). They will shift after each sub-task is applied.

---

## Audit summary

### Why each shortening is safe

| Ancestor(s) removed | Class retained as anchor | Safe because |
|---------------------|--------------------------|--------------|
| `.stwid--list .stwid--books` before `.stwid--folder` | `.stwid--folder` | `.stwid--folder` does not appear in the Order Helper section at all |
| `.stwid--list` before `.stwid--books .stwid--book` | `.stwid--books .stwid--book` | `.stwid--books` is the list panel scroll container; it never appears in the Order Helper |
| `.stwid--book` from `.stwid--books .stwid--book .stwid--entry` | `.stwid--books .stwid--entry` | `.stwid--entry` appears in Order Helper table cells, but never under `.stwid--books`; the anchor is sufficient |
| `.stwid--list` before `.stwid--controls` | `.stwid--controls` | `.stwid--controls` does not appear in the Order Helper section |
| `.stwid--list .stwid--filter` before leaf classes (`.stwid--visibilityChip`, `.stwid--visibilityChips`, `.stwid--bookVisibility`, `.stwid--bookVisibilityHelp`, `.stwid--searchEntries`) | leaf class directly | None of these leaf classes appear in the Order Helper section |

### What cannot be shortened

| Selector | Reason |
|----------|--------|
| `body.stwid-- #WorldInfo .stwid--list .stwid--filter` (the filter panel itself) | `.stwid--filter` also names the filter panel inside the Order Helper — removing `.stwid--list` would match both |
| `body.stwid-- #WorldInfo .stwid--list .stwid--filter .stwid--filterRow...` | Intermediate `.stwid--filter` parent must stay as-is since `.stwid--filter` is shared |
| `body.stwid-- #WorldInfo .stwid--list` | The list panel root — cannot shorten, this is the panel scope anchor |

---

## Sub-task overview

| Sub-task | What changes | Approx. selector lines affected |
|----------|--------------|--------------------------------|
| 4a | Replace `> :nth-child(1)` with class-based selector | 1 rule (line ~795) |
| 4b | Folder chain — drop `.stwid--list .stwid--books` before `.stwid--folder` | ~17 selector lines (lines ~355–462) |
| 4c | Book chain — drop `.stwid--list` before `.stwid--books .stwid--book` | ~13 selector lines (lines ~465–534) |
| 4d | Entry chain — drop `.stwid--book` from `.stwid--books .stwid--book .stwid--entry` | ~16 selector lines (lines ~537–672) |
| 4e | Controls + filter leaf classes — drop `.stwid--list` before `.stwid--controls`; shorten unique filter leaf selectors | ~10 selector lines (lines ~136–350) |

---

## 4a — Fix brittle `> :nth-child(1)` selector

**What and why:** The selector `> .world_entry_edit > :nth-child(1)` matches the first child of `.world_entry_edit` by position. If the vanilla ST template is ever reordered, this silently breaks the drawer editor layout. The first child always has the classes `flex-container` AND `alignitemscenter`. The second child has `flex-container` but uses `flexGap10` instead of `alignitemscenter`. Switching to a class-based selector is more stable and self-documenting.

**Current (line ~795):**
```css
body.stwid-- #WorldInfo .stwid--editor .inline-drawer-content > .world_entry_edit > :nth-child(1) {
  flex: 1 1 auto;
  flex-direction: column;
  align-items: stretch;
  min-height: 0;
}
```

**After:**
```css
/* override: first child of world_entry_edit — the outer keywords/overrides/content wrapper; flex:1 lets it fill drawer height */
body.stwid-- #WorldInfo .stwid--editor .inline-drawer-content > .world_entry_edit > .flex-container.alignitemscenter {
  flex: 1 1 auto;
  flex-direction: column;
  align-items: stretch;
  min-height: 0;
}
```

**Steps:**
1. Replace `> :nth-child(1)` with `> .flex-container.alignitemscenter` in the selector.
2. Add the explanatory comment on the line immediately before the rule.

**Reload check:** Open the drawer and load an entry. The editor panel should fill the full available height with keyword fields, content textarea, and settings all visible.

- [ ] `:nth-child(1)` replaced with `.flex-container.alignitemscenter`
- [ ] Explanatory comment added before the rule
- [ ] Browser reloaded — editor panel fills height correctly

---

## 4b — Shorten folder selectors

**What and why:** All folder selectors carry `body.stwid-- #WorldInfo .stwid--list .stwid--books` before `.stwid--folder`. Since `.stwid--folder` is not used anywhere in the Order Helper section, `body.stwid-- #WorldInfo .stwid--folder` is already a safe, unique scope. Dropping `.stwid--list .stwid--books` shortens every selector by 2 levels.

**Pattern:**
```
body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--folder...
→ body.stwid-- #WorldInfo .stwid--folder...
```

**Affected selectors** (all in the Folders section, lines ~355–462):

| Approximate line | Selector (shortened form after change) |
|-----------------|---------------------------------------|
| 355 | `body.stwid-- #WorldInfo .stwid--folder` |
| 361 | `body.stwid-- #WorldInfo .stwid--folder .stwid--folderHeader` |
| 374 | `body.stwid-- #WorldInfo .stwid--folder.stwid--isTarget .stwid--folderHeader` |
| 379 | `body.stwid-- #WorldInfo .stwid--folder .stwid--folderIcon` |
| 383 | `body.stwid-- #WorldInfo .stwid--folder:not(:has(.stwid--folderBooks.stwid--isCollapsed)) .stwid--folderIcon::before` |
| 387 | `body.stwid-- #WorldInfo .stwid--folder .stwid--folderLabel` |
| 396 | `body.stwid-- #WorldInfo .stwid--folder .stwid--folderCount` |
| 405 | `body.stwid-- #WorldInfo .stwid--folder .stwid--folderHeader .stwid--actions` |
| 412–413 (group) | `body.stwid-- #WorldInfo .stwid--folder .stwid--folderIcon` and `.stwid--folder .stwid--folderActiveToggle` |
| 420 | `body.stwid-- #WorldInfo .stwid--folder .stwid--folderActiveToggle` |
| 424 | `body.stwid-- #WorldInfo .stwid--folder .stwid--folderActiveToggle[data-state='partial']::before` |
| 436 (group, folder half) | `body.stwid-- #WorldInfo .stwid--folder .stwid--folderHeader .stwid--actions .stwid--action` |
| 443 (group, folder half) | `body.stwid-- #WorldInfo .stwid--folder .stwid--folderHeader .stwid--actions .stwid--action:hover` |
| 449 | `body.stwid-- #WorldInfo .stwid--folder .stwid--folderHeader .stwid--actions .stwid--action` |
| 454 | `body.stwid-- #WorldInfo .stwid--folder :is(.stwid--folderActiveToggle, .stwid--action):focus-visible` |
| 460 | `body.stwid-- #WorldInfo .stwid--folder .stwid--folderBooks.stwid--isCollapsed` |

> **Note on the grouped rule at ~436–446:** This single rule block groups one folder selector and one book selector. Apply the folder shortening here in sub-task 4b; the book selector in the same group gets its shortening in sub-task 4c.

**Steps:**
1. In every selector from the list above, replace `body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--folder` with `body.stwid-- #WorldInfo .stwid--folder`.
2. The multi-line selectors (e.g. lines 383, 424) must have their intermediate ancestor lines removed entirely; re-format as a single line if they become short enough.

**Reload check:** Open the drawer. Expand and collapse folders. Click folder action buttons. Verify the tri-state active toggle on folders works. Folder active/hover/focus states should look unchanged.

- [ ] All 17 folder selector instances updated
- [ ] Multi-line selectors reformatted where appropriate
- [ ] Grouped action rule (line ~436) has its folder half updated
- [ ] Browser reloaded — folder UI looks identical

---

## 4c — Shorten book selectors

**What and why:** Book selectors carry `body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book`. The `.stwid--list` ancestor is redundant — `.stwid--books` already uniquely names the list panel scroll container (it does not appear in the Order Helper). Dropping `.stwid--list` shortens each selector by 1 level.

> **Important:** `.stwid--book` is used as a text-label class inside Order Helper table cells. Keeping `.stwid--books .stwid--book` ensures Order Helper occurrences are NOT matched.

**Pattern:**
```
body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book...
→ body.stwid-- #WorldInfo .stwid--books .stwid--book...
```

**Affected selectors** (all in the Books section, lines ~465–534):

| Approximate line | Selector (shortened form after change) |
|-----------------|---------------------------------------|
| 465 | `body.stwid-- #WorldInfo .stwid--books .stwid--book` |
| 469–470 (group) | `body.stwid-- #WorldInfo .stwid--books .stwid--book.stwid--isTarget` and `.stwid--book.stwid--isTarget .stwid--head` |
| 474–475 (group) | `body.stwid-- #WorldInfo .stwid--books .stwid--book.stwid--filter-visibility` and `.stwid--book.stwid--filter-query` |
| 479–486 (multi-line) | `body.stwid-- #WorldInfo .stwid--books .stwid--book:has(.stwid--entryList .stwid--entry.stwid--active) .stwid--head` |
| 488 | `body.stwid-- #WorldInfo .stwid--books .stwid--book .stwid--head` |
| 497 | `body.stwid-- #WorldInfo .stwid--books .stwid--book .stwid--head .stwid--title` |
| 506 | `body.stwid-- #WorldInfo .stwid--books .stwid--book .stwid--head .stwid--actions` |
| 512 | `body.stwid-- #WorldInfo .stwid--books .stwid--book .stwid--head .stwid--actions .stwid--sourceLinks` |
| 518 | `body.stwid-- #WorldInfo .stwid--books .stwid--book .stwid--head .stwid--actions .stwid--sourceLinks.stwid--isEmpty` |
| 522 | `body.stwid-- #WorldInfo .stwid--books .stwid--book .stwid--head .stwid--actions .stwid--sourceLinks .stwid--sourceIcon` |
| 527–534 (multi-line) | `body.stwid-- #WorldInfo .stwid--books .stwid--book .stwid--entryList.stwid--isCollapsed` |
| 437 (group, book half) | `body.stwid-- #WorldInfo .stwid--books .stwid--book .stwid--head .stwid--actions .stwid--action` |
| 444 (group, book half) | `body.stwid-- #WorldInfo .stwid--books .stwid--book .stwid--head .stwid--actions .stwid--action:hover` |

**Steps:**
1. In every selector from the list above, replace `body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book` with `body.stwid-- #WorldInfo .stwid--books .stwid--book`.
2. Reformat multi-line selectors (lines ~479–486, ~527–534) to a single line where they fit within ~120 characters; otherwise keep the readable multi-line format with one ancestor per line.

**Reload check:** Open the drawer. Expand and collapse books. Click book head to navigate. Verify target highlight, filter-hidden state, source links visibility, and action buttons. All should be visually unchanged.

- [ ] All 13 book selector instances updated
- [ ] Multi-line selectors reformatted where appropriate
- [ ] Grouped action rule (line ~436) has its book half updated
- [ ] Browser reloaded — book UI looks identical

---

## 4d — Shorten entry selectors

**What and why:** Entry selectors carry `body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book .stwid--entry`. The `.stwid--list .stwid--books .stwid--book` chain can be reduced to just `.stwid--books`. Rationale:
- `.stwid--entry` appears in Order Helper table cells, so it cannot be used alone.
- `.stwid--books .stwid--entry` is safe: entries under `.stwid--books` are always list-panel entries. Order Helper entries are under `.stwid--orderTable`, never under `.stwid--books`.

This removes 3 ancestor levels (`stwid--list`, `stwid--books`, `stwid--book`) and replaces them with 1 (`stwid--books`), cutting each selector by 2 levels net.

**Pattern:**
```
body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book .stwid--entry...
→ body.stwid-- #WorldInfo .stwid--books .stwid--entry...
```

**Affected selectors** (all in the Entries section, lines ~537–672):

| Approximate line(s) | Rule |
|--------------------|------|
| 537 | Base entry row layout |
| 546–553 (multi-line) | Dragging pointer-events |
| 555 | `.stwid--isSelected` background |
| 560–573 (multi-line) | `.stwid--isSelected` hover/active background |
| 575–583 (multi-line) | `.stwid--isSelected` descendant pointer-events |
| 585 | `.stwid--filter-query` hide |
| 589–592 | `:hover` and `.stwid--active` background |
| 594–603 (multi-line) | Hover/active status opacity |
| 605–612 (multi-line) | Disabled entry opacity |
| 614–620 | `.stwid--selector` column |
| 622–630 (multi-line) | `.stwid--selector:hover` |
| 632–636 | `.stwid--body` |
| 638–645 | `.stwid--body .stwid--comment` and `.stwid--key` (truncation group) |
| 647–651 | `.stwid--body .stwid--key` typography |
| 653–660 | `.stwid--status` |
| 662–672 (multi-line) | `.stwid--status .stwid--enabled` |

**Steps:**
1. In every selector from the list above, replace `body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book .stwid--entry` with `body.stwid-- #WorldInfo .stwid--books .stwid--entry`.
2. Reformat multi-line selectors to single-line where they now fit.

**Reload check:** Open the drawer and expand a book with entries. Verify:
- Entries render with correct border, spacing, and overflow.
- Hover, selected, active, and disabled states display correctly.
- Selector column visibility on hover works.
- Comment and key text truncate correctly with ellipsis.
- Status icons appear at correct opacity.

- [ ] All 16 entry selector instances updated
- [ ] Multi-line selectors reformatted where appropriate
- [ ] Browser reloaded — entry list row states look identical

---

## 4e — Shorten controls and filter leaf selectors

**What and why:** Two groups of list panel selectors can be shortened without risk:

**Controls group** — `.stwid--controls` is not used in the Order Helper section. The `.stwid--list` ancestor in `.stwid--list .stwid--controls` is therefore redundant. Dropping it removes 1 level from all controls selectors.

**Filter leaf classes** — The top-level filter panel rule `... .stwid--list .stwid--filter` must keep `.stwid--list` because `.stwid--filter` is also a panel element inside the Order Helper. However, the leaf classes _inside_ the list filter panel (`.stwid--bookVisibility`, `.stwid--visibilityChips`, `.stwid--visibilityChip`, `.stwid--bookVisibilityHelp`, `.stwid--searchEntries`) do **not** appear in the Order Helper. These can be scoped directly from `body.stwid-- #WorldInfo`, removing 2 ancestor levels.

### Controls selectors

**Pattern:**
```
body.stwid-- #WorldInfo .stwid--list .stwid--controls...
→ body.stwid-- #WorldInfo .stwid--controls...
```

| Approx. line | Current selector suffix | After |
|--------------|------------------------|-------|
| 136 | `.stwid--list .stwid--controls` | `.stwid--controls` |
| 143 | `.stwid--list .stwid--controls .stwid--controlsRow` | `.stwid--controlsRow` |
| 152 | `.stwid--list .stwid--controls .stwid--orderControls` | `.stwid--orderControls` |
| 157 | `.stwid--list .stwid--controls .stwid--orderControls .text_pole` | `.stwid--orderControls .text_pole` |
| 165–166 (group) | `.stwid--list .stwid--controls .stwid--controlsRow .stwid--bookSortToggle` / `.stwid--clearBookSorts` | `.stwid--controlsRow .stwid--bookSortToggle` / `.stwid--clearBookSorts` |
| 174 | `.stwid--list .stwid--controls .stwid--active` | `.stwid--controls .stwid--active` |

### Filter leaf selectors

**Pattern:**
```
body.stwid-- #WorldInfo .stwid--list .stwid--filter .<leaf-class>
→ body.stwid-- #WorldInfo .<leaf-class>
```

| Approx. line | Leaf class | Shortened selector |
|--------------|------------|--------------------|
| 202 | `.stwid--searchEntries` | `body.stwid-- #WorldInfo .stwid--searchEntries` |
| 208 | `.stwid--bookVisibility` | `body.stwid-- #WorldInfo .stwid--bookVisibility` |
| 320 | `.stwid--bookVisibilityHelp` (child of `.stwid--bookVisibility`) | `body.stwid-- #WorldInfo .stwid--bookVisibilityHelp` |
| 326 | `.stwid--visibilityChips` | `body.stwid-- #WorldInfo .stwid--visibilityChips` |
| 337 | `.stwid--visibilityChip` | `body.stwid-- #WorldInfo .stwid--visibilityChip` |
| 348 | `.stwid--visibilityChip .stwid--icon` | `body.stwid-- #WorldInfo .stwid--visibilityChip .stwid--icon` |

> **Not changed:** `body.stwid-- #WorldInfo .stwid--list .stwid--filter` (line ~179) and its `.stwid--filterRow` children stay at their current specificity because `.stwid--filter` is also used in the Order Helper.

**Steps:**
1. Apply the controls pattern to the 6 controls selector lines above (remove `.stwid--list` before `.stwid--controls`).
2. Apply the filter leaf pattern to the 6 leaf selector lines above (remove `.stwid--list .stwid--filter` and use just `body.stwid-- #WorldInfo .<leaf-class>`).

**Reload check:** Open the drawer. Verify:
- The sort and controls row buttons are correctly sized and styled.
- The active-sort color (accent color on active sort buttons) works.
- The search input in the filter row stretches correctly.
- The book visibility filter menu and chips display correctly.
- Chip borders, background tint, and icon color are unchanged.

- [ ] 6 controls selector instances updated
- [ ] 6 filter leaf selector instances updated
- [ ] Browser reloaded — controls row and filter chip UI look identical

---

## Step 4 Final Checks

- [ ] All 5 sub-tasks complete and browser verified after each
- [ ] Record new line count after Step 4: actual \_\_\_\_ lines in `style.css`
- [ ] Full validation matrix pass:
  - [ ] List panel: controls row, filter row, chips, folder collapse/expand, book collapse/expand, entry selection/hover/disabled
  - [ ] Menus: multiselect dropdown open/close/select, context menu open/close/hover, Move Book modal
  - [ ] Editor: load entry, type in fields, switch entries, focus mode on/off
  - [ ] Order Helper: table renders, filter row controls align, column visibility toggle, row hover/select, drag handle visible
  - [ ] Theme: SmartTheme accent colors correct, focus rings visible on tab, no invisible buttons or text
- [ ] Confirm both pre-existing bugs are still present (not caused by this step):
  - [ ] Visibility dropdown does not close on outside click
  - [ ] Escape key closes the entire drawer instead of just an open menu
