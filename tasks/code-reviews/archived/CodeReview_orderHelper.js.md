# CODE REVIEW FINDINGS: `src/orderHelper.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/orderHelper.js`
- **Helper files consulted:** `src/orderHelperState.js`, `src/orderHelperFilters.js`, `src/orderHelperRender.js`
- **Skills applied:** st-js-best-practices, st-world-info-api
- **FEATURE_MAP stated responsibilities:** Order Helper orchestration: state creation, scope gathering, derived filter options

---

## F01: Direct cache mutation in ensureCustomDisplayIndex

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The code modifies World Info entry data directly in SillyTavern's cache without going through the proper save process. This means changes to the `display_index` field are made in memory but may not be persisted to disk, causing data inconsistency between what's shown and what's actually saved.

- **Category:** Data Integrity

- **Location:**
  `src/orderHelper.js`, function `ensureCustomDisplayIndex` (lines 59-86)
  
  ```javascript
  for (const entry of missing) {
      entry.extensions ??= {};
      entry.extensions.display_index = nextIndex;
      nextIndex += 1;
      updatedBooks.add(bookName);
  }
  ```

- **Detailed Finding:**
  The `ensureCustomDisplayIndex` function iterates over entries from `getOrderHelperSourceEntries`, which returns entries directly from the `cache` object. It then mutates `entry.extensions.display_index` directly on these cached objects. According to `SILLYTAVERN_OWNERSHIP_BOUNDARY.md` and `wi-api.md` Section 10, the extension should never mutate `worldInfoCache` entries directly — instead, it should load fresh, mutate, and save back. The function returns a list of updated book names but does not call `saveWorldInfo` or any persistence mechanism. This creates a risk where the in-memory `display_index` values differ from what's persisted, leading to inconsistent ordering behavior after page reload.

- **Why it matters:**
  Users may experience confusing behavior where their custom entry ordering appears to work initially but is lost after refreshing the page or switching books. This undermines trust in the Order Helper's drag-sort feature.

- **Severity:** High ❗❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Refactor `ensureCustomDisplayIndex` to follow the proper WI data mutation pattern: load fresh data via `loadWorldInfo`, mutate the copy, then save via `saveWorldInfo`. The function should be async and await the save operation.

- **Proposed fix:**
  1. Make `ensureCustomDisplayIndex` async
  2. For each book that needs updates, call `loadWorldInfo(bookName)` to get a fresh copy
  3. Mutate the fresh copy's entries (not the cache directly)
  4. Call `saveWorldInfo(bookName, data)` for each updated book
  5. Update all callers to await this function

- **Implementation Checklist:**
  - [ ] Change `ensureCustomDisplayIndex` to async function
  - [ ] Replace direct cache mutation with `loadWorldInfo` + `saveWorldInfo` pattern
  - [ ] Update `createOrderHelperRenderer` call site in this file to pass `loadWorldInfo` if not already available
  - [ ] Search for all callers of `ensureCustomDisplayIndex` in the codebase and add `await`
  - [ ] Test drag-sorting entries and verify order persists after page reload

- **Fix risk:** Medium 🟡
  The fix changes the function signature (adds async) which requires updating all call sites. There's also a risk of performance degradation if many books are updated simultaneously, though this is unlikely in practice.

- **Why it's safe to implement:**
  The change aligns with the documented WI API contract. The function is already returning updated book names, indicating it's intended to have side effects. Making those side effects proper async saves is the correct behavior.

- **Pros:**
  - Ensures entry ordering persists correctly
  - Follows SillyTavern API best practices
  - Prevents cache desynchronization issues

---

## F02: Unsanitized JSON injection into DOM

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The preview panel that shows entry data builds a JSON string and puts it directly into the page without cleaning it first. If entry data contains malicious content, it could potentially execute harmful code in the user's browser.

- **Category:** JS Best Practice (Security)

- **Location:**
  `src/orderHelper.js`, function `updateOrderHelperPreview` (lines 159-166)
  
  ```javascript
  dom.order.filter.preview.textContent = JSON.stringify(Object.assign({ book:previewEntry.book }, previewEntry.data), null, 2);
  ```

- **Detailed Finding:**
  While `textContent` is generally safer than `innerHTML`, the code stringifies entry data (which comes from user-editable fields like `content`, `comment`, `key`, etc.) and displays it. The entry data is controlled by users and could contain unexpected content. Per `st-js-best-practices` SEC-02, user inputs should be sanitized with `DOMPurify` before DOM insertion. Although `textContent` doesn't parse HTML, defense in depth suggests sanitizing the data before stringification, especially since `previewEntry.data` could contain prototype pollution or other unexpected structures.

- **Why it matters:**
  This is a defense-in-depth concern. While the current code uses `textContent` (which is good), the data being displayed is user-controlled and complex. If the preview panel implementation changes to use `innerHTML` in the future, or if JSON.stringify produces unexpected output with certain character combinations, there's a risk of XSS.

- **Severity:** Low ⭕

- **Confidence:** Medium 🤔

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Sanitize the entry data before displaying it in the preview panel, or at minimum validate that the data is safe to stringify.

- **Proposed fix:**
  Use `DOMPurify.sanitize` on string fields in the preview data before stringification, or create a whitelist of safe fields to display in the preview.

- **Implementation Checklist:**
  - [ ] Import DOMPurify from SillyTavern libs
  - [ ] Create a sanitized copy of `previewEntry.data` with string fields run through `DOMPurify.sanitize()`
  - [ ] Stringify the sanitized copy instead of raw data

- **Fix risk:** Low 🟢
  Adding sanitization is a safe change that doesn't affect functionality. The preview panel is for display only.

- **Why it's safe to implement:**
  The preview is read-only display. Sanitizing doesn't change the underlying data or functionality.

- **Pros:**
  - Follows security best practices
  - Defense in depth against future code changes
  - Consistent with extension security patterns

---

## F03: Synchronous localStorage operations on sort change

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When the user changes the sort order in the Order Helper, the code immediately writes to the browser's storage. This happens right away without waiting, which could slow down the interface if the storage is slow or if many changes happen quickly.

- **Category:** Performance

- **Location:**
  `src/orderHelper.js`, function `setOrderHelperSort` (lines 192-199)
  
  ```javascript
  const setOrderHelperSort = (sort, direction)=>{
      orderHelperState.sort = sort;
      orderHelperState.direction = direction;
      const value = JSON.stringify({ sort, direction });
      localStorage.setItem(ORDER_HELPER_SORT_STORAGE_KEY, value);
      if (dom.order.sortSelect) {
          dom.order.sortSelect.value = value;
      }
  };
  ```

- **Detailed Finding:**
  The function calls `localStorage.setItem` synchronously every time the sort changes. Per `st-js-best-practices` PERF-03, heavy synchronous operations can block the UI thread. While localStorage is typically fast, it's synchronous I/O that can cause jank if the browser's storage subsystem is under load. Additionally, if this function is called rapidly (e.g., during rapid sorting changes), it causes unnecessary writes. The code should debounce the localStorage write or use the async `localforage` for larger data.

- **Why it matters:**
  On slower devices or when the browser is under memory pressure, synchronous localStorage writes can cause noticeable UI stuttering. The sort preference is also not critical data that needs immediate persistence.

- **Severity:** Low ⭕

- **Confidence:** Medium 🤔

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Debounce the localStorage write or use the debounce utility already available in the function's dependencies.

- **Proposed fix:**
  Create a debounced version of the localStorage write using the `debounce` utility passed to `initOrderHelper`, or batch the write with other state changes.

- **Implementation Checklist:**
  - [ ] Create a debounced save function using the provided `debounce` utility
  - [ ] Call the debounced function instead of immediate `localStorage.setItem`
  - [ ] Ensure the debounced function is flushed on page unload to prevent data loss

- **Fix risk:** Low 🟢
  Debouncing is a standard optimization. The `debounce` utility is already available in the function's scope.

- **Why it's safe to implement:**
  Sort preference is not critical real-time data. A short debounce (e.g., 100-250ms) won't affect user experience.

- **Pros:**
  - Reduces unnecessary I/O operations
  - Smoother UI during rapid sort changes
  - Better performance on low-end devices

---

## F04: Redundant helper functions for options/values

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The code has multiple sets of functions that do almost the same thing — getting lists of options and their values for different filter types. This repetition makes the code harder to maintain because the same pattern is written out multiple times.

- **Category:** Redundancy

- **Location:**
  `src/orderHelper.js`, lines 107-157
  
  Four nearly identical function pairs:
  - `getOutletOptions` / `getOutletValues`
  - `getAutomationIdOptions` / `getAutomationIdValues`
  - `getGroupOptions` / `getGroupValues`
  - Plus similar patterns imported from `orderHelperState.js` for strategy and position

- **Detailed Finding:**
  The functions `getOutletOptions`, `getAutomationIdOptions`, and `getGroupOptions` follow an identical pattern: iterate entries, extract values using a getter, collect unique values, sort them, and return options array with a "(none)" default. The corresponding `*Values` functions all just map the options to their values. This is a clear DRY violation. A single parameterized factory function could generate all these, reducing code volume and maintenance burden. The pattern is also repeated in `orderHelperState.js` for strategy and position options.

- **Why it matters:**
  Code duplication increases the risk of inconsistent behavior if one copy is updated but others aren't. It also makes the file harder to read and maintain.

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Create a factory function that generates the options/values function pair given an entry getter and value normalizer.

- **Proposed fix:**
  Create a helper like `createFilterOptionHelpers(entryGetter, valueNormalizer)` that returns `{ getOptions, getValues }`, then use it for outlet, automationId, and group filters.

- **Implementation Checklist:**
  - [ ] Create a factory function for generating option/value helpers
  - [ ] Refactor `getOutletOptions`/`getOutletValues` to use the factory
  - [ ] Refactor `getAutomationIdOptions`/`getAutomationIdValues` to use the factory
  - [ ] Refactor `getGroupOptions`/`getGroupValues` to use the factory
  - [ ] Update exports and ensure all callers still work
  - [ ] Consider applying the same pattern to strategy/position in `orderHelperState.js` (optional)

- **Fix risk:** Low 🟢
  This is a pure refactoring with no behavior change. The functions are internal to this module.

- **Why it's safe to implement:**
  These are internal implementation details. As long as the exported API surface remains the same, callers are unaffected.

- **Pros:**
  - Reduces code duplication
  - Easier maintenance (one place to fix bugs)
  - Consistent behavior across all filter types
  - Smaller bundle size

---

*No further findings.*