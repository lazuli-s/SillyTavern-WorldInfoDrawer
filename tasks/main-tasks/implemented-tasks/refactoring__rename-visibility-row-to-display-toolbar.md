# REFACTORING: Rename Visibility Row To Display Toolbar
*Created: March 5, 2026*

**Type:** Refactoring
**Status:** IMPLEMENTED

---

## Summary

The Entry Manager still uses the old name "visibility row" for the control strip inside the Display tab. This task renames that live code and current documentation to "display toolbar" so the name matches what the interface is now.

## Current Behavior

Today, the Entry Manager Display tab shows a control strip with selection, key visibility, column visibility, table sorting, and active filter information. Even though that strip is no longer just about visibility, the live code and current architecture documents still call it the "visibility row."

## Expected Behavior

After this change, the live code and current documentation should consistently call that strip the "display toolbar." The rename should only affect active source files and current docs, not archived task history.

## Agreed Scope

- Entry Manager Display tab control-strip module ownership in `src/entry-manager/display-tab/visibility-row.js`
- Entry Manager tab assembly that mounts that control strip in `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`
- Current architecture and feature ownership documentation in `ARCHITECTURE.md` and `FEATURE_MAP.md`
- Any live CSS selectors, class names, variable names, comments, and user-facing labels in active source files that still use the old "visibility row" name for this Entry Manager surface

## Out of Scope

- Archived or historical task files under `tasks/`
- Rename changes for unrelated Book Browser visibility features, such as the Book Browser Visibility tab and its book-visibility controls, unless they incorrectly refer to the Entry Manager Display tab toolbar

## Implementation Plan

- [x] Inspect active source files for `visibility row` references and separate Entry Manager Display tab references from unrelated Book Browser visibility-tab references.
- [x] In `src/entry-manager/display-tab/visibility-row.js`, rename the file and exported builder naming from `visibility-row` / `buildVisibilityRow` to `display-toolbar` / `buildDisplayToolbar`, keeping behavior unchanged.
- [x] In `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, update imports, local variable names, and tab-mounting references so the Display tab mounts the renamed display toolbar component.
- [x] Update any active CSS class names or selectors that use the old Entry Manager `visibility row` terminology only if they belong to this Display tab control strip; avoid renaming Book Browser visibility-tab selectors unless they are coupled to the Entry Manager toolbar by mistake.
- [x] Update current documentation in `ARCHITECTURE.md` and `FEATURE_MAP.md` so the Entry Manager Display tab surface is described as a `display toolbar` instead of a `visibility row`.
- [x] Run a final search across active source files and current docs to confirm the old Entry Manager `visibility row` name no longer remains in live code, while intentional Book Browser visibility-tab naming is preserved.

---

## After Implementation
*Implemented: March 6, 2026*

### What changed

`src/entry-manager/display-tab/display-tab.display-toolbar.js`
- Renamed the Display tab control-strip module file.
- Renamed the exported builder from `buildVisibilityRow` to `buildDisplayToolbar`.
- Renamed the internal info wrapper class to match the new toolbar name.

`src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`
- Updated the import to the renamed Display tab module file.
- Renamed the local builder result variables so the Display tab now mounts a display toolbar.
- Kept the tab behavior the same.

`style.css`
- Renamed the Entry Manager info-area selector from `stwid--visibilityInfo` to `stwid--displayToolbarInfo`.
- Updated the nearby comment so it describes the display toolbar.

`ARCHITECTURE.md`
- Updated the file map and module responsibility text to use `display toolbar`.

`FEATURE_MAP.md`
- Updated the Entry Manager feature ownership lines to use `display toolbar`.
- Updated the source path references to the renamed module file.

### Risks / What might break

- This touches the Display tab import path, so the Entry Manager could fail to open if any file still points at the old module name.
- This touches one toolbar CSS selector, so the filter chip area on the right side could lose its layout if any old class name is still used at runtime.

### Manual checks

- Reload the browser tab, open Entry Manager, and click the `Display` tab. Success looks like the toolbar still appears at the top with Keys, Columns, sorting, and filter controls.
- Apply a few Entry Manager filters. Success looks like the active filter chips still appear on the right side of the toolbar and can still be cleared.
- Open the Book Browser Visibility tab. Success looks like its existing visibility row still works and was not renamed or broken by this task.
