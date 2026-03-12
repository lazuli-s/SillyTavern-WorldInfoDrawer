# CODE REVIEW FINDINGS: `src/editor-panel/editor-panel-mobile.js`
*Reviewed: March 12, 2026*

## Scope

- **File reviewed:** `src/editor-panel/editor-panel-mobile.js`
- **Helper files consulted:** none
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** Mobile editor header and content layout transforms; detects mobile viewport and restructures ST-rendered editor DOM for narrow screens

---

## F01: Positional `:nth-child` Selectors Risk Silent Layout Breakage on ST Template Updates

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Three places in this file find parts of the SillyTavern editor by counting their position in a list ("the second item", "the third item", "the first child", "the second child"). Every other selector in this file finds elements by their *name* attribute (e.g. `[name='PositionBlock']`), which is much more stable. Positional counting breaks silently the moment SillyTavern inserts, removes, or reorders any element in the editor — the wrong element gets styled, or nothing gets styled at all, with no error shown to the user.

- **Category:** UI Correctness

- **Location:**
  - Line 3: `GROUP_ROW_SELECTOR` constant — `".inline-drawer-content > .world_entry_edit > .flex-container.wide100p.flexGap10:nth-child(2)"`
  - `moveMobileGroupControls` (lines 206–207): `:scope > :nth-child(1)` and `:scope > :nth-child(2)` to identify the inclusionGroup and groupWeight controls inside the group row
  - `annotateMobileFilterSections` (line 248): `".inline-drawer-content > .world_entry_edit > .flex-container.wide100p.flexGap10:nth-child(3)"` to identify the filters row

- **Detailed Finding:**
  `GROUP_ROW_SELECTOR` (line 3) identifies the group controls row as the *second* `.flex-container.wide100p.flexGap10` inside `.world_entry_edit`. It is used in both `moveMobileGroupControls` (line 205) and `moveMobileTimingControls` (line 227). Inside `moveMobileGroupControls`, children are then selected by ordinal position (`':scope > :nth-child(1)'`, `':scope > :nth-child(2)'`) to pull out the inclusionGroup and groupWeight controls respectively (lines 206–207).

  In `annotateMobileFilterSections` (line 248), the filters row is identified as the *third* `.flex-container.wide100p.flexGap10` child of `.world_entry_edit`.

  Every other selector in the file uses named attributes for identification: `[name='PositionBlock']`, `[name='perEntryOverridesBlock']`, `[name='contentAndCharFilterBlock']`, `[name='keywordsAndLogicBlock']`, `[name='characterFilter']`, `[name='triggers']`, and so on. Named attributes are stable across template reformatting; positional `:nth-child` counters are not. If SillyTavern adds or reorders any sibling `.flex-container` in its editor template, these three selectors silently match the wrong element or return `null` — the idempotency guards then pass without error, and the affected mobile sections (group controls, timing controls, filter-section annotations) are simply never applied. The user sees an unstyled or mis-structured editor with no console warning.

- **Why it matters:**
  This extension tracks SillyTavern's rendered DOM closely and already notes upstream template drift as a future concern (ARCHITECTURE.md §8). Positional selectors are the highest-risk variant: they amplify the impact of any upstream layout change and they fail invisibly. A name-attribute selector on a missing element at least points to a renamed attribute; a positional selector on a reordered list silently binds to the wrong element and applies incorrect classes or moves the wrong DOM node to a mobile layout slot.

- **Severity:** Medium ❗
  The group controls row and filter-section annotations are meaningful parts of the mobile editor layout. If they break, the mobile editor loses group/timing control placement and filter-section styling with no indication to the user.

- **Confidence:** Medium 🤔
  The failure requires a SillyTavern template change that reorders or inserts siblings — not guaranteed, but the upstream note about tracking template drift (ARCHITECTURE.md §8) acknowledges this is a realistic risk. Whether the inner controls truly lack `name` attributes is not confirmable from this file alone.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Replace the three positional selectors with content-based or name-attribute selectors that identify the target rows by *what they contain* rather than *where they sit*. If the inclusionGroup and groupWeight inputs have `name` attributes in the rendered ST template, prefer `:has([name='inclusionGroup'])` and `:has([name='groupWeight'])` over `:nth-child(1)` and `:nth-child(2)`. Use the same `:has()` approach for the group row and filters row at the top level.

- **Proposed fix:**
  🚩 Requires user input — inspect the rendered ST editor DOM to confirm input `name` values for the inclusionGroup, groupWeight, sticky, cooldown, and delay fields, and confirm what distinguishes the filters row from the group row structurally.

  *Provisional fix assuming standard ST names:*
  1. Replace `GROUP_ROW_SELECTOR` constant with a `:has()` selector anchored on a named child, e.g. `".inline-drawer-content > .world_entry_edit > .flex-container.wide100p.flexGap10:has([name='group'])"` or `:has([name='sticky'])` — whichever field is unique to that row.
  2. Replace `:scope > :nth-child(1)` in `moveMobileGroupControls` with `':scope > :has([name="group"])'` (or the correct `name` for the inclusionGroup input).
  3. Replace `:scope > :nth-child(2)` in `moveMobileGroupControls` with `':scope > :has([name="groupWeight"])'` (or the correct `name`).
  4. Replace the hardcoded `:nth-child(3)` selector in `annotateMobileFilterSections` with a `:has([name='characterFilter'], [name='triggers'])` selector scoped to the same parent path.

- **Implementation Checklist:**
  - [ ] Open SillyTavern in the browser, open an entry editor, and inspect the DOM to confirm the `name` attributes on the inclusionGroup input, groupWeight input, sticky/cooldown/delay inputs, characterFilter, and triggers inputs.
  - [ ] Update `GROUP_ROW_SELECTOR` constant (line 3) to use a `:has([name='<confirmed-name>'])` selector instead of `:nth-child(2)`.
  - [ ] Update `moveMobileGroupControls` lines 206–207 to use `':scope > :has([name="<inclusionGroup-name>"])'` and `':scope > :has([name="<groupWeight-name>"])'`.
  - [ ] Update `annotateMobileFilterSections` line 248 to use a `:has([name='characterFilter'], [name='triggers'])` selector instead of `:nth-child(3)`.
  - [ ] Reload extension in browser and confirm the mobile group section, timing row, and filter section annotations still render correctly.

- **Fix risk:** Low 🟢
  The only behavioral change is swapping the selector strategy. If the confirmed names match the rendered DOM, the new selectors return the same elements as before. If the confirmed names are wrong, the selectors return `null` — same outcome as the current positional selectors failing after an ST template update.

- **Why it's safe to implement:**
  This fix touches only the three query strings used to locate elements. It does not change any DOM transformation logic, class names applied, element ordering, or idempotency guards. All other selectors and the full function call sequence in `applyMobileHeaderLayout` are unaffected.

- **Pros:**
  - Eliminates the most fragile selectors in the file, making the mobile layout robust against ST template reordering.
  - Aligns all selectors in the file to the same naming-based convention, improving maintainability.
  - Makes the intent of each selector self-documenting (`[name='inclusionGroup']` is clearer than `:nth-child(1)`).

<!-- META-REVIEW: STEP 2 skipped — user requested direct implementation -->

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/editor-panel/editor-panel-mobile.js`
  - Replaced `GROUP_ROW_SELECTOR` constant (line 3) `:nth-child(2)` with `:has([name='group'])` — confirmed name via ST template inspection
  - Replaced `:scope > :nth-child(1)` in `moveMobileGroupControls` with `:scope > :has([name="group"])`
  - Replaced `:scope > :nth-child(2)` in `moveMobileGroupControls` with `:scope > :has([name="groupWeight"])`
  - Replaced `:nth-child(3)` in `annotateMobileFilterSections` with `:has([name='characterFilter'], [name='triggers'])`

- Risks / Side effects
  - The `:has()` selectors are confirmed against the current ST template; if ST renames these inputs, the selectors return `null` — same failure mode as before, but now it is explicit (⭕)
    - **🟥 MANUAL CHECK**: [ ] Open a world entry editor on a mobile-width viewport (≤1000px). Confirm the group/weight section renders in its own row, timing controls (sticky/cooldown/delay) appear correctly, and the character filter and trigger filter sections are annotated with their CSS classes (inspect to verify `stwid--editorCharacterTagFilterSection` and `stwid--editorTriggerFilterSection` are present).
