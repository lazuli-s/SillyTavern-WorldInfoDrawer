# NEW FEATURE: Surface Additional Matching Sources in Entry Editor
*Created: February 27, 2026*

**Type:** NEW_FEATURE
**Status:** IMPLEMENTED

---

## Summary

The "Additional Matching Sources" section lets you tell a World Info entry to scan extra
character fields — Character Description, Character Personality, Scenario, Persona Description,
Character's Note, and Creator's Notes — in addition to the normal chat history. This feature
already exists in vanilla SillyTavern's entry editor, but the extension's CSS deliberately hides
it. This task removes that hide and fixes the layout so those 6 checkboxes become visible and
functional inside the extension's editor.

## Current Behavior

When the user opens an entry in the extension's editor, the "Additional Matching Sources"
section — with its 6 checkboxes — does not appear at all. The section is rendered by the vanilla
SillyTavern template (`addEditorDrawerContent` inside `getWorldEntry`) but is then hidden by a
CSS `display: none` rule in `style.css`. The comment in the code says it was "not needed in the
drawer UI," which was an intentional decision at the time.

## Expected Behavior

After this change, when the user opens any entry in the extension's editor, the 6 checkboxes for
Additional Matching Sources are visible and usable. Checking or unchecking them immediately saves
the change (same as all other entry fields — this is handled by the existing vanilla
`handleMatchCheckboxHelper` function, which is already wired up by `getWorldEntry`). No JavaScript
changes are needed; only CSS needs to change.

The section will appear as a static, always-visible section with a non-interactive "Additional
Matching Sources" label, consistent with the extension's existing editor layout (all inner drawer
toggles are already hidden globally in the extension's CSS — so the section renders as a flat
labeled block, not a collapsible panel).

## Root Cause

In `style.css`, line 1041:
```css
/* override: hide the nested "User Settings" inline-drawer that appears inside the WI entry - not needed in the drawer UI */
.stwid--editor .inline-drawer-content > .world_entry_edit .inline-drawer:has(> .userSettingsInnerExpandable) {
  display: none;
}
```
This rule precisely matches and hides the "Additional Matching Sources" drawer (it is the only
`.inline-drawer:has(> .userSettingsInnerExpandable)` element inside `.world_entry_edit`).

## Agreed Scope

**Owning file:** `style.css` — all changes are CSS-only.

No JavaScript changes are needed. The data is already saved and loaded correctly by
`getWorldEntry` / `handleMatchCheckboxHelper` in vanilla SillyTavern's `world-info.js`.
No changes to `ARCHITECTURE.md` are needed. `FEATURE_MAP.md` must be updated to document the
newly surfaced editor behavior.

## Out of Scope

- Making the section collapsible (requires a larger CSS refactor of the global inline-drawer
  system; the extension globally hides all `.inline-drawer-toggle` elements and forces all
  `.inline-drawer-content` to `display: flex !important` — proper collapse/expand behavior
  conflicts with that architecture). A follow-up task can address this if desired.

---

## Implementation Plan

- [x] Step 1 — Remove the CSS hide rule (`style.css`)

Remove these 4 lines from `style.css` entirely:

```css
/* override: hide the nested "User Settings" inline-drawer that appears inside the WI entry - not needed in the drawer UI */
.stwid--editor .inline-drawer-content > .world_entry_edit .inline-drawer:has(> .userSettingsInnerExpandable) {
  display: none;
}
```

- [x] Step 2 — Fix layout of the inner drawer container (`style.css`)

The global rule `.stwid--editor .inline-drawer { height: 100%; }` would cause the inner
"Additional Matching Sources" drawer to try to fill its parent height. Add a targeted override
in `style.css` — place it directly after the block that removes the hide rule (or near the
adjacent inner-drawer CSS overrides):

```css
/* override: inner section drawers inside world_entry_edit use natural height, not full-height fill */
.stwid--editor .inline-drawer-content > .world_entry_edit .inline-drawer {
  height: auto;
  flex-shrink: 0;
}

/* override: inner drawer content area uses natural sizing (not the flex-fill rule above) */
.stwid--editor .inline-drawer-content > .world_entry_edit .inline-drawer > .inline-drawer-content {
  flex: none;
}
```

- [x] Step 3 — Show "Additional Matching Sources" as a non-interactive section label (`style.css`)

The extension globally hides `.stwid--editor .inline-drawer-toggle { display: none; }`.
The toggle div contains the "Additional Matching Sources" label text. Add a targeted override to
show this label as a static section header (non-interactive — no collapse behavior):

```css
/* override: show the inner section header label as non-interactive text (toggle button stays hidden for the outer entry card) */
.stwid--editor .inline-drawer-content > .world_entry_edit .inline-drawer > .inline-drawer-toggle {
  display: flex;
  pointer-events: none;
  cursor: default;
}

/* hide the chevron icon — collapsing is not supported in this layout */
.stwid--editor .inline-drawer-content > .world_entry_edit .inline-drawer > .inline-drawer-toggle > .inline-drawer-icon {
  display: none;
}
```

- [x] Step 4 — Update `FEATURE_MAP.md`

In the `## Editor behavior` section, add a new line:

```
- Additional Matching Sources checkboxes (matchCharacterDescription, matchCharacterPersonality,
  matchScenario, matchPersonaDescription, matchCharacterDepthPrompt, matchCreatorNotes) surfaced
  in entry editor → style.css (CSS un-hide); wiring via vanilla ST getWorldEntry →
  src/editorPanel.js (no JS changes needed)
```

---

## After Implementation
*Implemented: February 27, 2026*

### What changed

- `style.css`
  - Removed the CSS rule that hid the nested User Settings drawer inside the entry editor.
  - Added scoped inner-drawer sizing overrides so the Additional Matching Sources section uses natural height.
  - Added a scoped override to show the section title as static text and hide only its chevron icon.
- `FEATURE_MAP.md`
  - Added an Editor behavior line documenting that Additional Matching Sources checkboxes are now surfaced by CSS.
- `tasks/main-tasks/documented/NewFeature_AdditionalMatchingSources.md`
  - Marked all implementation plan steps as completed.
  - Updated task status to IMPLEMENTED and recorded this implementation summary.

### Risks / What might break

- This touches editor drawer layout CSS, so other nested inline-drawer sections inside entries could inherit the new natural-height behavior.
- This touches toggle visibility CSS, so if another inner section relies on hidden toggle text, its header could now appear.
- This touches shared editor CSS selectors, so upstream template class changes in SillyTavern could make these overrides stop matching.

### Manual checks

- Open any entry in the extension editor and confirm the "Additional Matching Sources" title and 6 checkboxes are visible.
  Success looks like all six options are shown below the section title.
- Toggle each of the six checkboxes on and off, close the entry, then reopen it.
  Success looks like each checkbox keeping the state you set.
- Open a few different entries (including one with long content) and scroll through the editor.
  Success looks like normal scrolling and no oversized empty block where the section appears.
