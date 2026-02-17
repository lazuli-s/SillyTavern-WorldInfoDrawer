# CODE REVIEW FINDINGS: `src/listPanel.booksView.js`

*Reviewed: February 17, 2026*

## Scope

- **File reviewed:** `src/listPanel.booksView.js`
- **Helper files consulted:** `src/listPanel.js`, `src/lorebookFolders.js`, `vendor/SillyTavern/public/scripts/world-info.js`
- **Skills applied:** `<st-js-best-practices>` / `<st-world-info-api>`
- **FEATURE_MAP stated responsibilities:** book list rendering/insertion order, book active toggle, collapse/expand behavior, book drag/drop handling, and entry creation from the book row.

---

## F01: Missing null guard for loaded book data can crash full list rendering

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If one book fails to load at the exact moment the list is being built, the whole list refresh can crash instead of skipping that one broken/missing book.

- **Location:**
  `src/listPanel.booksView.js` in `renderBook()` and `loadList()` (`const world = { entries:{}, metadata: cloneMetadata(data.metadata), ... }`)

- **Detailed Finding:**
  `renderBook()` assumes `data` is always a valid object with `metadata` and `entries` right after `runtime.loadWorldInfo(name)` (`src/listPanel.booksView.js:20-23`). The WI API contract allows load failures (`data | null`), and `loadList()` passes preloaded `book.data` through to `renderBook()` (`src/listPanel.booksView.js:228-230`, `src/listPanel.booksView.js:237-239`). If a book is deleted/renamed while a refresh is in progress, or a single load call returns null, `data.metadata` / `Object.entries(data.entries)` throws. There is no per-book guard or fallback, so one bad book can abort the entire list build.

- **Why it matters:**
  Users can end up with a partially rendered or blank book list from a single transient failure, which looks like the drawer is broken.

- **Severity:** Medium ❗

- **Confidence:** High 😀

- **Category:** Race Condition

- **Reproducing the issue:**
  1. Have many lorebooks so refresh takes noticeable time.
  2. Trigger a list refresh.
  3. While refresh is running, remove or rename one of the books from another active WI surface.
  4. The list render can abort with a runtime error instead of skipping that book.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make `renderBook()` tolerant to missing/invalid payloads and skip those books during `loadList()` instead of crashing the whole render pass.

- **Proposed fix:**
  In `renderBook()`, validate `data` before reading `data.metadata` or `data.entries`. If invalid, return `null` early and avoid touching `runtime.cache[name]`. In `loadList()`, skip entries where `runtime.loadWorldInfo(name)` returns a non-object payload, and handle a `null` return from `renderBook(...)` as a no-op so folder/root loops continue.

- **Implementation Checklist:**
  [ ] Add an object-shape guard in `renderBook()` immediately after loading `data`.
  [ ] Return `null` from `renderBook()` when payload shape is invalid, before cache/DOM writes.
  [ ] In `loadList()`, skip pushing books with invalid load payloads.
  [ ] In folder and root render loops, allow `renderBook(...)` to return `null` without aborting remaining books.

- **Fix risk:** Low 🟢
  The change is defensive and only alters failure handling paths where payloads are already invalid.

- **Why it's safe to implement:**
  It does not alter normal rendering, sorting, drag/drop, or collapse behavior for valid books; it only prevents hard failure on bad load data.

- **Pros:**
  Prevents full-list crashes from one bad/missing book and improves refresh resilience during concurrent WI changes.

<!-- META-REVIEW: STEP 2 will be inserted here -->

## F02: New-entry flow applies optimistic UI/cache mutation without rollback on save failure

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When you click the plus button to add an entry, the new row is shown before save completes. If saving fails, the fake row stays on screen and can trick users into thinking their work was saved.

- **Location:**
  `src/listPanel.booksView.js` in the add-entry click handler (`runtime.cache[name].entries[newEntry.uid] = ...`, `await runtime.renderEntry(...)`, `await runtime.saveWorldInfo(...)`)

- **Detailed Finding:**
  The add-entry handler creates a new entry in `saveData`, immediately mirrors it into `runtime.cache`, renders it in the DOM, and opens it in the editor before `saveWorldInfo(name, saveData, true)` resolves (`src/listPanel.booksView.js:123-129`). There is no `try/catch` rollback path. If `saveWorldInfo` throws/rejects, or if render/open fails mid-flow, the cache and list UI may keep an unsaved entry that is not persisted in ST truth. This conflicts with the ownership contract where ST persistence is authoritative.

- **Why it matters:**
  Users can type into an entry that later disappears after refresh, creating direct confusion and possible loss of text they thought was saved.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔

- **Category:** Data Integrity

- **Reproducing the issue:**
  1. Trigger a save failure path (for example, temporary WI save failure from host/network issues).
  2. Click the add-entry (+) button on a book.
  3. Observe the new row appears.
  4. Refresh/reopen the list and see that entry was never persisted.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Keep the current user flow, but add explicit rollback/error handling so failed saves cannot leave stale optimistic rows in cache/UI.

- **Proposed fix:**
  Wrap the add-entry handler body in `try/catch`. Track `newEntry.uid`, and if any step after optimistic insertion fails, remove `runtime.cache[name].entries[newEntry.uid]`, remove and delete `runtime.cache[name].dom.entry[newEntry.uid]` if present, and show a user-facing error (`toastr.error(...)`) before returning.

- **Implementation Checklist:**
  [ ] Add `try/catch` around the add-entry click handler mutation/render/save sequence.
  [ ] On failure, remove the optimistic entry from `runtime.cache[name].entries`.
  [ ] On failure, remove the rendered row and clear `runtime.cache[name].dom.entry[newEntry.uid]`.
  [ ] Emit a clear error toast for failed entry creation persistence.

- **Fix risk:** Medium 🟡
  Rollback touches both cache and DOM bookkeeping, so incomplete cleanup could desync the row map if not done carefully.

- **Why it's safe to implement:**
  It does not change successful add-entry behavior; it only corrects inconsistent state when failure already occurred.

- **Pros:**
  Keeps UI state aligned with persisted WI state and prevents phantom entries that disappear later.

<!-- META-REVIEW: STEP 2 will be inserted here -->
