# CODE REVIEW FINDINGS: `src/drawer.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/drawer.js`
- **Helper files consulted:** `ARCHITECTURE.md`, `FEATURE_MAP.md`, `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`, `skills/st-world-info-api/references/wi-api.md`, `skills/st-js-best-practices/references/patterns.md`
- **Skills applied:** `st-js-best-practices`, `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** Drawer DOM bootstrap and panel wiring; top control row (new book, new folder, import, collapse/expand, activation settings, refresh); list/editor splitter drag resize with saved state; keyboard handling for selected-entry delete; Order Helper open/close orchestration

---

## F01: Direct Imports from ST Core Modules Bypass Stable Context API

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The code imports functions directly from SillyTavern's internal file paths instead of using the stable `getContext()` API. If SillyTavern reorganizes its files in a future update, this extension could break.

- **Category:** JS Best Practice

- **Location:**
  `src/drawer.js`, lines 1-7 (import statements at top of file)

- **Detailed Finding:**
  The file imports directly from SillyTavern core modules:
  - `import { getRequestHeaders } from '../../../../../script.js';`
  - `import { extensionNames } from '../../../../extensions.js';`
  - `import { Popup } from '../../../../popup.js';`
  - `import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';`
  - `import { renderTemplateAsync } from '../../../../templates.js';`
  - `import { debounce, debounceAsync, delay, download, getSortableDelay, isTrueBoolean, uuidv4 } from '../../../../utils.js';`
  - `import { createNewWorldInfo, createWorldInfoEntry, deleteWIOriginalDataValue, deleteWorldInfo, deleteWorldInfoEntry, getFreeWorldName, getWorldEntry, loadWorldInfo, onWorldInfoChange, saveWorldInfo, selected_world_info, world_names } from '../../../../world-info.js';`
  
  Per `st-js-best-practices` COMPAT-01, direct imports from ST source files may break when SillyTavern is updated. The context API is the stable, documented surface. Some of these imports (like `renderTemplateAsync`, `loadWorldInfo`, `saveWorldInfo`) are available via `SillyTavern.getContext()`.

- **Why it matters:**
  If SillyTavern moves or renames these internal modules, the extension will fail to load or throw runtime errors. This creates maintenance burden and potential breakages for users when they update SillyTavern.

- **Severity:** Medium ❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Replace direct imports with `SillyTavern.getContext()` where the APIs are available on the context. For APIs not available on context (some utilities), document why direct import is necessary and monitor for upstream changes.

- **Proposed fix:**
  1. Replace `renderTemplateAsync`, `loadWorldInfo`, `saveWorldInfo`, `getWorldEntry` imports with context API equivalents.
  2. For `Popup`, `SlashCommandParser`, and utilities, evaluate if they can be obtained via context or if direct import must remain (add code comments explaining why).
  3. Update `world_names` and `selected_world_info` to use context equivalents if available, or add defensive checks.

- **Implementation Checklist:**
  - [ ] Identify which imported APIs are available via `SillyTavern.getContext()`
  - [ ] Replace context-available imports with `const { apiName } = SillyTavern.getContext();`
  - [ ] Add code comments for any remaining direct imports explaining why they must stay
  - [ ] Test that drawer functionality still works after changes

- **Fix risk:** Medium 🟡
  - Risk: Context API might expose slightly different signatures than direct imports
  - Risk: Some APIs may not be available on context, requiring fallback logic

- **Why it's safe to implement:**
  The context API is the documented stable surface per SillyTavern's extension guidelines. Changes are localized to import statements and won't affect business logic.

- **Pros:**
  - Future-proofs the extension against ST internal restructuring
  - Follows SillyTavern extension best practices
  - Easier maintenance when upgrading ST versions

---

## F02: MutationObserver `moSel` Never Disconnected

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  A MutationObserver is created to watch for changes in the world editor selector, but it's never stopped when the extension is unloaded. This means it keeps watching even after the extension is disabled, which uses memory unnecessarily.

- **Category:** Performance

- **Location:**
  `src/drawer.js`, lines ~785-789:
  ```javascript
  const moSelTarget = document.querySelector('#world_editor_select');
  if (moSelTarget) {
      const moSel = new MutationObserver(()=>wiHandlerApi.updateWIChangeDebounced());
      moSel.observe(moSelTarget, { childList:true });
  }
  ```

- **Detailed Finding:**
  The `moSel` MutationObserver is created when the drawer initializes but is never disconnected. While there is a `beforeunload` cleanup handler that removes keyboard listeners and calls cleanup functions, `moSel.disconnect()` is not called there. This creates a memory leak if the extension is reloaded or if SillyTavern's extension system allows hot-reloading.

- **Why it matters:**
  MutationObservers hold references to DOM elements and prevent garbage collection. Over time, multiple extension reloads could accumulate orphaned observers, increasing memory usage and potentially causing performance issues.

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Store the MutationObserver reference and disconnect it in the existing `beforeunload` cleanup handler.

- **Proposed fix:**
  1. Move `moSel` declaration outside the `if` block or make it accessible to cleanup
  2. Add `moSel?.disconnect()` to the `beforeunload` cleanup handler alongside other cleanup calls

- **Implementation Checklist:**
  - [ ] Declare `moSel` variable at function scope (around line 140, near other cleanup-tracked variables)
  - [ ] Assign the MutationObserver to this variable when created
  - [ ] Add `moSel?.disconnect();` to the `beforeunload` cleanup handler (around line 145)

- **Fix risk:** Low 🟢
  - Simple cleanup addition, no behavioral changes
  - Follows existing cleanup pattern in the file

- **Why it's safe to implement:**
  The cleanup only runs during extension teardown. Adding a disconnect call is purely defensive and won't affect normal operation.

- **Pros:**
  - Prevents memory leaks during extension reloads
  - Follows best practice of cleaning up observers
  - Consistent with other cleanup in the file

---

## F03: `moDrawer` MutationObserver Never Disconnected

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Another MutationObserver watches for when the drawer becomes visible, but like F02, it's never stopped when the extension unloads, causing a memory leak.

- **Category:** Performance

- **Location:**
  `src/drawer.js`, lines ~791-807:
  ```javascript
  const moDrawer = new MutationObserver(()=>{
      const style = drawerContent.getAttribute('style') ?? '';
      if (style.includes('display: none;')) return;
      restoreSplitterForCurrentLayout();
      // ... editor restore logic
  });
  moDrawer.observe(drawerContent, { attributes:true, attributeFilter:['style'] });
  ```

- **Detailed Finding:**
  The `moDrawer` MutationObserver monitors the drawer's `style` attribute to detect when it becomes visible and restore splitter/editor state. This observer is created but never disconnected in the cleanup handler. Since it observes `drawerContent` which is a persistent DOM element, this creates a memory leak if the extension reloads.

- **Why it matters:**
  The observer holds a reference to the drawer DOM element and its callback closure, preventing garbage collection. This compounds with F02 to increase memory pressure.

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Store the MutationObserver reference at outer scope and disconnect it in the `beforeunload` cleanup handler.

- **Proposed fix:**
  1. Declare `moDrawer` at function scope near other tracked references
  2. Add `moDrawer?.disconnect();` to the `beforeunload` cleanup handler

- **Implementation Checklist:**
  - [ ] Declare `moDrawer` variable at function scope (around line 140)
  - [ ] Remove `const` keyword when assigning the MutationObserver (line ~791)
  - [ ] Add `moDrawer?.disconnect();` to the `beforeunload` cleanup handler

- **Fix risk:** Low 🟢
  - Simple cleanup addition matching existing patterns
  - No behavioral changes

- **Why it's safe to implement:**
  Cleanup only runs on extension teardown, won't affect normal drawer operation.

- **Pros:**
  - Prevents memory leaks
  - Consistent with cleanup pattern for other observers
  - Good hygiene for extension lifecycle management

---

## F04: Selection Visibility Check Race Condition in Delete Handler

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When the user presses Delete to remove selected entries, the code first checks if the entries are visible on screen. However, this check happens at one moment, and the actual deletion happens later. If the user quickly changes filters between the check and the deletion, the wrong entries might get deleted.

- **Category:** Race Condition

- **Location:**
  `src/drawer.js`, `onDrawerKeydown` function, Delete case, lines ~105-135:
  ```javascript
  const isSelectionVisible = ()=>{
      const bookRoot = cache[selectFrom]?.dom?.root;
      if (!bookRoot) return false;
      if (bookRoot.classList.contains('stwid--filter-visibility') ||
          bookRoot.classList.contains('stwid--filter-query')) return false;
      return selectedUids.every((uid)=>{
          const entryRoot = cache[selectFrom]?.dom?.entry?.[uid]?.root;
          return entryRoot && !entryRoot.classList.contains('stwid--filter-query');
      });
  };
  if (!isSelectionVisible()) {
      const count = selectedUids.length;
      const noun = count === 1 ? 'entry is' : 'entries are';
      const confirmed = await Popup.show.confirm(...);
      if (!confirmed) return;
  }
  const srcBook = await loadWorldInfo(selectFrom);
  // ... deletion loop
  ```

- **Detailed Finding:**
  The `isSelectionVisible()` function checks DOM classes synchronously, but between this check and the actual deletion (after `await loadWorldInfo()` and potential user confirmation), the filter state could change. A user could:
  1. Have entries selected
  2. Press Delete (visibility check shows entries visible)
  3. User or another async process changes filters, hiding entries
  4. User confirms deletion (if confirmation was shown)
  5. Entries are deleted despite now being hidden
  
  The snapshot of `selectFrom` and `selectedUids` is good, but the visibility check result becomes stale after any `await`.

- **Why it matters:**
  Users might accidentally delete entries they didn't intend to delete if filter states change during the delete flow. This is a data integrity issue.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Re-check visibility immediately before performing the deletion, or move the visibility check after loading the book data.

- **Proposed fix:**
  Move the `isSelectionVisible()` call to after `loadWorldInfo()` returns and immediately before the deletion loop. If visibility changed, show a new confirmation dialog explaining that the entries are now hidden.

- **Implementation Checklist:**
  - [ ] Move `isSelectionVisible()` call to after `const srcBook = await loadWorldInfo(selectFrom);`
  - [ ] Add early return if `!srcBook` (already exists)
  - [ ] Re-check visibility; if changed to hidden, show confirmation with updated message
  - [ ] Only proceed with deletion after this second check

- **Fix risk:** Low 🟢
  - Changes order of operations but not the overall flow
  - Adds one more check, doesn't remove existing safety

- **Why it's safe to implement:**
  The fix adds a safety check without changing the deletion logic itself. The confirmation dialog behavior remains the same.

- **Pros:**
  - Prevents accidental deletion of entries that became hidden during the async flow
  - Better user experience with accurate visibility information
  - More robust against race conditions

---

## F05: Potential Stale Reference to `selectionState`

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The code gets a reference to the selection state object at startup and keeps using it forever. If the list panel is recreated or reset, this reference might point to old data that no longer matches what's on screen.

- **Category:** Data Integrity

- **Location:**
  `src/drawer.js`, lines ~260-261 and ~270-273:
  ```javascript
  selectionState = listPanelApi.getSelectionState();
  // ... later used in onDrawerKeydown:
  const selectFrom = selectionState.selectFrom;
  const selectedUids = [...(selectionState.selectList ?? [])];
  ```

- **Detailed Finding:**
  `selectionState` is obtained once during drawer initialization via `listPanelApi.getSelectionState()`. The keyboard handler `onDrawerKeydown` uses this reference to get the current selection. However, if `listPanelApi` is recreated or its internal state is reset (e.g., during a full list refresh), the `selectionState` reference could become stale or point to a detached state object.

  The code does set up `setWorldEntryContext` with getters/setters for selection properties, suggesting there was awareness of reference management, but `onDrawerKeydown` directly accesses the `selectionState` object instead of going through the context or re-querying from `listPanelApi`.

- **Why it matters:**
  If the selection state becomes stale, the Delete key could operate on entries that are no longer selected, or fail to operate on newly selected entries. This could lead to accidental deletions or confusing UX where Delete appears broken.

- **Severity:** Medium ❗

- **Confidence:** Low 😔

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Access selection state through `listPanelApi.getSelectionState()` in the keyboard handler instead of caching the reference, or verify the reference is still valid before use.

- **Proposed fix:**
  Replace direct `selectionState` access in `onDrawerKeydown` with a fresh call to `listPanelApi.getSelectionState()`. Since `listPanelApi` is available in scope, this ensures we always have the current state.

- **Implementation Checklist:**
  - [ ] In `onDrawerKeydown`, replace `selectionState.selectFrom` with `listPanelApi.getSelectionState().selectFrom`
  - [ ] Similarly update `selectionState.selectList` access
  - [ ] Consider removing the `selectionState` variable entirely if no longer needed, or keep it only for initial setup

- **Fix risk:** Low 🟢
  - Simple reference change, no logic modification
  - `listPanelApi` is already available in the closure

- **Why it's safe to implement:**
  The fix only changes how the state is accessed, not what is done with it. All existing validation logic remains unchanged.

- **Pros:**
  - Eliminates risk of stale state references
  - More robust against list panel lifecycle changes
  - Consistent with defensive programming practices

---

*No additional findings. File has good patterns for data integrity (dirty checks before mode switches), performance (RAF for splitter, debounced resize), and follows most API contracts.*