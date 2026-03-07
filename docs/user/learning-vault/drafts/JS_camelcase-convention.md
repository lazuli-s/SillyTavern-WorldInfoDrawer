# camelCase Naming Convention

**Type:** terminology
**Topic:** JS
**Captured:** 2026-03-07
**Source:** Conversation about variable naming styles in the entry-manager module.

---

## What it is

camelCase is a way of writing multi-word names by joining the words together and capitalizing the first letter of each word after the first — like a camel's humps.

## Why it matters

JavaScript names cannot contain spaces, so camelCase is the standard way to write readable multi-word names. It is used for variables (values that can change) and functions (actions the code performs). Using it consistently makes code easier to read and matches what other JS developers expect to see.

## Where it fits

```
Naming styles in a JS file
├── ALL_CAPS        →  constants    (e.g. MAX_RETRIES)
├── camelCase       →  variables    (e.g. orderHelperState)
├── camelCase()     →  functions    (e.g. applyOrderHelperColumnVisibility)
└── PascalCase      →  classes      (e.g. EntryManager) — less common here
```

## Example

```js
let orderHelperState = { columns: [], sortBy: 'uid' };

function applyOrderHelperColumnVisibility(columns) {
    // updates which columns are shown in the table
}
```

`orderHelperState` is a variable — it holds the current state of the entry manager and gets updated as the user changes settings. `applyOrderHelperColumnVisibility` is a function — calling it triggers the action of showing or hiding columns. Both use camelCase: lowercase first word, then each new word starts with a capital letter.
