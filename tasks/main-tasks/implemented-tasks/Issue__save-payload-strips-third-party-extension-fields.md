# ISSUE: Save payload strips third-party extension fields from lorebook JSON
*Created: April 26, 2026*

**Type:** Bug
**Status:** IMPLEMENTED

---

## Summary

When WI Drawer saves a lorebook, it only writes back the fields it knows about — `entries` and `metadata`. Any extra top-level fields that other extensions (such as STLO) have added to the lorebook JSON are silently dropped. This means that using WI Drawer to edit any entry, toggle it, apply bulk changes, or move a book to a folder will corrupt the file for other extensions that depend on those extra fields.

## Current Behavior

When WI Drawer loads a lorebook, the full JSON is read. But only `entries` and `metadata` are stored in the extension's internal cache. Any other top-level fields — added by STLO or any other extension — are discarded from memory.

When any save action is triggered through WI Drawer, it reconstructs the file from only what is in the cache. The result is a JSON file that contains only `entries` and `metadata`. All other top-level data is permanently gone from the file.

QR scripts are not affected because they write to the lorebook directly through SillyTavern's own API. WI Drawer only observes the change and refreshes its display — it does not save anything in that flow.

## Expected Behavior

When WI Drawer saves a lorebook, the resulting file should contain all of the data that was present when the file was last loaded — including any top-level fields written by other extensions. WI Drawer should only write what it owns, not silently erase what it does not recognize.

## Agreed Scope

Four targeted changes, no behavior changes for existing features:

- **`src/book-browser/book-list/book-list.books-view.js`** — `createCachedBookState`: capture extra top-level fields from the source data and store them as `cache[bookName].extras`.
- **`src/shared/wi-update-handler.js`** — `syncBookEntriesAndDom`: when a `WORLDINFO_UPDATED` event brings fresh data, update `cache[bookName].extras` from the new data so the cache stays in sync.
- **`src/shared/wi-update-handler.js`** — `buildSavePayload`: spread `cache[name].extras` into the payload before `entries` and `metadata`.
- **`src/book-browser/book-browser.js`** — `buildLatestBookSavePayload`: destructure `latest` to extract extras (all fields except `entries` and `metadata`), then spread them into the payload.

## Out of Scope

- The import flow in `book-list.book-menu.js` (`importSingleBook`) intentionally builds a clean new book and only copies `entries` and `metadata`. This is correct behavior for import — it should not carry over another book's third-party extension data.
- Entry-level extra fields (fields inside individual entries beyond the standard WI entry shape) are already preserved because `structuredClone(entryData)` copies everything. No change needed there.

## Implementation Plan

- [x] **`src/book-browser/book-list/book-list.books-view.js` — `createCachedBookState` (line ~30)**

  Destructure `bookData` to separate known fields from extras:

  ```js
  const { entries: rawEntries, metadata: rawMetadata, ...rawExtras } = bookData ?? {};
  const world = {
      entries: {},
      metadata: cloneMetadata(rawMetadata),
      sort: runtime.getSortFromMetadata(rawMetadata),
      extras: structuredClone(rawExtras),
  };
  for (const [entryId, entryData] of Object.entries(rawEntries ?? {})) {
      world.entries[entryId] = structuredClone(entryData);
  }
  ```

  Remove the original `for...of Object.entries(data.entries)` loop and the separate `cloneMetadata(data.metadata)` / `getSortFromMetadata(data.metadata)` calls, which are replaced by the destructure above.

- [x] **`src/shared/wi-update-handler.js` — `syncBookEntriesAndDom` (line ~119)**

  At the start of the function body, after building `world.entries` and `world.metadata`, extract and store extras from the incoming `data`:

  ```js
  const { entries: _entries, metadata: _metadata, ...updatedExtras } = data;
  cache[bookName].extras = structuredClone(updatedExtras);
  ```

  Place this after the existing `world` object is built and before the entry diff loop begins (around line ~195 where `cache[bookName].entries` is assigned).

- [x] **`src/shared/wi-update-handler.js` — `buildSavePayload` (line ~316)**

  Spread the cached extras at the front of the payload so that `entries` and `metadata` always win on key conflicts:

  ```js
  const buildSavePayload = (name) => ({
      ...cache[name].extras,
      entries: structuredClone(cache[name].entries),
      metadata: cloneMetadata(cache[name].metadata),
  });
  ```

- [x] **`src/book-browser/book-browser.js` — `buildLatestBookSavePayload` (line ~253)**

  Destructure `latest` to extract extras, then spread them at the front:

  ```js
  const buildLatestBookSavePayload = (latest) => {
      const { entries, metadata, ...rest } = latest ?? {};
      return {
          ...rest,
          entries: structuredClone(entries ?? {}),
          metadata: metadata && typeof metadata === 'object' ? structuredClone(metadata) : {},
      };
  };
  ```

---

## After Implementation
*Implemented: April 26, 2026*

### What changed

- `src/book-browser/book-list/book-list.books-view.js`
  The in-memory book cache now keeps any extra top-level lorebook fields instead of dropping them during load.
  Known fields still stay in the normal `entries` and `metadata` slots.

- `src/shared/wi-update-handler.js`
  The live update path now refreshes cached extra fields when SillyTavern reports a lorebook update.
  The normal save payload now includes those extra fields before `entries` and `metadata`.

- `src/book-browser/book-browser.js`
  The metadata-save path now preserves third-party top-level lorebook fields when moving books between folders or saving per-book sort metadata.

### Risks / What might break

- This touches the shared save payload paths, so a mistake here would affect several WI Drawer save actions instead of only one button.
- If another extension writes a top-level field named `entries` or `metadata`, WI Drawer will still let its own `entries` and `metadata` win on save.

### Manual checks

- Open a lorebook JSON that contains a custom top-level field from another extension, edit an entry in WI Drawer, save, and confirm that custom field is still present afterward.
- Move a lorebook with a custom top-level field into or out of a folder, then confirm both the folder move and the custom field are preserved.
- Change a per-book sort setting, save, and confirm the sort change worked and the third-party top-level field still remains in the lorebook data.
