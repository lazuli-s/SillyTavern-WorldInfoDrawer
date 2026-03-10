# PLAN: Mobile editor scroll and tab row fixes
*Created: March 10, 2026*

**Type:** Plan
**Status:** DOCUMENTED

---

## Summary

The current mobile stacked layout still has three usability problems: the lower editor panel does not scroll correctly, some editor controls overlap each other, and the browser tab buttons do not span the full row cleanly on small screens. This plan focuses on fixing those layout problems without changing the overall stacked mobile design.

## Current Behavior

- On a phone-sized screen, opening an entry shows the editor in the lower panel below the draggable divider, but the user cannot scroll through the full editor.
- Some editor controls and labels sit on top of each other in the lower panel instead of stacking cleanly.
- The browser tab buttons are icon-only at narrow widths, but they do not use the full row in a balanced, centered way.

## Expected Behavior

- On a phone-sized screen, the lower editor panel should scroll normally from top to bottom.
- Editor sections, labels, inputs, and text areas should stack cleanly with no visual overlap.
- The browser tab buttons should stay on one line on mobile, use the available width evenly, and keep the icons centered.

## Assumptions

- The mobile design should stay as a stacked layout: book list on top, draggable divider in the middle, editor below.
- The tab buttons should remain icon-only at narrow widths unless the user later asks to bring the text labels back.
- The fix should prefer CSS changes first, with JavaScript changes only if inspection shows the DOM structure itself is wrong.

## Agreed Scope

Likely owner files based on the current code:

| Area | Files |
|---|---|
| Mobile split layout and scroll behavior | `style.css`, `src/drawer.splitter.js` |
| Entry editor layout and rendered structure | `style.css`, `src/editor-panel/editor-panel.js` |
| Browser tab row layout | `style.css`, `src/book-browser/browser-tabs/browser-tabs.js` |

Related existing task history to review before implementing:

- `tasks/main-tasks/implemented-tasks/Rework__mobile-layout-compatibility.md`
- `tasks/main-tasks/implemented-tasks/Rework_MobileResponsive.md`

## Out of Scope

- Returning to the full-screen mobile editor design.
- Changing the meaning or order of the browser tabs.
- Changing desktop layout behavior.
- Changing entry data, save behavior, or World Info API usage.

## Implementation Plan

- [ ] Review the mobile editor shell in `style.css` around `.stwid--editor`, `.world_entry`, `.world_entry_form`, `.inline-drawer`, `.inline-drawer-content`, and `[name='contentAndCharFilterBlock']` to find which height and overflow rules are preventing the lower panel from scrolling.
- [ ] Add a mobile-only override in `style.css` at `@media screen and (max-width: 1000px)` that lets the lower editor panel own the vertical scroll. The likely correction is to move from forced `height: 100%` behavior to `height: auto` / `min-height: 0` on the wrong inner wrappers, while keeping exactly one intended scroll container.
- [ ] Add a second mobile-only override in the same editor section so entry sub-sections stack naturally instead of compressing into each other. Inspect the rendered ST entry DOM first, then relax desktop-sized layout rules that are unsafe on mobile.
- [ ] Verify whether the overlap is caused by sticky or absolute-positioned elements inside the editor. If so, scope a mobile override in `style.css` to disable or reposition only those specific elements in the stacked layout.
- [ ] Review the mobile list height logic in `src/drawer.splitter.js` and confirm the saved splitter height cannot leave the editor panel too small to use. If the splitter can restore an unusable height, clamp the minimum editor space more aggressively for mobile.
- [ ] Rework the mobile tab row in `style.css` so `.stwid--iconTabBar` stays on one line and visible tab buttons divide the width evenly. Prefer reusing the existing `.stwid--iconTabButton` structure rather than changing the tab markup.
- [ ] If CSS alone cannot produce an even mobile tab row because hidden tabs leave uneven spacing, update `createTabButton()` or the tab-mount logic in `src/book-browser/browser-tabs/browser-tabs.js` only as needed to expose a stable mobile layout hook.
- [ ] Manually verify on a phone-sized screen:
  - Open a long entry and confirm the lower panel scrolls all the way to the bottom.
  - Confirm labels, inputs, sliders, and text areas no longer overlap.
  - Drag the divider and confirm both panels remain usable after reload.
  - Confirm the mobile tab row fills the width and keeps the icons centered.
