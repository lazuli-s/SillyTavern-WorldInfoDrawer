// Entry tags — pure logic over the tag definitions list and the id list each
// entry carries.
//
// The definitions (id, name, emoji, colour; the list order is the manual order)
// live in the extension's own settings (`settings.js` → `entryTags`). Each entry
// stores only the ids of its tags, under `extensions[ENTRY_TAGS_EXTENSION_KEY]`:
// `extensions` is the one place on an entry that survives saving, duplicating,
// moving and export into a character card, and ids mean a rename never touches a
// book.
//
// Every function here takes its inputs and returns a result; nothing is read
// from the host and nothing outside the arguments is mutated, except the entry
// handed to `writeEntryTagIds` and the element handed to `paintEntryTagPill`.
// The editor, the Book Browser and the Entry Manager all read this module,
// which is why it lives in `shared/`.

/** Key inside an entry's `extensions` object holding its list of tag ids. */
export const ENTRY_TAGS_EXTENSION_KEY = 'stwid_entry_tags';

/**
 * The field name a tag write passes to the `originalData` mirror
 * (`mirrorEntryFieldsToOriginalData(book, entry, [ENTRY_TAGS_FIELD])`), so a
 * card-embedded book re-exports with its tags.
 */
export const ENTRY_TAGS_FIELD = 'entryTags';

export const ENTRY_TAG_NAME_MAX_LENGTH = 40;

export const ENTRY_TAG_SORT = Object.freeze({
  MANUAL: 'manual',
  ALPHA: 'alpha',
  USAGE: 'usage',
});

export const ENTRY_TAG_TEXT_COLOR = Object.freeze({
  BLACK: '#000000',
  WHITE: '#ffffff',
});

/**
 * The ten tags seeded on first run. The ids are fixed forever: Restore defaults
 * recognises a default by id, and books tagged elsewhere match the local
 * defaults by id even after a rename. They are opaque rather than readable so
 * their first four characters differ — a deleted tag's stale pill shows only
 * that fragment, and two stale defaults must still be told apart.
 * Colours are the design gallery's Decision 9 (9G), not the spec's starting
 * palette.
 */
export const DEFAULT_ENTRY_TAGS = Object.freeze(
  [
    {
      id: 'a30f9aed-5577-4bb8-8fe4-ec6573e14c1b',
      name: 'Main character',
      emoji: '👑',
      color: '#877232',
    },
    {
      id: 'fa2e038b-60c6-4e3c-8ab0-e2ba87c2153f',
      name: 'Secondary character',
      emoji: '🎭',
      color: '#996c3d',
    },
    { id: '4d8c8452-9ac6-4f9d-b4fb-b78428eaa267', name: 'Location', emoji: '🗺️', color: '#497b5a' },
    { id: 'abb86d72-7cc1-4f00-a87c-cc1e51a5b39b', name: 'Realm', emoji: '🏰', color: '#3f7878' },
    {
      id: '9b063b25-dee0-472c-a042-5a3b442c4c99',
      name: 'Organization',
      emoji: '🛡️',
      color: '#46678f',
    },
    { id: 'f599b2d4-f91d-4545-bc55-89c0a60b86c8', name: 'Item', emoji: '🗝️', color: '#786450' },
    {
      id: '64a8dcd4-fce0-4b1b-9997-e3d2e5c23f83',
      name: 'Narrative arc',
      emoji: '📘',
      color: '#6e578f',
    },
    {
      id: '133f8c4b-e213-4b8e-94e1-3c94a15475b3',
      name: 'Narrative shard',
      emoji: '📜',
      color: '#87507b',
    },
    { id: '158fc6e8-5d49-442d-9e82-d424af7533f1', name: 'Index', emoji: '📚', color: '#5b656e' },
    {
      id: '5aa4ebed-d1cf-4218-93cb-d764db1273fc',
      name: 'Prompt snippet',
      emoji: '🧩',
      color: '#8f5050',
    },
  ].map((tag) => Object.freeze(tag)),
);

// Colour given to a stored tag whose colour is missing — the Index default's grey.
const FALLBACK_TAG_COLOR = '#5b656e';

// Equal when two names differ only in capitals: uniqueness ignores case, not accents.
const nameEqualityCollator = new Intl.Collator('pt-BR', { sensitivity: 'accent' });
// Alphabetical sort ignores capitals and accents (`Área` sorts with `Area`).
const alphaSortCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

const isNonBlankString = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * Trims a tag name and caps it at ENTRY_TAG_NAME_MAX_LENGTH characters.
 * Returns null for a blank or non-string name, which is refused.
 * @param {unknown} rawName
 * @returns {string|null}
 */
export function normalizeEntryTagName(rawName) {
  if (!isNonBlankString(rawName)) return null;
  // Counted in code points so the cap never splits an emoji's surrogate pair.
  const capped = Array.from(rawName.trim()).slice(0, ENTRY_TAG_NAME_MAX_LENGTH).join('');
  return capped.trimEnd();
}

/**
 * The tag whose name matches, ignoring capitals.
 * @param {Array<object>} tags
 * @param {string} name
 * @param {{ exceptId?: string }} [options] - A tag to leave out (the one being renamed).
 */
export function findEntryTagByName(tags, name, { exceptId } = {}) {
  return (
    tags.find((tag) => tag.id !== exceptId && nameEqualityCollator.compare(tag.name, name) === 0) ??
    null
  );
}

/**
 * Checks a name for create or rename.
 * @returns {{ ok: true, name: string } | { ok: false, reason: 'blank' } |
 *   { ok: false, reason: 'duplicate', existing: object }}
 */
export function validateEntryTagName(tags, rawName, { exceptId } = {}) {
  const name = normalizeEntryTagName(rawName);
  if (name === null) return { ok: false, reason: 'blank' };
  const existing = findEntryTagByName(tags, name, { exceptId });
  if (existing) return { ok: false, reason: 'duplicate', existing };
  return { ok: true, name };
}

const toHexByte = (value) =>
  Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, '0');

function hslToHex(hue, saturation, lightness) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const second = chroma * (1 - Math.abs((segment % 2) - 1));
  const [r, g, b] =
    segment < 1
      ? [chroma, second, 0]
      : segment < 2
        ? [second, chroma, 0]
        : segment < 3
          ? [0, chroma, second]
          : segment < 4
            ? [0, second, chroma]
            : segment < 5
              ? [second, 0, chroma]
              : [chroma, 0, second];
  const match = lightness - chroma / 2;
  return `#${[r, g, b].map((channel) => toHexByte((channel + match) * 255)).join('')}`;
}

/**
 * A random colour for a tag created by name: any hue, kept muted and fairly dark
 * so it sits with the defaults.
 * @param {() => number} [random] - Returns [0, 1); injectable for tests.
 */
function randomEntryTagColor(random = Math.random) {
  const hue = random() * 360;
  const saturation = 0.3 + random() * 0.3;
  const lightness = 0.3 + random() * 0.15;
  return hslToHex(hue, saturation, lightness);
}

function defaultGenerateId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Creates a tag from a typed name: a new random id, a random colour, no emoji.
 * The id never matches a current tag or a default, so a deleted default's id
 * is never handed to a different tag.
 * @param {Array<object>} tags
 * @param {unknown} rawName
 * @param {{ random?: () => number, generateId?: () => string }} [options]
 * @returns {{ ok: true, tag: object, tags: Array<object> } |
 *   ReturnType<typeof validateEntryTagName>}
 */
export function createEntryTag(
  tags,
  rawName,
  { random = Math.random, generateId = defaultGenerateId } = {},
) {
  const check = validateEntryTagName(tags, rawName);
  if (!check.ok) return check;

  const takenIds = new Set([...tags, ...DEFAULT_ENTRY_TAGS].map((tag) => tag.id));
  let id = generateId();
  while (!isNonBlankString(id) || takenIds.has(id)) {
    id = generateId();
  }

  const tag = { id, name: check.name, emoji: null, color: randomEntryTagColor(random) };
  return { ok: true, tag, tags: [...tags, tag] };
}

/**
 * Renames one tag. Changing only the capitals of its own name is allowed.
 * @returns {{ ok: true, tags: Array<object> } | { ok: false, reason: string, existing?: object }}
 */
export function renameEntryTag(tags, id, rawName) {
  if (!tags.some((tag) => tag.id === id)) return { ok: false, reason: 'missing' };
  const check = validateEntryTagName(tags, rawName, { exceptId: id });
  if (!check.ok) return check;
  return {
    ok: true,
    tags: tags.map((tag) => (tag.id === id ? { ...tag, name: check.name } : tag)),
  };
}

/**
 * Removes one definition. Entries carrying the id keep it; it then reads as a
 * stale value.
 */
export function deleteEntryTag(tags, id) {
  return tags.filter((tag) => tag.id !== id);
}

/** Gives one tag a new colour. Its text colour follows on its own (`pickEntryTagTextColor`). */
export function setEntryTagColor(tags, id, color) {
  return tags.map((tag) => (tag.id === id ? { ...tag, color } : tag));
}

/** Gives one tag a new emoji; `null` (or a blank) means no emoji. */
export function setEntryTagEmoji(tags, id, emoji) {
  const value = isNonBlankString(emoji) ? emoji : null;
  return tags.map((tag) => (tag.id === id ? { ...tag, emoji: value } : tag));
}

/**
 * Stores the manual order a drag left on screen. A tag the order leaves out
 * keeps its relative place after the ordered ones; ids with no tag are ignored.
 * @param {Array<object>} tags
 * @param {string[]} orderedIds
 */
export function reorderEntryTags(tags, orderedIds) {
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const ordered = [...new Set(orderedIds)].filter((id) => byId.has(id)).map((id) => byId.get(id));
  const placed = new Set(ordered);
  return [...ordered, ...tags.filter((tag) => !placed.has(tag))];
}

const NEW_TAG_BASE_NAME = 'New tag';

/** The name a tag created from the popup starts with: `New tag`, else `New tag 2`, `3`, … */
export function nextNewEntryTagName(tags) {
  if (!findEntryTagByName(tags, NEW_TAG_BASE_NAME)) return NEW_TAG_BASE_NAME;
  let number = 2;
  while (findEntryTagByName(tags, `${NEW_TAG_BASE_NAME} ${number}`)) number += 1;
  return `${NEW_TAG_BASE_NAME} ${number}`;
}

/**
 * Re-adds every default whose id is missing, appended in the default order.
 * Present defaults stay as the user edited them, custom tags are untouched, and
 * a default whose name another tag already holds (ignoring capitals) is skipped.
 * Also the first-run seed: on an empty list it yields the full default set.
 * @returns {{ tags: Array<object>, added: Array<object> }}
 */
export function restoreDefaultEntryTags(tags) {
  const presentIds = new Set(tags.map((tag) => tag.id));
  const next = [...tags];
  const added = [];
  for (const defaultTag of DEFAULT_ENTRY_TAGS) {
    if (presentIds.has(defaultTag.id)) continue;
    if (findEntryTagByName(next, defaultTag.name)) continue;
    const tag = { ...defaultTag };
    next.push(tag);
    added.push(tag);
  }
  return { tags: next, added };
}

/**
 * The one tag order used everywhere. Manual is the stored order; alphabetical
 * ignores capitals and accents; by usage puts the most used first. Ties keep the
 * manual order in both sorted modes.
 * @param {Array<object>} tags
 * @param {string} mode - An ENTRY_TAG_SORT value; anything else reads as manual.
 * @param {Map<string, number>} [usageCounts] - Entries per tag id.
 */
export function sortEntryTags(tags, mode, usageCounts = new Map()) {
  const sorted = [...tags];
  if (mode === ENTRY_TAG_SORT.ALPHA) {
    return sorted.sort((a, b) => alphaSortCollator.compare(a.name, b.name));
  }
  if (mode === ENTRY_TAG_SORT.USAGE) {
    const usageOf = (tag) => usageCounts.get(tag.id) ?? 0;
    return sorted.sort((a, b) => usageOf(b) - usageOf(a));
  }
  return sorted;
}

/**
 * Every entry of every book in the book cache — what the by-usage sort counts.
 * A book in `fresherEntries` is read from there instead: the host reports a
 * book's new data before the drawer's cache has caught up with it. A book the
 * cache no longer holds is not read at all.
 * @param {Record<string, { entries?: Record<string, object> }>} cache
 * @param {Record<string, Record<string, object>>} [fresherEntries] - Entries by book name.
 */
export function* iterateCacheEntries(cache, fresherEntries = {}) {
  for (const [bookName, book] of Object.entries(cache ?? {})) {
    const entries = Object.hasOwn(fresherEntries, bookName)
      ? fresherEntries[bookName]
      : book?.entries;
    yield* Object.values(entries ?? {});
  }
}

/** A usage count as the Manage entry tags popup shows it: `1 entry`, `3 entries`. */
export function formatEntryTagUsage(count) {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`;
}

/**
 * The tag definitions in the one tag order, read off the settings. Usage is
 * only counted when the by-usage sort needs it.
 * @param {{ entryTags: object[], entryTagSort: string }} settings
 * @param {() => Iterable<object>} getAllEntries
 */
export function getOrderedEntryTags(settings, getAllEntries) {
  const usage =
    settings.entryTagSort === ENTRY_TAG_SORT.USAGE ? countEntryTagUsage(getAllEntries()) : new Map();
  return sortEntryTags(settings.entryTags, settings.entryTagSort, usage);
}

/** A tag's pill text: its emoji, when it has one, then its name. */
export function formatEntryTagPillText(tag) {
  return tag.emoji ? `${tag.emoji} ${tag.name}` : tag.name;
}

/** Reads `#rgb`, `#rrggbb`, `#rrggbbaa` or `rgb()/rgba()` into [r, g, b], or null. */
function parseColor(color) {
  if (typeof color !== 'string') return null;
  const value = color.trim();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join('') : hex[1];
    return [0, 2, 4].map((start) => parseInt(digits.slice(start, start + 2), 16));
  }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) return rgb.slice(1, 4).map(Number);
  return null;
}

function relativeLuminance([r, g, b]) {
  const linear = (channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * Black or white pill text, whichever has the higher WCAG contrast against the
 * tag's colour. An unreadable colour gets white, the text every default uses.
 * @param {string} backgroundColor
 */
export function pickEntryTagTextColor(backgroundColor) {
  const rgb = parseColor(backgroundColor);
  if (!rgb) return ENTRY_TAG_TEXT_COLOR.WHITE;
  const luminance = relativeLuminance(rgb);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack
    ? ENTRY_TAG_TEXT_COLOR.WHITE
    : ENTRY_TAG_TEXT_COLOR.BLACK;
}

/** Paints a pill element in a tag's colour, with the text colour that reads on it. */
export function paintEntryTagPill(el, tag) {
  // The colour goes in twice: Decision 9's border rule reads the property.
  el.style.setProperty('--stwid-tag-color', tag.color);
  el.style.backgroundColor = tag.color;
  el.style.color = pickEntryTagTextColor(tag.color);
}

/**
 * Cleans a stored definitions list: anything not a list becomes empty, items
 * without a usable id or name are dropped, a repeated id keeps its first tag,
 * and a missing emoji or colour gets its default.
 * @param {unknown} value
 * @returns {Array<object>}
 */
export function normalizeStoredEntryTags(value) {
  if (!Array.isArray(value)) return [];
  const seenIds = new Set();
  const tags = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const name = normalizeEntryTagName(item.name);
    if (!isNonBlankString(item.id) || name === null || seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    tags.push({
      id: item.id,
      name,
      emoji: isNonBlankString(item.emoji) ? item.emoji : null,
      color: isNonBlankString(item.color) ? item.color : FALLBACK_TAG_COLOR,
    });
  }
  return tags;
}

const cleanIdList = (value) =>
  Array.isArray(value) ? [...new Set(value.filter(isNonBlankString))] : [];

/**
 * An entry's tag ids. A stored value that is not a list, values that are not
 * ids, and repeats are ignored — never cleaned up in the book itself.
 * @param {object|null|undefined} entry
 * @returns {string[]}
 */
export function readEntryTagIds(entry) {
  return cleanIdList(entry?.extensions?.[ENTRY_TAGS_EXTENSION_KEY]);
}

/**
 * How many entries carry each tag id — the counts the by-usage sort reads.
 * Junk and repeated ids on one entry count as `readEntryTagIds` reads them.
 * @param {Iterable<object>} entries
 * @returns {Map<string, number>}
 */
export function countEntryTagUsage(entries) {
  const counts = new Map();
  for (const entry of entries) {
    for (const id of readEntryTagIds(entry)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Stores an entry's tag ids, creating `extensions` when it is missing. Writes a
 * fresh, de-duplicated list so the caller's array is never aliased.
 * @param {object} entry
 * @param {unknown[]} ids
 * @returns {string[]} The list written.
 */
export function writeEntryTagIds(entry, ids) {
  if (!entry.extensions || typeof entry.extensions !== 'object') {
    entry.extensions = {};
  }
  const cleaned = cleanIdList(ids);
  entry.extensions[ENTRY_TAGS_EXTENSION_KEY] = cleaned;
  return cleaned;
}
