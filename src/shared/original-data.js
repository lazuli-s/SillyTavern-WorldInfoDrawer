// Host binding for SillyTavern's `originalData` shadow copy.
//
// A lorebook that came from a character card carries `originalData` — a v2-spec
// mirror of itself that SillyTavern re-exports with the card. The host updates
// that mirror on every field write; this module is how the extension does the
// same, so a card-embedded book edited in the drawer re-exports identically.
//
// The camelCase -> shadow-key mapping is imported from the host, never
// re-declared (R25). All decision logic lives in `original-data.mapping.js`,
// which is host-import-free and unit tested.

import { originalWIDataKeyMap, setWIOriginalDataValue } from './st-host.js';
import { applyOriginalDataWrites, remapOriginalDataUids } from './original-data.mapping.js';

/**
 * Mirrors entry-field writes into the book's `originalData` shadow copy.
 *
 * Call it right after mutating the cached entry and before saving. Safe to call
 * unconditionally: for an ordinary standalone lorebook (no `originalData`) the
 * host helper no-ops, and nothing here ever creates a shadow copy (E11). A
 * field with no known mapping logs one warning and is skipped, never blocking
 * the live write (E12).
 *
 * @param {object} book - The cached book (`cache[bookName]`). Its `extras` is
 *   everything `loadWorldInfo` returned minus entries and metadata — which is
 *   exactly where `originalData` ends up, and what `buildSavePayload` spreads
 *   back into the saved file.
 * @param {object} entry - The entry that was just mutated.
 * @param {string[]} fields - camelCase names of the fields that were written.
 */
export function mirrorEntryFieldsToOriginalData(book, entry, fields) {
  mirrorRawBookFieldsToOriginalData(book?.extras, entry, fields);
}

/**
 * Same, for a raw host book straight from `loadWorldInfo` (which carries
 * `originalData` at its top level rather than under `extras`).
 *
 * @param {object} data - A host-shaped book object.
 * @param {object} entry - The entry that was just mutated.
 * @param {string[]} fields - camelCase names of the fields that were written.
 */
export function mirrorRawBookFieldsToOriginalData(data, entry, fields) {
  applyOriginalDataWrites({
    keyMap: originalWIDataKeyMap,
    setValue: setWIOriginalDataValue,
    data,
    entry,
    fields,
  });
}

/**
 * Repoints a cached book's shadow entries at renumbered live uids, so later
 * mirrored writes still land on the right shadow record. Call it from the bulk
 * UID renumber, with the same old -> new mapping applied to the live entries.
 *
 * @param {object} book - The cached book (`cache[bookName]`).
 * @param {Map<any, any>} uidMap - old uid -> new uid.
 */
export function remapEntryUidsInOriginalData(book, uidMap) {
  remapOriginalDataUids(book?.extras, uidMap);
}
