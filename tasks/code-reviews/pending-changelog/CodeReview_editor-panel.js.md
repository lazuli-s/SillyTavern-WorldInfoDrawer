# CODE REVIEW FINDINGS: `src/editor-panel/editor-panel.js`
*Reviewed: March 12, 2026*

## Scope

- **File reviewed:** `src/editor-panel/editor-panel.js`
- **Helper files consulted:** none
- **Skills applied:** `st-js-best-practices`, `st-world-info-api`, `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`
- **FEATURE_MAP stated responsibilities:** Entry editor render pipeline; editor dirty tracking during refresh; editor reset and clear; active-row highlight control; editor focus/unfocus UI toggles; embedded global activation settings panel (`#wiActivationSettings`); Additional Matching Sources section wiring.

---

## F01: Focus Mode Persists After Editor Is Cleared

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The editor panel has a "Focus" button that expands the editor to fill more of the screen. When the user focuses the editor and then navigates to a different entry (or closes the editor entirely), the focus mode is never turned off. The next entry they open will already appear in the expanded/focused state — even though they never asked for it.

- **Category:** UI Correctness

- **Location:**
  `src/editor-panel/editor-panel.js` — `clearEditor` (line 256) and `createFocusToggleButton` (line 305)

- **Detailed Finding:**
  The focus toggle button's click handler calls `dom.editor.classList.toggle(FOCUS_CLASS)`, which adds or removes the CSS class `stwid--focus` on `dom.editor`. This class controls the expanded layout. The `clearEditor` function (which fires every time a new entry editor is opened, or when the editor is closed/reset) calls `dom.editor.innerHTML = ''` to clear the editor contents, but it never removes `FOCUS_CLASS` from `dom.editor`. As a result, the class persists on the container element across editor sessions. When the next entry editor is rendered into the same `dom.editor` container, it inherits the focused state from the previous session.

  The focus button and unfocus button are both injected into `dom.editor.innerHTML` and are therefore destroyed by `clearEditor`, but the CSS class controlling the layout lives on the container and survives. No other code path removes `FOCUS_CLASS` from `dom.editor`.

- **Why it matters:**
  Users opening a second or subsequent entry after using Focus mode will unexpectedly find the editor pre-expanded. This is disorienting and may make users think Focus is stuck or broken. They would need to click the Unfocus button in the new editor to return to normal — but that button only appears after the new entry editor renders, and its presence depends on the entry being open. If the editor is closed (not on any entry), there is no visible button to turn off Focus mode.

- **Severity:** Medium ❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Remove `FOCUS_CLASS` from `dom.editor` whenever the editor is cleared. The safest place is inside `clearEditor`, so that all code paths that clear the editor also clean up the focus state.

- **Proposed fix:**
  In the `clearEditor` function (line 256–265), add `dom.editor.classList.remove(FOCUS_CLASS)` after the `innerHTML = ''` assignment. This ensures every editor clear — whether triggered by navigation, activation settings toggle, or reset — restores the unfocused state.

- **Implementation Checklist:**
  - [ ] In `clearEditor`, after `dom.editor.innerHTML = ''` (line 257), add `dom.editor.classList.remove(FOCUS_CLASS);`

- **Fix risk:** Low 🟢
  The change touches only the CSS class on the container. It does not affect dirty tracking, `currentEditorKey`, or any other state. The focus button rendered in each new entry editor will still work correctly — it toggles the class fresh each time.

- **Why it's safe to implement:**
  Only the `FOCUS_CLASS` string constant (`'stwid--focus'`) is referenced. All other `clearEditor` behaviors (innerHTML reset, ownership state reset) are unchanged. The `resetEditorState`, `hideActivationSettings`, `toggleActivationSettings`, and `renderActivationSettings` paths all eventually call `clearEditor`, so they all benefit automatically.

- **Pros:**
  Eliminates an unexpected sticky UI state that silently carries over across editor sessions. Users regain predictable, per-entry focus behavior.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/editor-panel/editor-panel.js`
  - Added `dom.editor.classList.remove(FOCUS_CLASS);` in `clearEditor` immediately after `dom.editor.innerHTML = ''`

- Risks / Side effects
  - Focus resets on every clear, including re-opening the same entry (probability: ⭕)
    - **🟥 MANUAL CHECK**: [ ] Open an entry, click Focus, navigate to a second entry — confirm it opens un-focused. Also click Focus, then re-open the same entry — confirm it opens un-focused.

---

## F02: Non-Editing Key Set Reconstructed on Every Keydown Event

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Every time the user presses a key while the editor is open, the extension builds a brand-new list of "non-editing keys" (Shift, Control, Escape, arrows, etc.) from scratch, just to check whether the pressed key is in that list. The list never changes, so building it on every keystroke wastes memory allocations that could easily be avoided.

- **Category:** Performance

- **Location:**
  `src/editor-panel/editor-panel.js` — `shouldMarkDirtyOnKeydown` (lines 215–241)

- **Detailed Finding:**
  Inside `shouldMarkDirtyOnKeydown`, a `new Set([...])` is constructed containing 14 non-editing key names every time the function is called. The function is invoked on every `keydown` event via the capturing listener registered in `wireEditorDirtyTracking`. Because `Set` construction requires allocating a new object and populating it, this is an unnecessary allocation on a hot event path. The set contents are compile-time constants and never vary at runtime.

- **Why it matters:**
  In typical usage, every keystroke while an entry editor is open triggers a `new Set(...)` allocation. While modern JavaScript engines are fast at this, accumulating many short-lived allocations on a high-frequency event handler increases garbage collection pressure. For power users who type long content entries, this adds measurable churn. It also obscures intent — a reader unfamiliar with the code may not immediately recognize that the Set is a constant.

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Hoist the `Set` out of `shouldMarkDirtyOnKeydown` and define it once as a module-level or closure-level constant, so it is created exactly once and reused on every keydown event.

- **Proposed fix:**
  Define `const NON_EDITING_KEYS = new Set([...])` at module scope (alongside the other constants at the top of the file) and replace `const nonEditingKeys = new Set([...])` inside `shouldMarkDirtyOnKeydown` with a reference to `NON_EDITING_KEYS`. The check `if (nonEditingKeys.has(pressedKey))` becomes `if (NON_EDITING_KEYS.has(pressedKey))`.

- **Implementation Checklist:**
  - [ ] At module scope (after the existing string constants, around line 9), add:
    ```js
    const NON_EDITING_KEYS = new Set([
        'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
        'Tab', 'Escape', 'Enter',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'PageUp', 'PageDown', 'Home', 'End',
    ]);
    ```
  - [ ] Inside `shouldMarkDirtyOnKeydown`, remove the `const nonEditingKeys = new Set([...])` declaration (lines 218–235).
  - [ ] Replace `if (nonEditingKeys.has(pressedKey)) return false;` (line 236) with `if (NON_EDITING_KEYS.has(pressedKey)) return false;`

- **Fix risk:** Low 🟢
  Pure refactor — logic and key list are unchanged. The constant is never mutated, so module-scope placement is safe for all call sites.

- **Why it's safe to implement:**
  `shouldMarkDirtyOnKeydown` is a pure function with no side effects. The Set contents are identical to what they were; only the allocation site changes. No other functions are touched.

- **Pros:**
  Eliminates a recurring allocation on a high-frequency event handler. Makes the constant nature of the key list explicit and easier to read.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/editor-panel/editor-panel.js`
  - Added `const NON_EDITING_KEYS = new Set([...])` at module scope after the string constants
  - Removed the local `const nonEditingKeys = new Set([...])` from inside `shouldMarkDirtyOnKeydown`
  - Replaced `nonEditingKeys.has(pressedKey)` with `NON_EDITING_KEYS.has(pressedKey)`

---

## F03: RAF Retry Loop Retains Orphaned `editDom` Subtree After Editor Is Cleared

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When an entry editor opens, the extension schedules repeated animation-frame retries to finish wiring up a collapsible section of the editor. If the user navigates to another entry before those retries finish, the old editor's DOM is removed from the page — but the retry loop keeps running for up to 30 more frames, holding the removed content in memory and attaching an event listener to a part of the page the user can no longer see. This is a bounded, temporary memory leak.

- **Category:** Race Condition

- **Location:**
  `src/editor-panel/editor-panel.js` — `wireAmsDrawerSection` (lines 120–149) and `openEntryEditor` (line 373)

- **Detailed Finding:**
  `wireAmsDrawerSection(editDom)` looks for `.userSettingsInnerExpandable` inside `editDom`. If the element is not yet in the DOM (because the ST template renders asynchronously), it schedules a `requestAnimationFrame` retry: `requestAnimationFrame(() => wireAmsDrawerSection(editDom, attempts + 1))`. This loop runs up to 30 times.

  `openEntryEditor` calls `wireAmsDrawerSection(editDom)` after appending `editDom` to `dom.editor`. If the user then opens a second entry, `renderEntryEditorDom` calls `clearEditor({ resetCurrent: false })` which sets `dom.editor.innerHTML = ''`, detaching `editDom` from the live document tree.

  However, the already-scheduled RAF callbacks still hold a closure reference to the first `editDom`. Each retry queries within the detached subtree, and once the target element is found (in the detached tree), it marks the element as wired and attaches a click listener to the orphaned node. The detached `editDom` subtree — which may be a sizeable chunk of HTML — is kept alive in memory by the RAF closure chain for up to ~500 ms (30 × ~16 ms). After all retries complete (or the element is found and wired), the closure chain ends and the detached tree can be garbage collected.

  There is no guard in `wireAmsDrawerSection` to check whether `editDom` is still attached to the live document before continuing.

- **Why it matters:**
  In typical usage (user rapidly browses entries), multiple detached subtrees can be in memory simultaneously while their RAF loops drain. For entries with large editor DOM trees, this can transiently inflate memory usage. The attached click listener on the orphaned element fires only if the element is clicked — which is impossible since it is detached — so there is no functional bug, but it is a PERF-02 listener-hygiene violation (listeners added, not removed from orphaned nodes). After GC the leaks fully resolve, so the impact is transient rather than cumulative.

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add an early-exit guard at the top of each RAF retry to check whether `editDom` is still attached to the document. If it has been detached, abort the retry immediately without wiring anything.

- **Proposed fix:**
  At the start of `wireAmsDrawerSection`, before the `querySelector` calls, add:
  ```js
  if (!document.contains(editDom)) return;
  ```
  This single check makes all retry iterations self-cancelling the moment `editDom` is removed from the DOM.

- **Implementation Checklist:**
  - [ ] In `wireAmsDrawerSection` (line 120), add `if (!document.contains(editDom)) return;` as the very first line of the function body, before the `querySelector` calls.

- **Fix risk:** Low 🟢
  `document.contains()` is a standard DOM API available in all browsers that run SillyTavern. It returns `false` for detached nodes and `true` for nodes in the live document. The guard only fires when `editDom` has been removed; it has no effect on the normal path where wiring succeeds on the first or an early retry. The event-listener wiring behavior for attached `editDom` nodes is completely unchanged.

- **Why it's safe to implement:**
  The guard is a pure read — no state mutation. The only code path affected is the RAF retry when `editDom` is detached, which currently runs wasted iterations anyway. The successful (attached) path is unaffected.

- **Pros:**
  Eliminates transient memory retention of detached editor subtrees. Prevents orphaned event listeners from being attached to detached DOM nodes. No functional behavior changes on the normal path.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/editor-panel/editor-panel.js`
  - Added `if (!document.contains(entryEditorDom)) return;` as the first line of `wireAmsDrawerSection`
