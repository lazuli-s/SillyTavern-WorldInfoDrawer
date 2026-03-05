# NEW FEATURE: Entry Manager Tabs — Phase 1: Tab Bar
*Created: March 4, 2026*

**Type:** New Feature
**Status:** IMPLEMENTED
**Part of:** `NewFeature_EntryManagerTabs.md`
**Depends on:** Nothing — can be implemented against the current codebase

---

## Summary

Wraps the two existing collapsible rows in the Entry Manager inside a
`stwid--iconTab` tab widget. The Visibility row becomes Tab 1 (Display);
the Bulk Editor row becomes Tab 2 (Bulk Editor). The entry rows table stays
always visible below, unchanged.

This is **purely structural**: no preset logic, no container-visibility toggles,
no new stored state. The only behavioral change is that the two rows are now
shown and hidden by tab activation instead of their own collapse toggle.

---

## Current Behavior

Inside `renderOrderHelper` in `bulk-editor.js`, the body is assembled as:

```
body
  ├── visibilityRowEl     (Visibility row — Keys, Columns, Sorting, Filter)
  ├── bulkEditRowEl       (Bulk Editor row — field containers)
  ├── filterEl            (Filter panel)
  └── wrap                (Entry table)
```

Both rows are independently collapsible. On narrow screens
(`window.innerWidth <= 1000`) they start collapsed via `initialActionRowCollapsed`.

---

## Expected Behavior

The two rows are replaced by a single `stwid--iconTab` widget. The body becomes:

```
body
  ├── iconTab
  │   ├── iconTabBar                  (tab buttons: Display | Bulk Editor)
  │   ├── stwid--iconTabContent#display      (contains visibilityRowEl)
  │   └── stwid--iconTabContent#bulk-editor  (contains bulkEditRowEl)
  ├── filterEl            (unchanged)
  └── wrap                (unchanged)
```

Active tab panel is visible; inactive panel is hidden via the `.active` class —
same pattern as `browser-tabs.filter-bar.js`.

**Default active tab:** Display (Tab 1) — always, no persistence across reloads.

---

## Tab Definitions

| Tab | ID | Icon class | Label |
|---|---|---|---|
| Tab 1 | `display` | `fa-eye` | Display |
| Tab 2 | `bulk-editor` | `fa-table-list` | Bulk Editor |

---

## Existing Pattern Reference

`stwid--iconTab` is already used in
`src/book-browser/browser-tabs/browser-tabs.filter-bar.js` (lines 234–313).
Replicate that exact structure — same classes, same ARIA attributes, same
`.active` toggle logic. Do not introduce new CSS classes.

Key classes and their roles:

| Class | Element | Role attribute |
|---|---|---|
| `stwid--iconTab` | Root wrapper div | — |
| `stwid--iconTabBar` | Tab button bar | `role="tablist"` |
| `stwid--iconTabButton` | Each tab button | `role="tab"`, `aria-selected` |
| `stwid--iconTabContent` | Each tab panel div | `role="tabpanel"` |

The `setActiveTab(tabId)` helper toggles `.active` on both buttons and panels,
and sets `aria-selected` on buttons. Define it locally inside the tab block
(same as `setActivePlaceholderTab` in the reference file).

---

## Implementation Steps

### File: `src/entry-manager/bulk-editor/bulk-editor.js`

- [x] **Step 1 — Remove `initialActionRowCollapsed`**

Delete the line:
```js
const initialActionRowCollapsed = window.innerWidth <= 1000;
```

- [x] **Step 2 — Change `initialCollapsed` on both row builders**

Pass `initialCollapsed: false` to both `buildVisibilityRow` and `buildBulkEditRow`
(remove the `initialActionRowCollapsed` reference). Both rows must start
uncollapsed; tab activation handles their visibility from now on.

- [x] **Step 3 — Build the tab widget**

After both row elements are built, add a tab widget block (inline, ~50 lines):

```js
const entryManagerTabs = (() => {
    const panelTabs = [
        { id: 'display',      icon: 'fa-eye',        label: 'Display' },
        { id: 'bulk-editor',  icon: 'fa-table-list', label: 'Bulk Editor' },
    ];

    const iconTab    = document.createElement('div');
    iconTab.classList.add('stwid--iconTab');

    const iconTabBar = document.createElement('div');
    iconTabBar.classList.add('stwid--iconTabBar');
    iconTabBar.setAttribute('role', 'tablist');
    iconTabBar.setAttribute('aria-label', 'Entry Manager tabs');

    const tabButtons  = [];
    const tabContents = [];

    const setActiveTab = (tabId) => {
        for (const btn of tabButtons) {
            const isActive = btn.dataset.tabId === tabId;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        }
        for (const panel of tabContents) {
            panel.classList.toggle('active', panel.dataset.tabId === tabId);
        }
    };

    for (const tab of panelTabs) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.classList.add('stwid--iconTabButton');
        btn.dataset.tabId = tab.id;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', 'false');
        btn.title = `${tab.label} tab`;
        const icon = document.createElement('i');
        icon.classList.add('fa-solid', 'fa-fw', tab.icon);
        btn.append(icon);
        const text = document.createElement('span');
        text.textContent = tab.label;
        btn.append(text);
        tabButtons.push(btn);
        iconTabBar.append(btn);
        btn.addEventListener('click', () => setActiveTab(tab.id));

        const panel = document.createElement('div');
        panel.classList.add('stwid--iconTabContent');
        panel.dataset.tabId = tab.id;
        panel.setAttribute('role', 'tabpanel');
        tabContents.push(panel);
        iconTab.append(panel);
    }

    iconTab.prepend(iconTabBar);

    // Place row elements into their panels
    tabContents.find(p => p.dataset.tabId === 'display')?.append(visibilityRowEl);
    tabContents.find(p => p.dataset.tabId === 'bulk-editor')?.append(bulkEditRowEl);

    setActiveTab('display');
    return iconTab;
})();
```

- [x] **Step 4 — Update `body.append()`**

Replace:
```js
body.append(visibilityRowEl, bulkEditRowEl, filterEl, wrap);
```
With:
```js
body.append(entryManagerTabs, filterEl, wrap);
```

---

## What Does NOT Change

- `bulk-editor.action-bar.visibility-row.js` — untouched
- `bulk-editor.action-bar.bulk-edit-row.js` — untouched
- All other bulk-editor files — untouched
- `entry-manager.js` — untouched
- `style.css` — no new classes needed; existing `stwid--iconTab*` classes cover this

---

## Out of Scope for This Phase

| Item | Deferred to |
|---|---|
| Container-visibility presets in Tab 1 | Phase 2 |
| Per-container toggle overrides | Phase 2 |
| Tab 3 (Presets) | Future phase |
| Removing the internal collapse toggle from inside the rows | Optional cleanup post-Phase 1 |

---

## After Implementation
*Implemented: March 5, 2026*

### What changed

`src/entry-manager/bulk-editor/bulk-editor.js`
- Removed the old "collapse on small screens" default for the two action rows.
- Set both row builders to start expanded (`initialCollapsed: false`).
- Wrapped the two rows inside an `stwid--iconTab` tab widget with `Display` and `Bulk Editor` tabs.
- Switched the body layout to append the new tab wrapper above the filter panel and table.

### Risks / What might break

- This changes which container controls visibility of the two rows, so tab switching might hide the wrong row if a tab id is mistyped.
- The original collapse controls still exist inside each row, so users can still collapse content inside each tab and may read that as "tab is empty."
- If existing CSS for `stwid--iconTab` changes upstream, this new tab bar could look different than expected in Entry Manager.

### Manual checks

- Open Entry Manager and confirm the tab bar appears above the filter panel, with `Display` selected by default.
- Click `Bulk Editor` and confirm the bulk-edit row appears while the display row is hidden; click `Display` and confirm the reverse.
- On a narrow window (1000px or less), open Entry Manager and confirm the rows are still reachable through tabs without auto-collapsing on load.


