# Issue: Key Textarea Transition Snap When Switching Entries

## Problem

When switching between entries in the editor, the `keyprimarytextpole` textarea (comma-separated key list) can have very different heights. An entry with many keys is tall (multi-line), while an entry with few keys is short (1 line).

The editor shows a jarring three-state visual transition:
1. **Old entry A** (tall textarea)
2. **Empty editor** — blank intermediate state while async fetches run
3. **New entry B** (short textarea)

The collapse-to-empty then re-expand is what looks bad.

## Root Cause

`openEntryEditor` calls `clearEditor()` **immediately** (before async work), then awaits `renderTemplateAsync` and `getWorldEntry`. This blank gap is visible to the user.

A secondary issue: `initScrollHeight` runs inside `getWorldEntry()` while the element is off-DOM, so `scrollHeight = 0` and the function does nothing. Key textareas may not be correctly sized on first render.

## Fix

**File:** `src/editorPanel.js` — `openEntryEditor` function

1. Defer `clearEditor` + `appendUnfocusButton` to **after** both async calls finish.
2. Add post-insert height correction for `.keyprimarytextpole` and `.keysecondarytextpole`.

The result: the old entry stays visible until the new one is ready, then the swap is atomic (one frame). The list item still highlights immediately for click feedback.

## Status

Completed.
