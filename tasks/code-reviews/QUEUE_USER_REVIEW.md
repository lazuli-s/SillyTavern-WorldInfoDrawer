# User Review Queue

Findings that cannot be implemented without additional input from the user. Each entry summarizes what question needs answering before implementation can proceed.

---

## Findings Pending User Review

### `src/orderHelperRender.js`

#### F01 — Opening Order Helper can silently wipe unsaved editor work (forced editor reset)

- **Source review:** `tasks/code-reviews/CodeReview_orderHelperRender.js.md`
- **Plain-language summary:** Opening Order Helper always clears the entry editor, even if you have unsaved text typed in. This can cause you to lose work.
- **Location:** `src/orderHelperRender.js` → `renderOrderHelper()` — calls `editorPanelApi.resetEditorState()`
- **Why it matters:** Losing unsaved typing is one of the most frustrating failure modes for end users. It also undermines trust in the extension UI.
- **What needs user input:** Confirm whether the current UX already expects "Order Helper clears editor" behavior. Also confirm whether there's an existing dirty-state concept exposed by `getEditorPanelApi()` that we should use to guard against data loss.