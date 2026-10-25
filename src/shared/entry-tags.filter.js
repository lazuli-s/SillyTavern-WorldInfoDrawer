// Entry-tag filter — pure logic behind the Visibility tab's Entry tags pills.
//
// The selection is stored on the settings object as `entryTagFilter`:
// `{ include: [ids], exclude: [ids], untagged: 'off' | 'include' | 'exclude' }`.
// Each tag pill and the Untagged pill cycle off → include → exclude → off, and
// the combining rules copy the host's character tag filter: included tags
// combine with AND, any excluded tag hides the entry, and exclusion wins over
// inclusion. An entry whose only ids are stale (no definition) counts as
// untagged.
//
// Every function takes its inputs and returns a fresh result. The Book Browser
// and the Entry Manager both judge an entry with the one predicate here.

import { readEntryTagIds } from './entry-tags.js';

export const ENTRY_TAG_FILTER_STATE = Object.freeze({
  OFF: 'off',
  INCLUDE: 'include',
  EXCLUDE: 'exclude',
});

const NEXT_STATE = Object.freeze({
  [ENTRY_TAG_FILTER_STATE.OFF]: ENTRY_TAG_FILTER_STATE.INCLUDE,
  [ENTRY_TAG_FILTER_STATE.INCLUDE]: ENTRY_TAG_FILTER_STATE.EXCLUDE,
  [ENTRY_TAG_FILTER_STATE.EXCLUDE]: ENTRY_TAG_FILTER_STATE.OFF,
});

const isFilterState = (value) => Object.values(ENTRY_TAG_FILTER_STATE).includes(value);

/** @returns {{ include: string[], exclude: string[], untagged: string }} */
export const createEmptyEntryTagFilter = () => ({
  include: [],
  exclude: [],
  untagged: ENTRY_TAG_FILTER_STATE.OFF,
});

/** off → include → exclude → off; anything unknown reads as off. */
export function cycleEntryTagFilterState(state) {
  return NEXT_STATE[state] ?? ENTRY_TAG_FILTER_STATE.INCLUDE;
}

export function isEntryTagFilterActive(selection) {
  return (
    selection.include.length > 0 ||
    selection.exclude.length > 0 ||
    selection.untagged !== ENTRY_TAG_FILTER_STATE.OFF
  );
}

export function getEntryTagFilterTagState(selection, tagId) {
  if (selection.include.includes(tagId)) return ENTRY_TAG_FILTER_STATE.INCLUDE;
  if (selection.exclude.includes(tagId)) return ENTRY_TAG_FILTER_STATE.EXCLUDE;
  return ENTRY_TAG_FILTER_STATE.OFF;
}

/** Moves one tag to its next state; the other tags and Untagged are untouched. */
export function cycleEntryTagFilterTag(selection, tagId) {
  const next = cycleEntryTagFilterState(getEntryTagFilterTagState(selection, tagId));
  const include = selection.include.filter((id) => id !== tagId);
  const exclude = selection.exclude.filter((id) => id !== tagId);
  if (next === ENTRY_TAG_FILTER_STATE.INCLUDE) include.push(tagId);
  if (next === ENTRY_TAG_FILTER_STATE.EXCLUDE) exclude.push(tagId);
  return { include, exclude, untagged: selection.untagged };
}

export function cycleEntryTagFilterUntagged(selection) {
  return {
    include: [...selection.include],
    exclude: [...selection.exclude],
    untagged: cycleEntryTagFilterState(selection.untagged),
  };
}

/**
 * Reads a saved selection. Anything not shaped like one becomes the empty
 * selection; non-ids and repeats are dropped; an id in both lists keeps the
 * include; and an id whose tag no longer exists is dropped — otherwise it would
 * go on hiding entries with no pill on screen to turn it off.
 * @param {unknown} value
 * @param {Array<{ id: string }>} tags - The current tag definitions.
 */
export function normalizeEntryTagFilter(value, tags) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyEntryTagFilter();
  }
  const knownIds = new Set(tags.map((tag) => tag.id));
  const taken = new Set();
  const cleanList = (list) => {
    if (!Array.isArray(list)) return [];
    const ids = [];
    for (const id of list) {
      if (!knownIds.has(id) || taken.has(id)) continue;
      taken.add(id);
      ids.push(id);
    }
    return ids;
  };
  const include = cleanList(value.include);
  const exclude = cleanList(value.exclude);
  const untagged = isFilterState(value.untagged) ? value.untagged : ENTRY_TAG_FILTER_STATE.OFF;
  return { include, exclude, untagged };
}

/**
 * Builds the test one entry must pass. With nothing selected every entry passes.
 * @param {{ include: string[], exclude: string[], untagged: string }} selection
 * @param {Array<{ id: string }>} tags - The current definitions; ids outside them are stale.
 * @returns {(entry: object) => boolean}
 */
export function createEntryTagFilterPredicate(selection, tags) {
  if (!isEntryTagFilterActive(selection)) return () => true;
  const knownIds = new Set(tags.map((tag) => tag.id));
  const include = selection.include;
  const exclude = new Set(selection.exclude);
  const { untagged } = selection;
  return (entry) => {
    const ids = new Set(readEntryTagIds(entry).filter((id) => knownIds.has(id)));
    const isUntagged = ids.size === 0;
    if (untagged === ENTRY_TAG_FILTER_STATE.INCLUDE && !isUntagged) return false;
    if (untagged === ENTRY_TAG_FILTER_STATE.EXCLUDE && isUntagged) return false;
    for (const id of ids) {
      if (exclude.has(id)) return false;
    }
    return include.every((id) => ids.has(id));
  };
}

/**
 * The predicate for the saved selection — what the Entry Manager narrows its
 * rows by. Reads without writing back: the Visibility tab owns the saved value.
 * @param {{ entryTagFilter: unknown, entryTags: Array<{ id: string }> }} settings
 * @returns {(entry: object) => boolean}
 */
export function createSavedEntryTagFilterPredicate(settings) {
  const selection = normalizeEntryTagFilter(settings.entryTagFilter, settings.entryTags);
  return createEntryTagFilterPredicate(selection, settings.entryTags);
}

/**
 * Which entry stays visible while it fails the filter: the entry open in the
 * editor, until a different entry is opened or the selection changes.
 * A cleared editor moves nothing — the editor clears itself on its way to
 * re-opening the same entry after an outside change, and that must neither
 * drop the kept entry nor bring back one a selection change just hid.
 * @param {object} args
 * @param {{ keptEntry: object|null, lastOpenKey: string|null }} args.previous
 * @param {{ name: string, uid: string|number }|null} args.openEntry - The editor's open entry.
 * @param {boolean} args.selectionChanged
 * @returns {{ keptEntry: { bookName: string, uid: string|number }|null, lastOpenKey: string|null }}
 */
export function nextKeptEntry({ previous, openEntry, selectionChanged }) {
  const openKey = openEntry ? `${openEntry.name}\u0000${openEntry.uid}` : null;
  if (selectionChanged) return { keptEntry: null, lastOpenKey: openKey };
  if (!openEntry || openKey === previous.lastOpenKey) return previous;
  return { keptEntry: { bookName: openEntry.name, uid: openEntry.uid }, lastOpenKey: openKey };
}

/**
 * Decides, book by book, which entry rows the filter hides and whether the
 * whole book is hidden (no entry left showing). The kept entry — the one open
 * in the editor — is never hidden, so its book stays visible too.
 * @param {object} args
 * @param {Record<string, Record<string, object>>} args.books - Entries per book, keyed by uid.
 * @param {{ include: string[], exclude: string[], untagged: string }} args.selection
 * @param {Array<{ id: string }>} args.tags
 * @param {{ bookName: string, uid: string|number }|null} [args.keptEntry]
 * @returns {Record<string, { bookHidden: boolean, hiddenUids: Set<string> }>}
 */
export function resolveEntryTagFilterHiding({ books, selection, tags, keptEntry = null }) {
  const active = isEntryTagFilterActive(selection);
  const entryPasses = createEntryTagFilterPredicate(selection, tags);
  const result = {};
  for (const [bookName, entries] of Object.entries(books)) {
    const hiddenUids = new Set();
    let anyShown = false;
    for (const [uid, entry] of Object.entries(entries ?? {})) {
      const isKept = keptEntry?.bookName === bookName && String(keptEntry.uid) === uid;
      if (isKept || entryPasses(entry)) {
        anyShown = true;
      } else {
        hiddenUids.add(uid);
      }
    }
    result[bookName] = { bookHidden: active && !anyShown, hiddenUids };
  }
  return result;
}

/**
 * How many items, in order, sit on the first `maxLines` lines of a wrapping
 * row. Items on one line are centred, so an item only starts a new line when
 * its top is below the middle of the line before it.
 * @param {Array<{ top: number, height: number }>} boxes - Each item's box, in order.
 * @param {number} maxLines
 * @returns {number}
 */
export function countItemsInFirstLines(boxes, maxLines) {
  let lines = 0;
  let lineMiddle = -Infinity;
  for (const [index, { top, height }] of boxes.entries()) {
    if (top > lineMiddle) {
      lines += 1;
      if (lines > maxLines) return index;
    }
    lineMiddle = Math.max(lineMiddle, top + height / 2);
  }
  return boxes.length;
}

/**
 * The folded group's expander text: `+N more`, plus ` · K active` when K of the
 * hidden pills are included or excluded.
 * @param {{ hiddenCount: number, activeHiddenCount: number }} counts
 * @returns {string}
 */
export function formatEntryTagFoldLabel({ hiddenCount, activeHiddenCount }) {
  const label = `+${hiddenCount} more`;
  return activeHiddenCount > 0 ? `${label} · ${activeHiddenCount} active` : label;
}

/**
 * Whether the tag filter is why every book is hidden: at least one book is left
 * by the book Visibility filter and Search, and the tag filter hides each of them.
 * @param {Array<{ hiddenByTags: boolean, hiddenByOther: boolean }>} books
 * @returns {boolean}
 */
export function shouldShowEntryTagEmptyState(books) {
  const leftByOtherFilters = books.filter((book) => !book.hiddenByOther);
  return leftByOtherFilters.length > 0 && leftByOtherFilters.every((book) => book.hiddenByTags);
}
