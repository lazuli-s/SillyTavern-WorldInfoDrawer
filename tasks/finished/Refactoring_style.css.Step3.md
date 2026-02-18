# Refactoring style.css â€” Step 3: CSS-only Vanilla-first pass

> **Goal:** Audit every extension CSS rule that targets a vanilla SillyTavern class. Remove declarations that merely restate what vanilla already provides, and add an explanatory `/* override: ... */` comment to every rule that must stay. No visual output changes â€” everything should look identical before and after.

> **Line numbers** reference the post-Step-2 file (1,682 lines). They will shift after each sub-task is applied.

---

## Audit summary

A full scan found **14 rule blocks** referencing vanilla classes. Only **one block** contains removable duplicates. All others are intentional overrides.

| Line | Vanilla class(es) targeted | Action |
|------|---------------------------|--------|
| 156â€“162 | `.text_pole` (order controls) | Keep â€” add comment |
| 305â€“307 | `.fa-square-check` (multiselect checkbox) | Keep â€” add comment |
| 714â€“717 | `#wiCheckboxes` | Keep â€” add comment |
| 719â€“726 | `.world_entry *:not(...)` (focus mode hide) | Keep â€” add comment |
| 754â€“758 | `.world_entry`, `.world_entry_form`, `.inline-drawer` (height) | Keep â€” add comment |
| 760â€“764 | `.inline-drawer` (flex layout) | Keep â€” add comment |
| 766â€“769 | `.drag-handle`, `.inline-drawer-toggle` (hide) | Keep â€” add comment |
| 771â€“776 | `.inline-drawer-content` (flex with `!important`) | Keep â€” add comment |
| 778â€“784 | `.world_entry_edit` (flex override) | Keep â€” add comment |
| 786â€“791 | `.world_entry_edit > :nth-child(1)` (brittle selector) | Leave alone â€” Step 4 will replace |
| 793â€“800 | `.inline-drawer:has(.userSettingsInnerExpandable)` (hide) | Keep â€” add comment |
| 863â€“866 | `.text_pole` (move book dialog) | Keep â€” add comment |
| 876â€“881 | `.menu_button` (move book dialog) | **Remove 2 duplicates + add comments** |
| 1513â€“1516 | `.checkbox` (order helper recursion row) | Keep â€” add comment |

---

### 3a. Remove duplicate declarations from `.menu_button` block

**What and why:** Vanilla `.menu_button` already declares `align-items: center` and `justify-content: center`. The extension's rule at lines 876â€“881 redeclares both â€” that is the only genuine redundancy found in this entire step. The other two declarations are intentional overrides: `min-width: 2.35em` (extension-specific sizing not in vanilla) and `display: inline-flex` (vanilla uses `flex`; `inline-flex` keeps the buttons inline in the compact Move Book row).

**Current block:**
```css
.stwid--moveBookContent .stwid--moveBookQuickActions .menu_button {
  min-width: 2.35em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

**After:**
```css
/* override: vanilla menu_button uses block flex; inline-flex keeps buttons inline in the Move Book row */
.stwid--moveBookContent .stwid--moveBookQuickActions .menu_button {
  min-width: 2.35em; /* override: ensures icon-only buttons have a minimum click target */
  display: inline-flex; /* override: vanilla is display:flex (block-level); inline here for compact row */
}
```

**Steps:**
1. Remove `align-items: center;` from the rule body.
2. Remove `justify-content: center;` from the rule body.
3. Add the block-level comment immediately before the rule.
4. Add inline `/* override: ... */` comments after `min-width` and `display`.

**Reload check:** Open the Move Book modal. Quick-action buttons should still appear aligned and properly sized.

- [x] `align-items: center` removed
- [x] `justify-content: center` removed
- [x] Block-level override comment added
- [x] Inline comments added to `min-width` and `display`
- [ ] Browser reloaded â€” Move Book modal buttons unchanged

---

### 3b. Add override comments to editor-section vanilla-class rules

**What and why:** Eight rule blocks in the editor section target vanilla ST classes (`#wiCheckboxes`, `.world_entry`, `.world_entry_form`, `.inline-drawer`, `.inline-drawer-content`, `.world_entry_edit`, `.drag-handle`, `.inline-drawer-toggle`). All are intentional overrides required for the full-screen drawer layout. Adding a comment before each one makes the intent clear to future readers and records which vanilla default is being overridden.

**Comments to add (insert immediately before each matching rule block):**

| Line | Comment |
|------|---------|
| 714 | `/* override: vanilla #wiCheckboxes sets width:100%; unset here so it shrinks to content in the flex activation row */` |
| 719 | `/* focus mode: hides all WI entry controls except the content field and stwim-- micromenu elements */` |
| 754 | `/* override: vanilla sets no height; 100% forces these containers to fill the fixed-height drawer column */` |
| 760 | `/* override: vanilla inline-drawer uses block layout; drawer needs flex-column so the content area can scroll */` |
| 766 | `/* override: hide the vanilla drag handle and collapse toggle â€” the drawer provides no use for them */` |
| 771 | `/* override: !important required â€” vanilla sets display on .inline-drawer-content; flex-column needed for scrollable layout */` |
| 778 | `/* override: vanilla world_entry_edit has display:contents; replaced with flex-column so the entry form fills and scrolls inside the drawer */` |
| 793 | `/* override: hide the nested "User Settings" inline-drawer that appears inside the WI entry â€” not needed in the drawer UI */` |

**Note:** The `:nth-child(1)` rule at line 786 is left untouched â€” Step 4 will replace it with a stable class-based selector.

**Steps:**
1. Insert each comment from the table above immediately before the matching rule block.
2. Do not change any CSS property values â€” comments only.

**Reload check:** Open the drawer. Load an entry in the editor. Toggle Focus Mode on and off. All editor fields render correctly.

- [x] Comment added before `#wiCheckboxes` rule (line 714)
- [x] Comment added before focus-mode hide rule (line 719)
- [x] Comment added before height:100% group (line 754)
- [x] Comment added before `.inline-drawer` flex rule (line 760)
- [x] Comment added before `.drag-handle` / `.inline-drawer-toggle` hide (line 766)
- [x] Comment added before `.inline-drawer-content` flex rule (line 771)
- [x] Comment added before `.world_entry_edit` flex rule (line 778)
- [x] Comment added before nested `.inline-drawer` hide rule (line 793)
- [x] `:nth-child(1)` rule at line 786 left unchanged
- [ ] Browser reloaded â€” editor section looks identical to before

---

### 3c. Add override comments to remaining scattered vanilla-class rules

**What and why:** Four more rule blocks outside the editor section target vanilla classes. Same intent as 3b â€” make the overrides self-documenting.

**Comments to add:**

| Line | Block | Comment(s) |
|------|-------|------------|
| 156 | `.text_pole` in order controls | `/* override: vanilla text_pole uses fit-content height and inline display; compact controls row needs fixed height, tighter padding, and flex vertical alignment */` |
| 305 | `.fa-square-check` checkmark color | `/* note: no body.stwid-- scope guard â€” this selector is tightly scoped by the unique .stwid--multiselectDropdownOption class */` |
| 863 | `.text_pole` in Move Book dialog | `/* override: vanilla text_pole has width:100%; flex:1 1 auto allows proper row sharing with the quick-action buttons */` then on the next line: `/* note: no body.stwid-- scope guard â€” Move Book popup renders outside #WorldInfo */` |
| 1513 | `.checkbox` in recursion row | `/* override: FA icon checkbox defaults are too large for the compact recursion options row */` |

**Steps:**
1. Add the comment before the `.text_pole` rule at line 156.
2. Add the comment before the `.fa-square-check` rule at line 305.
3. Add the two-line comment block before the `.text_pole` Move Book rule at line 863.
4. Add the comment before the `.checkbox` rule at line 1513.

**Reload check:** Order controls text input displays correctly. Multiselect checkmark shows correct accent color. Move Book dialog text input stretches correctly. Order Helper recursion checkboxes are the right size.

- [x] Comment added before `.text_pole` rule (line 156)
- [x] Comment added before `.fa-square-check` rule (line 305)
- [x] Comment added before `.text_pole` Move Book rule (line 863)
- [x] Comment added before `.checkbox` rule (line 1513)
- [ ] Browser reloaded â€” all four areas look identical to before

---

### Step 3 Final Checks

- Agent note: code changes are applied; manual browser reload checks are still pending.
- [ ] All 3 sub-tasks complete and browser verified after each
- [x] Record new line count after Step 3: actual **1,694 lines** in `style.css`
- [ ] Full validation matrix pass:
  - [ ] List panel: controls row, filter row, chips, folder collapse/expand, book collapse/expand, entry selection/hover/disabled
  - [ ] Menus: multiselect dropdown open/close/select, context menu open/close/hover, Move Book modal
  - [ ] Editor: load entry, type in fields, switch entries, focus mode on/off
  - [ ] Order Helper: table renders, filter row controls align, column visibility toggle, row hover/select, drag handle visible
  - [ ] Theme: SmartTheme accent colors correct, focus rings visible on tab, no invisible buttons or text
- [ ] Confirm both pre-existing bugs are still present (not caused by this step):
  - [ ] Visibility dropdown does not close on outside click
  - [ ] Escape key closes the entire drawer instead of just an open menu

