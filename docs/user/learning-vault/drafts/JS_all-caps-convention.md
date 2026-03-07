# ALL_CAPS Naming Convention

**Type:** terminology
**Topic:** JS
**Captured:** 2026-03-07
**Source:** Conversation about variable naming styles in the entry-manager module.

---

## What it is

Writing a variable name in ALL_CAPS signals that its value is a constant — something set once and never changed.

## Why it matters

If a value is never supposed to change, marking it ALL_CAPS warns anyone reading the code: "don't try to modify this." It prevents accidental changes and makes the code easier to scan — you can immediately tell fixed settings apart from live data.

## Where it fits

```
Variables in a JS file
├── ALL_CAPS  →  fixed constants (set once, never change)
├── camelCase →  regular variables (can change over time)
└── camelCase →  functions (actions the code performs)
```

## Example

```js
const ORDER_HELPER_COLUMNS_STORAGE_KEY = 'wiDrawer_orderHelperColumns';
const ORDER_HELPER_DEFAULT_COLUMNS = ['uid', 'key', 'comment'];
```

Both names are ALL_CAPS because these values are hardcoded settings — the storage key and the default column list. They are defined once at the top of the file and never reassigned. Any programmer reading the file knows at a glance that these are fixed configuration values, not data that changes as the user interacts with the UI.
