# Rework: Folder Row Visual Enhancement

## Summary

Improve visual distinction between folder rows and book rows in the list panel by:
- Making the folder icon reflect expanded or collapsed state.
- Giving folder headers a frosted glass material treatment.

## Plan Checklist

- [x] Review required docs and ownership boundaries before implementation.
- [x] Apply CSS-only folder icon state change (`fa-folder` <-> `fa-folder-open`) using existing collapse state classes.
- [x] Update folder header material styling to a frosted glass look while keeping existing shadow structure.
- [x] Keep changes localized to extension CSS with no JS or vendor modifications.

## Implementation Details

### A - Living Icon (fa-folder <-> fa-folder-open)

Goal: Folder icon reflects open or closed state.

- Collapsed folder keeps `fa-folder` default icon.
- Expanded folder overrides icon glyph to `fa-folder-open`.
- Implemented with CSS selector on existing state class `.stwid--folderBooks.stwid--isCollapsed`.
- No JavaScript changes.

### E - Frosted Glass Folder Header

Goal: Folder headers are visually distinct from flat book rows.

- Updated folder header blend from 78 percent to 65 percent primary background.
- Added `backdrop-filter: saturate(150%) blur(8px)`.
- Kept existing folder header box shadow unchanged.

## Files Modified

| File | Change |
| --- | --- |
| `style.css` | Updated `.stwid--folderHeader` background blend, added frosted backdrop filters, and added expanded-state folder icon glyph override. |
| `tasks/Rework_FolderRowVisualEnhancement.md` | Updated checklist and added final implementation report sections. |

## Verification

1. Open the WorldInfo drawer.
2. Expand and collapse a folder; verify icon switches between closed and open folder states.
3. Verify folder header appears frosted and visually distinct from book rows.
4. Verify no regression on book rows or entry rows.
5. Verify behavior in different SillyTavern themes.

## AFTER IMPLEMENTATION

### What changed

`style.css`
- Adjusted folder header background blend for more translucency.
- Added frosted glass backdrop filters to folder headers.
- Added CSS-only open-folder icon override for expanded folders.

`tasks/Rework_FolderRowVisualEnhancement.md`
- Added and completed a task checklist.
- Recorded final implementation details and verification.
- Added risks and manual checks.

### Risks/What might break

- `Living icon selector`: Because this uses `:has(...)`, unsupported browsers may keep the default closed-folder icon.
- `Living icon selector`: If folder DOM structure changes and `.stwid--folderBooks` is moved or renamed, icon state could desync.
- `Frosted backdrop`: Blur/saturation can reduce text contrast on some themes.
- `Frosted backdrop`: Backdrop filters can add rendering cost on low-end hardware with many visible rows.

### Manual checks

- Expand and collapse at least 3 folders quickly. Success looks like: folder icon and chevron always agree with actual open/closed state.
- Compare one folder row and one book row in light and dark themes. Success looks like: folder header appears translucent/frosted while book row remains flat.
- Scroll a long list with several folders expanded. Success looks like: no obvious stutter and folder labels remain readable.
