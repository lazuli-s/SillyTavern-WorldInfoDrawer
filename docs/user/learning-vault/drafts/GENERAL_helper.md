# Helper

**Type:** terminology
**Topic:** General
**Captured:** 2026-03-07
**Source:** Conversation about what "helper" means as a programming term.

---

## What it is

A helper is an informal name for a function or module that handles one specific supporting task so the rest of the code doesn't have to figure out how to do it.

## Why it matters

Without helpers, every part of the code would need to contain the logic for every task — making things huge, repetitive, and hard to fix. A helper centralizes one job in one place. If that job needs to change, you only change it in one spot.

## Where it fits

```
Extension (big picture)
├── book-browser/    →  shows the list of WI books
├── entry-manager/   →  helper: handles sorting and managing entries
│                        (other modules just call it — they don't know how it works)
├── editor-panel/    →  shows the editor for a single entry
└── index.js         →  wires everything together
```

## Example

```js
// Inside entry-manager — the helper does the sorting work
export function sortEntries(entries, column) {
    return [...entries].sort((a, b) => a[column] > b[column] ? 1 : -1);
}

// Inside book-browser — it just calls the helper, no sorting logic needed here
import { sortEntries } from '../entry-manager/entry-manager.js';
const sorted = sortEntries(myEntries, 'uid');
```

The book-browser module doesn't need to know *how* sorting works — it just asks the entry-manager helper to do it. This keeps each module focused on its own job, and means sorting logic only exists in one place.
