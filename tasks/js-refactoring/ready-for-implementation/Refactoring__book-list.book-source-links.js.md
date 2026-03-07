# REFACTORING: book-list.book-source-links.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-list/book-list.book-source-links.js`
**Findings:** 6 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 0 |
| Shape-based naming | NAME-01 | 2 |
| Large functions | SIZE-01 | 2 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **6** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The file repeats the same "read a string, trim it, and return it only if it is not empty" logic three times. That makes the persona-name rules harder to change because the same cleanup rule is spread across multiple branches.

**Where:**
- `src/book-browser/book-list/book-list.book-source-links.js`, lines 73-77 - trims and returns the locked persona name
- `src/book-browser/book-list/book-list.book-source-links.js`, lines 86-89 - trims and returns the mapped descriptor persona name
- `src/book-browser/book-list/book-list.book-source-links.js`, lines 94-96 - trims and returns `name1`

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `getTrimmedNonEmptyString(value)` near the top of the file.
- [ ] Replace the first copy (lines 73-77) with a call to `getTrimmedNonEmptyString(lockedPersonaName)`.
- [ ] Replace the second copy (lines 86-89) with a call to `getTrimmedNonEmptyString(mappedName)`.
- [ ] Replace the third copy (lines 94-96) with a call to `getTrimmedNonEmptyString(name1)`.

---

### [2] NAME-01 - Shape-based name

**What:** `target` (line 34) describes a generic destination instead of telling the reader what this value actually stores. Reading the name alone does not tell you that it is a map of lorebooks to linked character names.

**Where:** `src/book-browser/book-list/book-list.book-source-links.js`, line 34

**Steps to fix:**
- [ ] Rename `target` to `linkedBooksByWorldName` everywhere it appears in this file.

---

### [3] NAME-01 - Shape-based name

**What:** `evt` (line 222) is a shortened shape-based name for an event object. The name says what kind of value it is, but not what user action it represents.

**Where:** `src/book-browser/book-list/book-list.book-source-links.js`, line 222

**Steps to fix:**
- [ ] Rename `evt` to `changeEvent` everywhere it appears in this file.

---

### [4] SIZE-01 - Large function

**What:** `buildLorebookSourceLinks` is 72 lines long (lines 126-197). It is doing too much: it creates the default per-book state, and also applies chat and persona links, and also resolves character-linked books for both group and single-character contexts.

**Where:** `src/book-browser/book-list/book-list.book-source-links.js`, lines 126-197

**Steps to fix:**
- [ ] Extract the default book-state setup (lines 128-137) into a new function named `createEmptyLinksByBook(worldNames)`. This should build the starting object for every lorebook.
- [ ] Extract the chat and persona updates (lines 139-151) into a new function named `applyDirectSourceLinks(linksByBook, runtime)`. This should mark direct chat/persona links and store the persona name.
- [ ] Extract the group and single-character resolution block (lines 153-188) into a new function named `collectCharacterBooks(runtime)`. This should return the map of lorebooks linked by active characters.
- [ ] Replace the extracted blocks in `buildLorebookSourceLinks` with calls to the new functions.

---

### [5] SIZE-01 - Large function

**What:** `initBookSourceLinks` is 155 lines long (lines 100-254). It is doing too much: it owns runtime state, and also defines helper builders, and also refreshes the UI, and also wires DOM and event-bus listeners, and also exposes the public API.

**Where:** `src/book-browser/book-list/book-list.book-source-links.js`, lines 100-254

**Steps to fix:**
- [ ] Extract the signature builder (lines 106-124) into a new top-level function named `buildSourceLinksSignature(linksByBook)`. This should turn the current source-link map into a comparison string.
- [ ] Extract the summary builder (lines 199-207) into a new top-level function named `summarizeSourceLinks(linksByBook)`. This should count how many books have each source type.
- [ ] Extract the event subscription setup (lines 229-241) into a new function named `subscribeToSourceLinkRefreshEvents(eventSource, eventTypes, refreshBookSourceLinks, eventSubscriptions, onSourceSelectorChange)`. This should register all listeners in one place.
- [ ] Replace the extracted blocks in `initBookSourceLinks` with calls to the new functions.

---

### [6] NEST-01 - Deep nesting

**What:** Inside `buildLorebookSourceLinks`, the block starting at line 159 reaches 5 levels of indentation. The innermost logic is hard to follow because the reader must hold 5 contexts in memory at the same time.

**Where:** `src/book-browser/book-list/book-list.book-source-links.js`, lines 159-170 (deepest point: line 168)

**Steps to fix:**
- [ ] Extract the inner block (lines 159-170) into a new function named `indexCharactersByAvatarAndName(characters)`. This should build the avatar map and the name map outside the main control flow.
- [ ] Replace the inner block with a call to `indexCharactersByAvatarAndName(runtime.characters)`.

---
