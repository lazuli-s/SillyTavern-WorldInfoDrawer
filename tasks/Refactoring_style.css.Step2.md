# Refactoring style.css — Step 2: CSS-only dedup pass (behavior-preserving)

> **Goal:** Group identical CSS declarations that appear in multiple places into shared selector blocks. No visual output changes — everything should look identical before and after. Work through one sub-task at a time and reload the browser after each to confirm nothing broke.

> **Line numbers** reference the original baseline (1,729 lines) from Step 1. They will shift after each sub-task is applied.

> **Where to place new shared-pattern groups:** Sub-tasks 2a and 2b create rules that span two different file sections. They go into a new named block inserted between Section 1 (Drawer) and Section 2 (List Panel), labelled `/* 1.5) Shared layout shells */`. Sub-tasks 2c, 2e, and 2f group rules that are already within the same section — those stay in-place using a comma-separated selector list. Sub-task 2d extends the existing consolidated focus block that already exists in Section 5.

---

### 2a. Shell layout group — editor panel + order helper root

**What and why:** Two components use the exact same 6-property flex-column shell. Declaring them once in a shared rule removes the duplication and makes the pattern explicit.

**Selectors being grouped:**
- `body.stwid-- #WorldInfo .stwid--editor` (line 717) — `flex:1 1 auto; display:flex; flex-direction:column; overflow:hidden; min-width:0; min-height:0`
- `.stwid--orderHelper` (line 994) — identical 6 properties (different order in source)

**Steps:**
1. Insert a new shared section block between Section 1 and Section 2 (after line 93):
   ```
   /* 1.5) Shared layout shells                                               */
   ```
2. Inside that block, add a grouped rule:
   ```css
   /* Flex-column fill shell — grows to fill parent, scrolls internally */
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
3. In the original `.stwid--editor` rule (line 717): remove those 6 properties. The rule body becomes empty — remove the empty rule block entirely; keep the section header comment above it.
4. In the original `.stwid--orderHelper` rule (line 994): same — remove the 6 properties, delete the now-empty rule block.

**What NOT to group:** `.stwid--list` (line 100) looks similar but uses `flex:0 0 auto` (fixed width) — different. `.stwid--body` (line 69) is missing `flex-direction:column` — different. Do not touch these.

**Reload check:** Drawer layout, editor panel height, and Order Helper table all render identically to before.

- [ ] New shared section header added
- [ ] Grouped rule created with both selectors
- [ ] 6 properties removed from `.stwid--editor` rule; empty rule removed
- [ ] 6 properties removed from `.stwid--orderHelper` rule; empty rule removed
- [ ] Browser reloaded — no visual change

---

### 2b. Scroll wrapper group — book list + order table wrap

**What and why:** Two scrollable containers share the same 3-property scroll-wrapper pattern. They go in the same new shared section from 2a.

**Selectors being grouped:**
- `body.stwid-- #WorldInfo .stwid--list .stwid--books` (line 331) — `flex:1 1 auto; overflow:auto; min-height:0`
- `.stwid--orderTableWrap` (line 1401) — `flex:1 1 auto; min-height:0; overflow:auto` (same 3 properties, different order)

**Steps:**
1. In the shared section created in 2a, add a second grouped rule after the shell layout rule:
   ```css
   /* Scrollable fill wrapper — grows to fill remaining height, scrolls */
   body.stwid-- #WorldInfo .stwid--list .stwid--books,
   .stwid--orderTableWrap {
     flex: 1 1 auto;
     min-height: 0;
     overflow: auto;
   }
   ```
2. From `.stwid--books` (line 331): remove `flex:1 1 auto`, `overflow:auto`, `min-height:0`. The rule body becomes empty — remove the empty rule; keep the `/* Scrollable book list */` comment above it pointing to the shared section.
3. From `.stwid--orderTableWrap` (line 1401): same — remove the 3 properties, delete the now-empty rule.

**Reload check:** The book list scrolls correctly when there are many books. The Order Helper table scrolls correctly when there are many rows.

- [ ] Grouped rule added to shared section
- [ ] 3 properties removed from `.stwid--books`; empty rule removed
- [ ] 3 properties removed from `.stwid--orderTableWrap`; empty rule removed
- [ ] Browser reloaded — list and table both still scroll

---

### 2c. Action icon affordance group — folder header actions + book head actions

**What and why:** The small icon buttons (context menu trigger, delete, etc.) on folder headers and book headers share the same three interaction properties: `cursor:pointer; opacity:0.5; transition:200ms` with a hover that brings opacity back to 1. The folder version additionally sets `padding:0` (which the book version does not). These can be partially grouped.

**Selectors being grouped:**
- Folder: `body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--folder .stwid--folderHeader .stwid--actions .stwid--action` (line 419)
  - Properties: `cursor:pointer; opacity:0.5; transition:200ms; padding:0`
- Book: `body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book .stwid--head .stwid--actions .stwid--action` (line 503, spread over multiple lines)
  - Properties: `cursor:pointer; opacity:0.5; transition:200ms` (note: the source has a double-space typo: `opacity:  0.5`)
- Folder hover: line 426 — `opacity:1`
- Book hover: line 516 — `opacity:1`

**Steps:**
1. Replace the two separate base rules (folder action line 419 and book action line 503) with a single grouped selector rule. Place it in-line just before the folder section comment (stays in Section 2):
   ```css
   /* Action icon affordance — dim until hovered */
   body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--folder .stwid--folderHeader .stwid--actions .stwid--action,
   body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book .stwid--head .stwid--actions .stwid--action {
     cursor: pointer;
     opacity: 0.5;
     transition: 200ms;
   }
   ```
2. Keep the folder action rule (line 419) but reduce it to only `padding:0` — the 3 shared properties are now in the group above. Add a comment: `/* Folder actions also need zero padding (book actions do not) */`
3. Delete the original book action rule (line 503) entirely — all its properties are now covered by the grouped rule.
4. Merge the two hover rules (folder line 426 and book line 516) into one grouped hover rule directly after the shared base rule:
   ```css
   body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--folder .stwid--folderHeader .stwid--actions .stwid--action:hover,
   body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book .stwid--head .stwid--actions .stwid--action:hover {
     opacity: 1;
   }
   ```
5. Delete the original folder hover rule (line 426) and book hover rule (line 516).
6. The double-space typo (`opacity:  0.5`) is fixed by the rewrite in step 1.

**Reload check:** Hover over folder action icons — opacity fades in correctly. Hover over book action icons — same. Folder actions still have no extra padding. Book actions remain unchanged visually.

- [ ] Shared base rule created with both selectors
- [ ] Folder action rule reduced to `padding:0` only
- [ ] Book action rule deleted entirely
- [ ] Shared hover rule created with both selectors
- [ ] Original folder hover rule deleted
- [ ] Original book hover rule deleted
- [ ] Browser reloaded — both icon hover effects unchanged

---

### 2d. Focus outline consolidation

**What and why:** `outline: var(--stwid-focus-ring)` appears 5 times across the file. A partially consolidated block already exists at line 863–866. The goal is to pull two more orphan rules into that block.

**All current instances (before this sub-task):**

| Line | Selector summary | Offset value | Extra properties |
|---|---|---|---|
| 262 | `.stwid--multiselectDropdownOption:focus-visible` | `1px` | — |
| 431 | `.stwid--folder :is(.stwid--folderActiveToggle, .stwid--action):focus-visible` | `var(--stwid-focus-ring-offset)` | `opacity:1` |
| 864 | `:is(.stwid--action, .stwid--folderAction, .stwid--folderMenu, .stwid--folderToggle, .stwid--orderFilterButton):focus-visible` | `var(--stwid-focus-ring-offset)` | — |
| 951 | `.stwid--listDropdownItem:focus-visible` | `var(--stwid-focus-ring-offset)` | — |
| 1617 | `.stwid--orderMoveButton`, `.stwid--sortableHandle`, `.stwid--orderSelect` `:focus-visible` | `1px` | `opacity:1` |

**Rules for what can be merged into the existing block at line 863:**
- Only rules with `outline-offset: var(--stwid-focus-ring-offset)` and **no extra properties** can be merged cleanly.
- Rules with `opacity:1` (lines 431 and 1617) stay separate — they have extra context-specific behavior.
- Line 262 uses `1px` instead of the token — standardize it to the token and then it can be merged.

**Steps:**
1. Extend the existing consolidated block at line 863 to add two more selectors:
   ```css
   body.stwid-- #WorldInfo :is(.stwid--action, .stwid--folderAction, .stwid--folderMenu, .stwid--folderToggle, .stwid--orderFilterButton):focus-visible,
   body.stwid-- #WorldInfo .stwid--multiselectDropdownOption:focus-visible,
   .stwid--blocker .stwid--listDropdownItem:focus-visible {
     outline: var(--stwid-focus-ring);
     outline-offset: var(--stwid-focus-ring-offset);
   }
   ```
2. Delete the now-redundant standalone `.stwid--multiselectDropdownOption:focus-visible` rule at line 261–264.
3. Delete the now-redundant standalone `.stwid--listDropdownItem:focus-visible` rule at lines 950–952.
4. Leave line 431 (folder active toggle + action with `opacity:1`) and lines 1614–1619 (order table controls with `opacity:1`) exactly as they are — they are not duplicates.

**Note on the `1px` vs token change:** The multiselect dropdown option focus offset changes from `1px` to `2px` (the value of `--stwid-focus-ring-offset`). This is a cosmetic sub-pixel difference. Confirm it still looks correct in the browser after reload.

**Reload check:** Tab through the UI. All of the following must show a visible focus ring: multiselect dropdown options, context menu items, folder action icons, folder toggle, order filter buttons, and order table controls.

- [ ] Consolidated block at line 863 extended with 2 new selectors
- [ ] Standalone `.stwid--multiselectDropdownOption:focus-visible` rule removed
- [ ] Standalone `.stwid--listDropdownItem:focus-visible` rule removed
- [ ] Lines 431 and 1614–1619 left unchanged
- [ ] Browser reloaded — all focus rings still visible when tabbing

---

### 2e. Entry text truncation merge

**What and why:** Both the comment line and the key line inside an entry row use the same 4-property truncation stack. Only the typography differs (key adds color, font-size, and font-style). These can be declared once and the differences kept as a minimal override.

**Selectors being grouped:**
- `... .stwid--body .stwid--comment` (line 638): `height:1lh; overflow:hidden; text-overflow:ellipsis; white-space:nowrap`
- `... .stwid--body .stwid--key` (line 652): same 4 properties **plus** `color:var(--SmartThemeEmColor); font-size:smaller; font-style:italic`

**Steps:**
1. Replace the `.stwid--comment` rule with a grouped rule that covers both selectors (place it where the `.stwid--comment` rule is now):
   ```css
   /* Entry text truncation — one line, ellipsis if overflow */
   body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book .stwid--entry .stwid--body .stwid--comment,
   body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book .stwid--entry .stwid--body .stwid--key {
     height: 1lh;
     overflow: hidden;
     text-overflow: ellipsis;
     white-space: nowrap;
   }
   ```
2. Directly after the grouped rule, place the `.stwid--key` override with only the 3 unique typography properties:
   ```css
   body.stwid-- #WorldInfo .stwid--list .stwid--books .stwid--book .stwid--entry .stwid--body .stwid--key {
     color: var(--SmartThemeEmColor);
     font-size: smaller;
     font-style: italic;
   }
   ```
3. Delete the original standalone `.stwid--key` rule (line 652) — it has been split into the grouped rule above plus the override above.

**Reload check:** Long comment text in the entry list truncates with an ellipsis. Long key text also truncates, and key text is still italic, smaller, and muted in color.

- [ ] Grouped truncation rule created (both selectors)
- [ ] `.stwid--key` override rule created (3 typography properties only)
- [ ] Original `.stwid--key` standalone rule removed
- [ ] Browser reloaded — truncation and key typography unchanged

---

### 2f. inputWrap / columnVisibility group (Order Helper filter row)

**What and why:** Two adjacent controls in the Order Helper filter row share 5 of the same declarations. Only `position:relative` is unique to one of them.

**Selectors being grouped:**
- `.stwid--orderHelper .stwid--visibilityRow .stwid--inputWrap` (line 1090): `display:flex; align-items:center; gap:0.5em; color:var(--SmartThemeEmColor); font-size:smaller`
- `.stwid--orderHelper .stwid--visibilityRow .stwid--columnVisibility` (line 1098): same 5 **plus** `position:relative`

**Steps:**
1. Replace the `.stwid--inputWrap` rule with a grouped rule covering both (keep it where the `.stwid--inputWrap` rule currently is):
   ```css
   .stwid--orderHelper .stwid--visibilityRow .stwid--inputWrap,
   .stwid--orderHelper .stwid--visibilityRow .stwid--columnVisibility {
     display: flex;
     align-items: center;
     gap: 0.5em;
     color: var(--SmartThemeEmColor);
     font-size: smaller;
   }
   ```
2. Reduce the original `.stwid--columnVisibility` rule (line 1098) to only `position:relative` — the other 5 properties are now in the grouped rule above.

**Reload check:** Open the Order Helper. The filter row (with input controls and the column visibility button) still displays and aligns correctly.

- [ ] Grouped rule created for both selectors
- [ ] `.stwid--columnVisibility` rule reduced to `position:relative` only
- [ ] Browser reloaded — Order Helper filter row unchanged

---

### Step 2 Final Checks

- [ ] All 6 sub-tasks complete and browser verified after each
- [ ] Record new line count after Step 2: **___ lines** (was 1,729 at baseline)
- [ ] Full validation matrix pass:
  - [ ] List panel: controls row, filter row, chips, folder collapse/expand, book collapse/expand, entry selection/hover/disabled
  - [ ] Menus: multiselect dropdown open/close/select, context menu open/close/hover, Move Book modal
  - [ ] Editor: load entry, type in fields, switch entries, focus mode on/off
  - [ ] Order Helper: table renders, filter row controls align, column visibility toggle, row hover/select, drag handle visible
  - [ ] Theme: SmartTheme accent colors correct, focus rings visible on tab, no invisible buttons or text
- [ ] Confirm both pre-existing bugs are still present (not caused by this step):
  - [ ] Visibility dropdown does not close on outside click
  - [ ] Escape key closes the entire drawer instead of just an open menu
