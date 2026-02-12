# Rework: Folder Row Visual Enhancement

## Summary

Improve the visual distinction between folder rows and book rows in the list panel. Folder rows currently look too similar to book rows. This rework applies two targeted visual enhancements to make folders more beautiful, polished, and accessible.

## Changes

### A — Living Icon (fa-folder ↔ fa-folder-open)

**Goal:** The folder icon visually reflects the open/closed state of the folder.

- When collapsed: icon shows `fa-folder` (current default)
- When expanded: icon switches to `fa-folder-open`
- Implemented via CSS `content` override on `::before` pseudo-element, using the existing `.stwid--isCollapsed` state class on `.stwid--folderBooks`
- No JS changes required

**CSS target:**
```css
/* When NOT collapsed, override to open folder icon */
.stwid--folder:not(:has(.stwid--folderBooks.stwid--isCollapsed)) .stwid--folderIcon::before {
  content: "\f07c"; /* fa-folder-open */
}
```

**Accessibility benefit:** Two simultaneous visual signals for expand/collapse state (icon + chevron).

---

### E — Frosted Glass Folder Header

**Goal:** Folder headers get a frosted glass material feel — semi-transparent with backdrop blur — making them visually distinct from the flat, opaque book headers.

- Reduce background opacity slightly (from 78% primary blend to ~65%)
- Add `backdrop-filter: saturate(150%) blur(8px)` for the frosted effect
- Keep existing `box-shadow` unchanged
- Book headers remain flat/opaque — the material contrast separates the two types

**CSS target:** Modify `.stwid--folderHeader` background + add `backdrop-filter`

**Note:** Effect is visible because the folder header overlays the scrolling content panel behind it.

---

## Files to Modify

| File | Change |
|---|---|
| `style.css` | Lines ~337–434: Modify `.stwid--folderHeader` background; add `backdrop-filter`; add icon content override for expanded state |

## Files NOT to Modify

- `src/lorebookFolders.js` — no JS changes needed
- Anything under `vendor/SillyTavern`

## Verification

1. Open the WorldInfo drawer
2. Expand and collapse a folder — verify the icon switches between `fa-folder` and `fa-folder-open`
3. Verify the folder header has a frosted glass appearance vs the flat book header
4. Verify no visual regression on book rows or entry rows
5. Verify the effect works across different SillyTavern themes (light/dark)
