# FEATURE REWORK: Standardize Dropdown Menu Families

## DESCRIPTION

### User Report
  > "Standardize dropdowns into two clear families. First, a multiselect dropdown used by Order Helper column visibility and filter menus; it must support top presets that are independent (not multiselect), rename the full `stwid--columnMenu` family to `stwid--multiselectDropdown`, and use Font Awesome square-style checkbox icons for clarity. Second, an independent action-list dropdown (not select/multiselect), and rename the full `stwid--menu` family to `stwid--listDropdown`, including future single-action list menus. Also document both dropdown styles in the style guide, document the default `stwid--visibilityChips`, close dropdowns on outside click, and enforce single-open behavior (opening one closes others)."

### Mental Map
1. The extension currently has two real UI menu behaviors but mixed naming: a dropdown with selectable options used in Book Visibility and Order Helper (`stwid--columnMenu` family), and contextual action menus for books/folders (`stwid--menu` family). The user sees this as inconsistent and wants naming to reflect behavior.
2. The multiselect behavior already exists in multiple places, but class names are tied to legacy wording (`columnMenu`) instead of intent. This makes styles and future maintenance harder because the same pattern appears as a “column” menu even when it is not about columns.
3. The Book Visibility dropdown in `src/listPanel.js` already supports two preset-style options (`All Books`, `All Active`) plus independent multi-select source options (`Global`, `Chat`, `Persona`, `Character`). The requested model keeps this behavior but formalizes it as a first-class “multiselect dropdown” pattern.
4. The preset rule is now explicit: presets must be top-of-list items and are not part of the multi-select checkbox set. In practice, presets act like one-click mode switches, while the remaining options are true multi-select toggles.
5. The user wants checkbox affordance clarity for multi-select options using Font Awesome square icons, not ambiguous visuals. The intent is immediate recognition that options can be selected in combination.
6. The user wants full-family renaming for consistency, not just one class. This means the naming contract should be coherent across trigger, container, option, and related sub-classes for both menu types.
7. The independent action menu family should represent any present and future action list menu surface (not only current book/folder menus). This is a design-system naming decision, not a one-off local rename.
8. Outside-click behavior must be standardized globally: if any dropdown is open and the user clicks elsewhere, it closes. This applies across panels and menu instances to avoid lingering open menus and mixed interaction rules.
9. The user also wants a global single-open interaction: opening one dropdown should close any other open dropdown. This keeps focus clear and prevents stacked open overlays.
10. Styling expectations are documentation-level too: both menu families and the default `stwid--visibilityChips` style need to be codified in `STYLE_GUIDE.md` so future UI work follows the same pattern.
11. This rework is extension-owned UI/controller behavior and stays within repository boundaries (no changes under `/vendor/SillyTavern`), preserving SillyTavern ownership of data truth/persistence while standardizing extension presentation and interaction semantics.

## PLAN

### Goal
Standardize all extension dropdowns into two explicit UI families (multiselect dropdowns and action-list dropdowns), replace legacy class-family naming end-to-end, preserve existing filter/action semantics, and make menu interaction consistent (outside-click close + single-open across multiselect dropdown instances), while documenting the final CSS contract in `STYLE_GUIDE.md`.

### Extension Modules
- `src/listPanel.js`
  - `setupFilter()` owns Book Visibility dropdown creation (`menuWrap`, trigger, menu, option rows), `closeBookVisibilityMenu()`, outside-click handler, and checkbox/preset option behavior.
  - `applyActiveFilter()` owns active-state syncing for option rows and checkbox-icon state (`.stwid--multiselectDropdownOptionCheckbox`).
  - Book context-menu creation block (`stwid--listDropdownTrigger` -> blocker -> `.stwid--listDropdownMenu`/`.stwid--listDropdownItem`) owns action-list dropdown behavior for books.
- `src/orderHelperRender.js`
  - Owns all multiselect dropdown instances used by Column Visibility and table-header filter menus (strategy/position/recursion/outlet/group/automation ID).
  - Each block currently defines local `closeMenu`/`openMenu` and `document` outside-click wiring; this is the main surface for single-open standardization.
- `src/lorebookFolders.js`
  - `createFolderDom()` owns folder action-list dropdown markup/close behavior via blocker + `.stwid--listDropdownMenu`/`.stwid--listDropdownItem`.
- `style.css`
  - Owns selectors for `stwid--multiselectDropdown*` (list panel + order helper) and `stwid--listDropdown*` (book/folder action menus).
  - Owns shared interaction selectors including `.stwid--multiselectDropdownButton` and option styling tied to `.stwid--multiselectDropdownOption*`.
  - Owns the existing default `stwid--visibilityChips` style contract that must be documented (not redesigned).
- `STYLE_GUIDE.md`
  - Must document the two dropdown families, class naming intent, when to use each family, and the default `stwid--visibilityChips` usage.

### ST Context
- `vendor/SillyTavern/public/scripts/st-context.js` exposes `eventSource`, `eventTypes` and legacy `event_types`; this rework does not add/remove event-bus wiring because dropdown behavior is extension-local DOM interaction.
- `st-context` also exposes `Popup`/`callGenericPopup` and extension settings APIs, but no new persistence/state API is needed for this UI-class/interaction standardization.
- Host runtime already provides Font Awesome icon classes; multiselect option state will use square/check-square icon variants from this existing icon system (no dependency additions).
- Existing extension globals/integrations (`$`, `toastr`, `hljs`) remain unchanged.

### Decision Points
- Class-family mapping contract:
  - `stwid--columnMenu*` family -> `stwid--multiselectDropdown*` family.
  - `stwid--menu*` family -> `stwid--listDropdown*` family.
  - Apply full-family rename across trigger/wrap/menu/item/option/icon helpers and selector queries, not partial aliases.
- Preset row semantics in multiselect menus:
  - `All Books` and `All Active` remain top, exclusive preset actions.
  - `Global/Chat/Persona/Character` remain combinable multiselect rows.
  - Presets do not render multiselect checkbox icons.
- Multiselect visual affordance:
  - Replace native tiny checkbox visibility cues with explicit Font Awesome square/check-square icons for multiselect rows.
  - Keep accessibility state updates (`aria-pressed`) and existing selection logic unchanged.
- Single-open behavior scope:
  - Enforce for all open `.stwid--multiselectDropdownMenu.stwid--active` menus across list panel and order helper.
  - Opening one multiselect dropdown closes other active multiselect dropdown menus first.
  - Blocker-based list dropdowns already enforce one-open-at-a-time naturally and should keep current close path.
- Outside-click behavior scope:
  - Keep existing outside-click close behavior and ensure renamed selectors still match.
  - Prevent internal menu interactions from being mistaken for outside clicks.

### Evidence-based fix
1. In `src/listPanel.js`, rename Book Visibility dropdown classes (`Wrap`, trigger, menu, options, option icon/checkbox helpers) from `columnMenu` naming to `multiselectDropdown` naming, and update any `.querySelector(All)` usage accordingly.
2. In `src/listPanel.js`, keep `closeBookVisibilityMenu()` and `applyActiveFilter()` logic intact while changing only class references and option-row icon rendering for multiselect entries.
3. In `src/orderHelperRender.js`, rename all dropdown class usage in:
   - actions-row Column Visibility menu, and
   - each table-header filter dropdown block.
   Keep existing filter update logic, only migrate class names and open/close selector targets.
4. In `src/orderHelperRender.js`, add one minimal shared close-other-open-multiselect step reused by existing `openMenu()` calls so opening one dropdown closes any other active multiselect dropdown first.
5. In `src/listPanel.js` and `src/lorebookFolders.js`, rename action menu family classes (`menuTrigger`, `menu`, `item`) to `listDropdown` equivalents while preserving blocker/anchor close mechanics.
6. In `style.css`, migrate selector families:
   - Book Visibility + Order Helper multiselect selectors from `stwid--columnMenu*` to `stwid--multiselectDropdown*`.
   - Context/action menu selectors under `.stwid--blocker` from `.stwid--menu`/`.stwid--item` to `.stwid--listDropdownMenu`/`.stwid--listDropdownItem`.
   Preserve visual tokens, spacing, focus ring, and hover behavior.
7. In `STYLE_GUIDE.md`, add explicit sections for:
   - `stwid--multiselectDropdown*` family usage and preset-vs-multiselect row semantics.
   - `stwid--listDropdown*` family usage for action lists.
   - default `stwid--visibilityChips` layout/intent contract (chips summarize active visibility state beside the trigger).

### Risks/cons
1. Missing one rename in repeated `orderHelperRender.js` dropdown blocks can leave a subset of filter menus unstyled or non-closing.
2. A broad "close others" selector can close the currently opening menu if exclusion logic is wrong, causing click-flicker behavior.
3. If Font Awesome icon state updates diverge from the selected state in `applyActiveFilter()`, users can see stale check visuals despite correct filtering.

## TASK CHECKLIST
  Smallest Change Set Checklist:
- [x] In `src/listPanel.js`, rename Book Visibility dropdown classes from `stwid--columnMenu*` to `stwid--multiselectDropdown*` in both DOM creation and `querySelectorAll('.stwid--columnOption')` update paths.
- [x] In `src/listPanel.js`, keep `All Books`/`All Active` as preset rows and render Font Awesome square/check-square indicators only for `BOOK_VISIBILITY_MULTISELECT_MODES`.
- [x] In `src/orderHelperRender.js`, rename actions-row Column Visibility dropdown classes (`Wrap`, `Button`, `Menu`) and corresponding option classes.
- [x] In `src/orderHelperRender.js`, rename all table-header filter dropdown classes (`strategy`, `position`, `recursion`, `outlet`, `group`, `automationId`) from `columnMenu` naming to `multiselectDropdown` naming.
- [x] In `src/orderHelperRender.js`, add a shared close-other-open-multiselect call inside each existing `openMenu()` path to enforce single-open behavior.
- [x] In `src/listPanel.js`, rename book action menu classes from `stwid--menuTrigger`/`stwid--menu`/`stwid--item` to `stwid--listDropdownTrigger`/`stwid--listDropdownMenu`/`stwid--listDropdownItem`.
- [x] In `src/lorebookFolders.js`, rename folder action menu classes from `stwid--menuTrigger`/`stwid--menu`/`stwid--item` to `stwid--listDropdownTrigger`/`stwid--listDropdownMenu`/`stwid--listDropdownItem`.
- [x] In `style.css`, migrate all selectors referencing `stwid--columnMenu*` and `stwid--menu*` to the new family names, including shared focus selectors and `.stwid--blocker` menu rules.
- [x] In `STYLE_GUIDE.md`, document when to use `stwid--multiselectDropdown*` vs `stwid--listDropdown*` and include default `stwid--visibilityChips` behavior/placement guidance.

## AFTER IMPLEMENTATION

### What changed
- `src/listPanel.js`
  - Renamed Book Visibility dropdown classes to the `stwid--multiselectDropdown*` family.
  - Renamed book action menu classes to the `stwid--listDropdown*` family.
  - Added Font Awesome square/check-square multiselect indicators and single-open coordination for multiselect dropdowns.
- `src/orderHelperRender.js`
  - Renamed Order Helper dropdown classes to `stwid--multiselectDropdown*` across column visibility and header filter menus.
  - Added shared single-open behavior so opening one multiselect dropdown closes others.
  - Added Font Awesome square/check-square indicators to Order Helper multiselect options.
- `style.css`
  - Migrated dropdown/menu selectors from legacy `stwid--columnMenu*` / `stwid--menu*` names to new family names.
  - Updated multiselect checkbox styling to support icon-based indicators.
  - Updated shared focus/interaction selectors to include new dropdown family classes.
- `STYLE_GUIDE.md`
  - Added explicit usage contracts for `stwid--multiselectDropdown*` and `stwid--listDropdown*`.
  - Documented the default `stwid--visibilityChips` behavior and placement contract.

### Risks/What might break
- This touches dropdown open/close wiring, so one menu could close unexpectedly if a menu instance misses the shared close callback.
- This touches menu class selectors, so any missed selector/class in a niche menu path could appear unstyled.
- This touches multiselect check affordance rendering, so icon state could become out of sync if future code updates checked state without running the shared sync path.

### Manual checks
- Open Book Visibility, then open any Order Helper filter dropdown; confirm the first dropdown closes immediately.
  - Success looks like: only one multiselect dropdown is open at a time.
- Click outside an open Book Visibility dropdown and outside an open Order Helper dropdown.
  - Success looks like: each dropdown closes on outside click.
- In Book Visibility, toggle `Global/Chat/Persona/Character`; confirm square/check-square icons update and filter behavior stays correct.
  - Success looks like: icon state and visible book list stay in sync.
- In Order Helper Column Visibility and one header filter menu, toggle multiple options.
  - Success looks like: square/check-square icons update correctly and table/filter behavior still applies.
- Open book and folder action menus (three-dot menus) and trigger a few actions (rename/export/open helper).
  - Success looks like: menus render/close normally and action items still fire.
