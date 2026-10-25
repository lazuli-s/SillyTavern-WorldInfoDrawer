// Entry editor — the Entry tags row's write path.
//
// Every change writes the id list into two copies of the entry and saves:
// - the drawer cache's entry, which every other drawer save is built from;
// - the entry object the host editor was rendered with (`getWorldEntry`'s
//   payload). The host's own field handlers write into that object and save
//   all of it, so a tag missing there would be erased by the next keystroke
//   in the editor.
// The save is the drawer's per-book queue. Its payload is the cache with this
// one entry taken from the host editor's copy: an immediate save cancels the
// host's pending debounced save, so building it from the cache alone would
// drop whatever the user typed in the last second.
//
// The row itself — pills, dropdown, focus — is `editor-panel.entry-tags.js`.

import {
  ENTRY_TAGS_FIELD,
  createEntryTag,
  readEntryTagIds,
  writeEntryTagIds,
} from '../shared/entry-tags.js';
import {
  mirrorEntryFieldsToOriginalData,
  mirrorRawBookFieldsToOriginalData,
} from '../shared/original-data.js';

const findShadowEntryIndex = (book, uid) =>
  Array.isArray(book?.originalData?.entries)
    ? book.originalData.entries.findIndex((shadow) => String(shadow?.uid) === String(uid))
    : -1;

/**
 * The payload a tag save writes: the drawer's cache-built payload, with the
 * open entry — and its `originalData` shadow record — taken from the host
 * editor's copy, which holds both the new tags and any edit the host has not
 * saved yet. Other entries keep the cache's values, which may be newer than
 * the editor's snapshot of them. An entry no longer in the cache is not
 * brought back.
 * @param {{ basePayload: object, editorPayload: object, uid: string|number }} args
 * @returns {object} `basePayload`, updated in place.
 */
export function buildEntryTagsSavePayload({ basePayload, editorPayload, uid }) {
  const editorEntry = editorPayload?.entries?.[uid];
  if (!editorEntry || !basePayload?.entries?.[uid]) return basePayload;
  basePayload.entries[uid] = structuredClone(editorEntry);

  const editorShadowIndex = findShadowEntryIndex(editorPayload, uid);
  const baseShadowIndex = findShadowEntryIndex(basePayload, uid);
  if (editorShadowIndex >= 0 && baseShadowIndex >= 0) {
    basePayload.originalData.entries[baseShadowIndex] = structuredClone(
      editorPayload.originalData.entries[editorShadowIndex],
    );
  }
  return basePayload;
}

export const sameEntryTagIds = (a, b) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

/**
 * Builds the write path for one open entry's tags. The returned function
 * applies the ids synchronously — so the caller can re-render straight after
 * calling it — then queues the save. A failed save is reported and the ids go
 * back to what they were, unless a later change has already replaced them.
 * @param {object} args
 * @param {string} args.bookName
 * @param {string|number} args.uid
 * @param {object} args.cache - The drawer's book cache.
 * @param {object} args.editorPayload - The book object the host editor was rendered with.
 * @param {object} args.editorEntry - `editorPayload.entries[uid]`.
 * @param {(bookName: string) => object} args.buildSavePayload
 * @param {(bookName: string, saveThunk: () => Promise<void>) => Promise<void>} args.enqueueBookSave
 * @param {(name: string, data: object, immediately: boolean) => Promise<void>} args.saveWorldInfo
 * @param {(error: unknown) => void} args.onFailure
 * @returns {(nextIds: string[]) => Promise<boolean>} Resolves true when saved.
 */
export function createEntryTagsCommit({
  bookName,
  uid,
  cache,
  editorPayload,
  editorEntry,
  buildSavePayload,
  enqueueBookSave,
  saveWorldInfo,
  onFailure,
}) {
  const applyIds = (ids) => {
    const written = writeEntryTagIds(editorEntry, ids);
    mirrorRawBookFieldsToOriginalData(editorPayload, editorEntry, [ENTRY_TAGS_FIELD]);
    const cachedEntry = cache[bookName]?.entries?.[uid];
    if (cachedEntry) {
      writeEntryTagIds(cachedEntry, written);
      mirrorEntryFieldsToOriginalData(cache[bookName], cachedEntry, [ENTRY_TAGS_FIELD]);
    }
    return written;
  };

  return async (nextIds) => {
    const previous = readEntryTagIds(editorEntry);
    const written = applyIds(nextIds);
    try {
      await enqueueBookSave(bookName, () =>
        saveWorldInfo(
          bookName,
          buildEntryTagsSavePayload({
            basePayload: buildSavePayload(bookName),
            editorPayload,
            uid,
          }),
          true,
        ),
      );
      return true;
    } catch (error) {
      if (sameEntryTagIds(readEntryTagIds(editorEntry), written)) applyIds(previous);
      onFailure(error);
      return false;
    }
  };
}

/**
 * Creates a tag from the typed name (random colour, no emoji), stores it in
 * the global list, then attaches it. The tag is stored before the entry save
 * starts, so it stays in the list even when that save fails.
 * @param {object} args
 * @param {{ entryTags: object[], save: () => void }} args.settings
 * @param {string} args.rawName
 * @param {string[]} args.currentIds
 * @param {(nextIds: string[]) => Promise<boolean>} args.commit
 * @returns {Promise<{ ok: true, tag: object, saved: boolean } | { ok: false, reason: string }>}
 */
export async function createAndAttachEntryTag({ settings, rawName, currentIds, commit }) {
  const result = createEntryTag(settings.entryTags, rawName);
  if (!result.ok) return result;
  settings.entryTags = result.tags;
  settings.save();
  const saved = await commit([...currentIds, result.tag.id]);
  return { ok: true, tag: result.tag, saved };
}
