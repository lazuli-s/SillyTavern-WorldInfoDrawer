// Pure mapping layer for SillyTavern's `originalData` shadow copy.
//
// SillyTavern keeps a second, v2-spec copy of a lorebook (`data.originalData`)
// whenever the book came from a character card, and mirrors every field write
// into it. This module owns the *decision* of which shadow key(s) a given
// camelCase entry field maps to, and what value to write; the host binding
// lives in `original-data.js`.
//
// It is deliberately host-import-free so it can be unit tested. The
// authoritative key map (`originalWIDataKeyMap`) is passed in by the caller —
// it is read from the host, never re-declared here (R25).

const LOG_PREFIX = '[STWID][ORIGINAL-DATA]';

/**
 * Fields SillyTavern mirrors into `originalData` from bespoke handlers rather
 * than through `originalWIDataKeyMap`, so they are absent from that map even
 * though the host does keep them in sync. Each entry cites the host line it was
 * read from (vendor/SillyTavern/public/scripts/world-info.js).
 */
export const ORIGINAL_DATA_SUPPLEMENTAL_KEY_MAP = Object.freeze({
  characterFilter: 'character_filter', // world-info.js:1414, 3160, 3657
  group: 'extensions.group', // world-info.js:3733
  outletName: 'extensions.outlet_name', // world-info.js:3697
});

/**
 * Fields whose host handler writes more than one shadow key, or writes a key
 * whose value is not simply `entry[field]`. Each function returns the exact
 * `[key, value]` pairs SillyTavern writes for that field.
 */
const COMPOSITE_FIELD_WRITES = Object.freeze({
  // handleEntryKillSwitchHelper — world-info.js:3333. The live field is the
  // inverted `disable`; the shadow key is `enabled`.
  disable: (entry) => [['enabled', !entry.disable]],

  // position select handler — world-info.js:3434-3435. One live field, two
  // shadow keys: the v2-spec string form and the numeric extension form.
  //
  // The host writes a third key there, `extensions.role` (world-info.js:3436),
  // because its own handler also *reassigns* `entry.role` on every position
  // change (3426-3431). This extension's position controls never touch `role`,
  // so mirroring it here would write a role the live entry no longer agrees
  // with — a shadow record neither the host nor the pre-change extension would
  // produce. `role` is mirrored only when something actually writes it.
  position: (entry) => [
    ['position', Number(entry.position) === 0 ? 'before_char' : 'after_char'],
    ['extensions.position', entry.position],
  ],

  // originalWIDataKeyMap maps 'displayIndex', but the extension stores the
  // value at entry.extensions.display_index (world-info.js:2675 does the same).
  displayIndex: (entry) => [['extensions.display_index', entry.extensions?.display_index]],
});

const warnedFields = new Set();

/** Resets the "warn once per field" memory. Test-only seam. */
export function resetOriginalDataWarnings() {
  warnedFields.clear();
}

/**
 * Logs at most one warning per unmapped field name, for the whole session.
 * An unmapped field never blocks the live write (E12).
 * @param {string} field
 */
export function warnUnmappedOriginalDataField(field) {
  if (warnedFields.has(field)) return;
  warnedFields.add(field);
  console.warn(
    LOG_PREFIX,
    `No originalData mapping for entry field "${field}". The live edit is saved normally, ` +
      'but the character-card shadow copy was not updated for this field.',
  );
}

/**
 * Resolves the shadow-copy writes for one entry field.
 *
 * @param {Record<string, string>} keyMap - The host's `originalWIDataKeyMap`.
 * @param {string} field - camelCase entry field name, as written by the extension.
 * @param {object} entry - The entry object, already carrying the new value.
 * @returns {Array<[string, any]>|null} `[key, value]` pairs, or null when unmapped.
 */
export function resolveOriginalDataWrites(keyMap, field, entry) {
  const composite = COMPOSITE_FIELD_WRITES[field];
  if (composite) return composite(entry);

  const key = keyMap?.[field] ?? ORIGINAL_DATA_SUPPLEMENTAL_KEY_MAP[field];
  if (!key) return null;

  // Deliberately reads the value off the entry rather than taking it as an
  // argument: that is what the host does, and it means clearing a field to
  // `undefined` writes `undefined` into the shadow copy instead of deleting
  // the key (R25b).
  return [[key, entry[field]]];
}

/**
 * Mirrors one or more entry-field writes into the shadow copy.
 *
 * Does not guard on `data.originalData` — the host's `setWIOriginalDataValue`
 * already no-ops when the book has no shadow copy, and when no shadow entry
 * matches the uid. Never creating `originalData` where the host did not (E11)
 * is therefore a property of *not* touching `data` here at all.
 *
 * @param {object} params
 * @param {Record<string, string>} params.keyMap - The host's `originalWIDataKeyMap`.
 * @param {(data: object, uid: any, key: string, value: any) => void} params.setValue -
 *   The host's `setWIOriginalDataValue`.
 * @param {object|null|undefined} params.data - Object carrying `originalData`.
 * @param {object|null|undefined} params.entry - The mutated entry.
 * @param {string[]} params.fields - camelCase field names that were written.
 */
export function applyOriginalDataWrites({ keyMap, setValue, data, entry, fields }) {
  if (!data || !entry || typeof setValue !== 'function') return;

  const uid = normalizeShadowUid(entry.uid);

  for (const field of fields) {
    const writes = resolveOriginalDataWrites(keyMap, field, entry);
    if (!writes) {
      warnUnmappedOriginalDataField(field);
      continue;
    }
    for (const [key, value] of writes) {
      setValue(data, uid, key, value);
    }
  }
}

/**
 * Repoints shadow entries at renumbered live uids.
 *
 * The extension's bulk UID renumber has no host equivalent, so there is no host
 * behaviour to copy here. It still has to be handled: shadow entries are matched
 * by uid, so renumbering the live entries without renumbering the shadow leaves
 * every later mirrored write landing on the wrong shadow record — and because a
 * renumber can move one selected entry onto another selected entry's old uid,
 * that is a cross-contamination, not merely staleness.
 *
 * Applied in two passes over a snapshot, so an old uid that is also somebody's
 * new uid cannot be rewritten twice.
 *
 * Only `uid` is touched. The v2 `id` field is left alone: the host matches on
 * `uid` only, and inventing an `id` policy is exactly the kind of guessing R25
 * forbids.
 *
 * @param {object|null|undefined} data - Object carrying `originalData`.
 * @param {Map<any, any>} uidMap - old uid -> new uid.
 */
export function remapOriginalDataUids(data, uidMap) {
  const shadowEntries = data?.originalData?.entries;
  if (!Array.isArray(shadowEntries) || !(uidMap?.size > 0)) return;

  const normalized = new Map();
  for (const [oldUid, newUid] of uidMap) {
    normalized.set(String(normalizeShadowUid(oldUid)), normalizeShadowUid(newUid));
  }

  const pending = [];
  for (const shadowEntry of shadowEntries) {
    const nextUid = normalized.get(String(shadowEntry?.uid));
    if (nextUid === undefined) continue;
    pending.push([shadowEntry, nextUid]);
  }
  for (const [shadowEntry, nextUid] of pending) {
    shadowEntry.uid = nextUid;
  }
}

/**
 * The host matches shadow entries with `x.uid === uid` (strict), and always
 * passes a number. Cache keys are strings, so coerce back to a number when the
 * uid is numeric and leave anything else untouched.
 * @param {any} uid
 */
function normalizeShadowUid(uid) {
  if (typeof uid === 'number') return uid;
  const numeric = Number(uid);
  return Number.isFinite(numeric) && String(numeric) === String(uid).trim() ? numeric : uid;
}
