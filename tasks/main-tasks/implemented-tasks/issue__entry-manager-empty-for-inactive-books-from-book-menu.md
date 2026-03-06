# ISSUE: Entry Manager shows no entries when opened via book menu for an inactive book
*Created: March 5, 2026*

**Type:** Issue
**Status:** IMPLEMENTED

---

## Summary

When you open the Entry Manager from a book's dropdown menu (the three-dot "…" button on
a book row), it shows no entries if that book is not currently active (toggled on). This
makes it impossible to use the Entry Manager on inactive books from the book menu. The
browser-tabs Entry Manager icon is not affected and must not be changed.

## Current Behavior

When the user clicks the book menu (the "…" icon on any book row) and then clicks
"Entry Manager", the Entry Manager opens but shows **zero entries** if the book is
currently inactive (toggled off). Only active books' entries appear.

**Root cause:** `book-list.book-menu.js` calls `state.openEntryManager(name)` with no
scope argument. Inside `entry-manager.js`, `openEntryManager(book, scope)` defaults
`scope` to `null`. With no scope, the Entry Manager falls back to
`getSelectedWorldInfo()` — the list of currently **active** books — to build its lookup
set. Because the clicked book is not active, it is not in that set, and
`getEntryManagerSourceEntries` returns an empty array.

## Expected Behavior

After the fix, clicking "Entry Manager" from the book menu should always show the
entries of that book, regardless of whether the book is currently active or inactive.
No other Entry Manager entry point (browser-tabs icon, folder menu) should be affected.

## Agreed Scope

| File | Role |
|---|---|
| `src/book-browser/book-list/book-list.book-menu.js` | **Only file to change.** The "Entry Manager" menu item click handler calls `state.openEntryManager(name)` — add `[name]` as the explicit scope. |
| `src/entry-manager/entry-manager.js` | Read-only reference. `openEntryManager(book, scope)` already supports an explicit scope list; no changes needed here. |

## Out of Scope

- The browser-tabs "Entry Manager" toggle button (`browser-tabs.settings-tab.js` →
  `openEntryManager(null, visibilityScope)`): behavior unchanged.
- The folder context menu (`book-folders.folder-actions.js` →
  `openEntryManager(null, bookNames)`): already passes explicit scope, not affected.
- Any UI change to the Entry Manager panel itself.

## Implementation Plan

- [x] In `src/book-browser/book-list/book-list.book-menu.js`, locate the "Entry Manager"
  menu item click handler (around line 594–600). Change the call from:
  ```js
  state.openEntryManager(name);
  ```
  to:
  ```js
  state.openEntryManager(name, [name]);
  ```
  This passes `[name]` as the explicit `scope` argument, so `getEntryManagerSourceEntries`
  builds its lookup set from `[name]` instead of falling back to `getSelectedWorldInfo()`.
  The book's entries are then returned even when the book is inactive.

- [ ] Verify in the browser (manual test):
  1. Ensure at least one book is toggled **off** (inactive).
  2. Open that book's "…" menu and click "Entry Manager".
  3. Confirm its entries appear in the Entry Manager table.
  4. Confirm the browser-tabs Entry Manager icon still behaves as before (no regression).

---

## After Implementation
*Implemented: March 6, 2026*

### What changed

`src/book-browser/book-list/book-list.book-menu.js`

- Changed the book-menu "Entry Manager" action to pass the clicked book name as an explicit scope list.
- This makes the Entry Manager load that book's entries even when the book is turned off.
- Other Entry Manager entry points were left alone.

### Risks / What might break

- This touches the book row menu action, so it might affect only that menu path if another part of the menu expected the old fallback behavior.
- Manual browser testing is still needed, so there could still be a UI-only issue that does not show up from reading the code alone.

### Manual checks

- Turn one lorebook off, open its "…" menu, click "Entry Manager", and confirm you can see that book's entries.
- Turn one lorebook on, open its "…" menu, click "Entry Manager", and confirm it still shows that same book's entries normally.
- Use the browser-tabs Entry Manager button and confirm it still opens with its usual broader scope instead of switching to just one book.
