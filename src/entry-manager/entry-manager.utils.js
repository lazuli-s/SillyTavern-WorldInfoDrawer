import { closeOpenMultiselectDropdownMenus } from '../shared/multiselect-dropdown.js';
import {
  CHARACTER_FILTER_PRESENCE_HAS,
  CHARACTER_FILTER_PRESENCE_HASNT,
} from '../shared/constants.js';

export const setTooltip = (element, text, { ariaLabel = null } = {}) => {
  if (!element) return;
  if (typeof text !== 'string' || text.trim() === '') return;
  element.title = text;
  const effectiveAriaLabel = typeof ariaLabel === 'string' ? ariaLabel : null;
  const label =
    effectiveAriaLabel ??
    text
      .replace(/\s*---\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  if (label) {
    element.setAttribute('aria-label', label);
  }
};

const resetContentWrapAfterExpand = (contentWrap) => {
  contentWrap.style.overflow = '';
  contentWrap.style.maxHeight = '';
};

export const wireCollapseRow = (
  rowTitle,
  row,
  contentWrap,
  chevron,
  { initialCollapsed = false } = {},
) => {
  const applyCollapsedState = (collapsed) => {
    row.dataset.collapsed = String(collapsed);
    row.classList.toggle('stwid--collapsed', collapsed);
    chevron.classList.toggle('fa-chevron-down', !collapsed);
    chevron.classList.toggle('fa-chevron-right', collapsed);
  };

  rowTitle.addEventListener('click', () => {
    const isCollapsed = row.dataset.collapsed === 'true';
    if (isCollapsed) {
      applyCollapsedState(false);
      contentWrap.style.overflow = 'hidden';
      contentWrap.style.maxHeight = contentWrap.scrollHeight + 'px';
      contentWrap.addEventListener(
        'transitionend',
        () => {
          resetContentWrapAfterExpand(contentWrap);
        },
        { once: true },
      );
    } else {
      closeOpenMultiselectDropdownMenus();
      contentWrap.style.overflow = 'hidden';
      contentWrap.style.maxHeight = contentWrap.scrollHeight + 'px';
      void contentWrap.offsetHeight;
      contentWrap.style.maxHeight = '0';
      applyCollapsedState(true);
    }
  });

  if (initialCollapsed) {
    applyCollapsedState(true);
    contentWrap.style.overflow = 'hidden';
    contentWrap.style.maxHeight = '0';
  } else {
    applyCollapsedState(false);
  }
};

export function wrapRowContent(row) {
  const contentWrap = document.createElement('div');
  contentWrap.classList.add('stwid--row-content-wrap');
  while (row.firstChild) {
    contentWrap.append(row.firstChild);
  }
  row.append(contentWrap);
  row.dataset.collapsed = 'false';
  row.classList.remove('stwid--collapsed');
  return contentWrap;
}

/** Lines shown before the "+N more" affordance takes over (R5). */
export const CHARACTER_FILTER_LINE_LIMIT = 3;

export const INERT_FILTER_LABEL = 'exclude — nothing selected';

const INERT_FILTER_TOOLTIP =
  'Inert filter --- exclude is on but nothing is selected, so this entry is never gated by it. ' +
  'The setting is left exactly as stored.';

// The avatar filename with its extension stripped — what lorebook data stores (CONTEXT.md).
// This mirrors the host's `getCharaFilename` (vendor utils.js:1342, same regex) rather than
// calling it: that helper calls `getContext()` even when handed a manual avatar key, which
// would drag this pure-logic module onto the host and through the st-host test stub. If the
// host ever changes how it derives the key, this line must change with it or every stored
// avatar key would be judged a stale value.
const toAvatarKey = (character) => String(character?.avatar ?? '').replace(/\.[^/.]+$/, '');

// Host lists can be injected for tests; otherwise they come from the live context.
const resolveHostLists = (overrides) => {
  const context = globalThis.SillyTavern?.getContext?.() ?? {};
  const pick = (injected, fromContext) => {
    if (Array.isArray(injected)) return injected;
    return Array.isArray(fromContext) ? fromContext : [];
  };
  return {
    characters: pick(overrides?.characters, context.characters),
    tags: pick(overrides?.tags, context.tags),
  };
};

const countDisplayNames = (characters) => {
  const counts = new Map();
  for (const character of characters) {
    const displayName = typeof character?.name === 'string' ? character.name : '';
    if (!displayName) continue;
    counts.set(displayName, (counts.get(displayName) ?? 0) + 1);
  }
  return counts;
};

const buildCharacterLine = (storedName, { characters, displayNameCounts, mode, icon }) => {
  const avatarKey = String(storedName);
  const line = { kind: 'character', icon, mode, value: avatarKey, label: avatarKey, stale: false };

  // E1/E2 — an unloaded host list must never mark anything stale.
  if (!characters.length) {
    line.tooltip = `Avatar key: ${avatarKey}`;
    return line;
  }

  const match = characters.find((character) => toAvatarKey(character) === avatarKey);
  if (!match) {
    line.stale = true;
    line.tooltip = `Stale value --- no character with the avatar key "${avatarKey}" exists any more. Nothing was changed.`;
    return line;
  }

  const displayName = typeof match.name === 'string' && match.name ? match.name : avatarKey;
  // E5 — disambiguate inline only when a collision actually exists.
  const collides = (displayNameCounts.get(displayName) ?? 0) > 1;
  line.label = collides ? `${displayName} (${avatarKey})` : displayName;
  line.tooltip = `Avatar key: ${avatarKey}`;
  return line;
};

const buildTagLine = (storedTag, { tags, mode }) => {
  // R3b/E14 — tag IDs are strings; coerce first so a legacy numeric ID still resolves.
  const tagId = String(storedTag);
  const line = { kind: 'tag', icon: 'fa-tag', mode, value: tagId, label: tagId, stale: false };

  if (!tags.length) {
    line.tooltip = `Tag ID: ${tagId}`;
    return line;
  }

  const match = tags.find((tag) => String(tag?.id) === tagId);
  if (!match) {
    line.stale = true;
    line.tooltip = `Stale value --- no tag with the ID "${tagId}" exists any more. Nothing was changed.`;
    return line;
  }

  line.label = typeof match.name === 'string' && match.name ? match.name : tagId;
  line.tooltip = `Tag ID: ${tagId}`;
  return line;
};

/**
 * Turn a stored `characterFilter` into renderable lines. Read-only: nothing here writes.
 * Every stored value produces a line (R3c/E15) — resolved, or flagged as a stale value.
 *
 * @param {object} entry Lorebook entry.
 * @param {{characters?: Array, tags?: Array}} [hostLists] Overrides for the host lists.
 */
export const formatCharacterFilter = (entry, hostLists) => {
  const filter = entry?.characterFilter;
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return [];

  const { characters, tags } = resolveHostLists(hostLists);
  const mode = filter.isExclude ? 'exclude' : 'include';
  const icon = filter.isExclude ? 'fa-user-slash' : 'fa-user-plus';
  const displayNameCounts = countDisplayNames(characters);
  const lines = [];

  if (Array.isArray(filter.names)) {
    for (const storedName of filter.names) {
      lines.push(buildCharacterLine(storedName, { characters, displayNameCounts, mode, icon }));
    }
  }
  if (Array.isArray(filter.tags)) {
    for (const storedTag of filter.tags) {
      lines.push(buildTagLine(storedTag, { tags, mode }));
    }
  }

  // E4 — an inert filter gates nothing but still exists; show it, never rewrite it.
  if (!lines.length) {
    if (filter.isExclude !== true) return [];
    return [
      {
        kind: 'inert',
        icon: 'fa-ban',
        mode: 'inert',
        value: '',
        label: INERT_FILTER_LABEL,
        stale: false,
        tooltip: INERT_FILTER_TOOLTIP,
      },
    ];
  }

  return lines;
};

/* -------------------------------------------------------------------------- */
/* Inline editing (ticket 05) — pure read/write semantics                     */
/* -------------------------------------------------------------------------- */

/** The two labels the dropdown heading flips between; both are the host's own wording. */
export const CHARACTER_FILTER_INCLUDE_LABEL = 'Filter to Character(s)';
export const CHARACTER_FILTER_EXCLUDE_LABEL = 'Exclude Character(s)';

/** E3 — shown when neither host list has anything to pick. */
export const CHARACTER_FILTER_EMPTY_STATE = 'No characters or tags available';

/**
 * Reads a stored `characterFilter` into the shape the dropdown edits.
 *
 * Values are coerced with `String()` for the same reason the formatter does it
 * (R3b/E14): a tag ID left as a JSON number by an old version must still match
 * the host's string IDs. A later write therefore stores it as a string — the
 * shape SillyTavern itself writes — but only ever as part of an edit the user
 * asked for.
 *
 * @param {object} entry Lorebook entry.
 * @returns {{isExclude: boolean, names: string[], tags: string[]}}
 */
export const readCharacterFilterSelection = (entry) => {
  const filter = entry?.characterFilter;
  const isObject = Boolean(filter) && typeof filter === 'object' && !Array.isArray(filter);
  return {
    isExclude: isObject && filter.isExclude === true,
    names: isObject && Array.isArray(filter.names) ? filter.names.map(String) : [],
    tags: isObject && Array.isArray(filter.tags) ? filter.tags.map(String) : [],
  };
};

/**
 * The value a selection must be stored as — matching the host exactly (R12).
 *
 * `undefined` means "delete the key": an empty selection with exclude off is
 * what SillyTavern deletes (`world-info.js:3144`) rather than leaving an empty
 * object behind. Exclude on with an empty selection keeps the host's
 * `{ isExclude: true, names: [], tags: [] }` shape (`world-info.js:3648`),
 * which gates nothing but is a setting the user asked for.
 *
 * @param {{isExclude?: boolean, names?: Array, tags?: Array}} [selection]
 * @returns {{isExclude: boolean, names: string[], tags: string[]}|undefined}
 */
export const computeCharacterFilterValue = ({ names = [], tags = [], isExclude = false } = {}) => {
  const nextNames = Array.isArray(names) ? names.map(String) : [];
  const nextTags = Array.isArray(tags) ? tags.map(String) : [];
  if (!nextNames.length && !nextTags.length && isExclude !== true) return undefined;
  // Key order matches the host's own object literal, so a round-trip through
  // the file produces byte-identical JSON.
  return { isExclude: isExclude === true, names: nextNames, tags: nextTags };
};

/**
 * Puts a computed value on an entry — assigning it, or deleting the key when the
 * value is `undefined`. The "absent key, never an empty object" half of R12 lives
 * here alone, so every holder of an entry gets the same treatment.
 *
 * @param {object} entry Lorebook entry, mutated in place.
 * @param {object|undefined} value Result of `computeCharacterFilterValue`.
 */
export const setCharacterFilterValue = (entry, value) => {
  if (!entry) return;
  if (value === undefined) delete entry.characterFilter;
  else entry.characterFilter = value;
};

/**
 * Writes a selection onto an entry, deleting the key when R12 says to.
 *
 * @param {object} entry Lorebook entry, mutated in place.
 * @param {{isExclude?: boolean, names?: Array, tags?: Array}} selection
 * @returns {object|undefined} the stored value, or `undefined` when the key was deleted.
 */
export const applyCharacterFilterSelection = (entry, selection) => {
  const next = computeCharacterFilterValue(selection);
  setCharacterFilterValue(entry, next);
  return next;
};

const buildCharacterOption = (avatarKey, { label, searchText, stale, selected }) => ({
  kind: 'character',
  icon: 'fa-user',
  value: avatarKey,
  label,
  searchText,
  stale,
  selected,
});

const buildTagOption = (tagId, { label, stale, selected }) => ({
  kind: 'tag',
  icon: 'fa-tag',
  value: tagId,
  label,
  searchText: label === tagId ? tagId : `${label} ${tagId}`,
  stale,
  selected,
});

/**
 * The pickable list behind the inline dropdown: every character, then every tag
 * (R9), followed by any stored value the host lists no longer know about.
 *
 * Those trailing options are what makes a stale value removable **only** through
 * the normal checkbox list (R13) — without them, a filter pointing at a deleted
 * character could never be unticked. They are flagged `stale` only when the
 * relevant host list is loaded and non-empty, judged per list (E1/E2).
 *
 * Characters match the search on both display name and avatar key (R10).
 *
 * @param {object} entry Lorebook entry.
 * @param {{characters?: Array, tags?: Array}} [hostLists] Overrides for the host lists.
 * @returns {Array<{kind: string, icon: string, value: string, label: string,
 *   searchText: string, stale: boolean, selected: boolean}>}
 */
export const buildCharacterFilterOptions = (entry, hostLists) => {
  const { characters, tags } = resolveHostLists(hostLists);
  const selection = readCharacterFilterSelection(entry);
  const selectedNames = new Set(selection.names);
  const selectedTags = new Set(selection.tags);
  const displayNameCounts = countDisplayNames(characters);

  const options = [];
  const seenAvatarKeys = new Set();
  for (const character of characters) {
    const avatarKey = toAvatarKey(character);
    if (!avatarKey || seenAvatarKeys.has(avatarKey)) continue;
    seenAvatarKeys.add(avatarKey);
    const displayName =
      typeof character?.name === 'string' && character.name ? character.name : avatarKey;
    // E5 — disambiguate inline only when a collision actually exists.
    const collides = (displayNameCounts.get(displayName) ?? 0) > 1;
    options.push(
      buildCharacterOption(avatarKey, {
        label: collides ? `${displayName} (${avatarKey})` : displayName,
        searchText: `${displayName} ${avatarKey}`,
        stale: false,
        selected: selectedNames.has(avatarKey),
      }),
    );
  }
  for (const avatarKey of selection.names) {
    if (seenAvatarKeys.has(avatarKey)) continue;
    seenAvatarKeys.add(avatarKey);
    options.push(
      buildCharacterOption(avatarKey, {
        label: avatarKey,
        searchText: avatarKey,
        stale: characters.length > 0,
        selected: true,
      }),
    );
  }

  const seenTagIds = new Set();
  for (const tag of tags) {
    const tagId = String(tag?.id ?? '');
    if (!tagId || seenTagIds.has(tagId)) continue;
    seenTagIds.add(tagId);
    options.push(
      buildTagOption(tagId, {
        label: typeof tag?.name === 'string' && tag.name ? tag.name : tagId,
        stale: false,
        selected: selectedTags.has(tagId),
      }),
    );
  }
  for (const tagId of selection.tags) {
    if (seenTagIds.has(tagId)) continue;
    seenTagIds.add(tagId);
    options.push(buildTagOption(tagId, { label: tagId, stale: tags.length > 0, selected: true }));
  }

  return options;
};

/**
 * Every character/tag value the given entries reference, de-duplicated.
 *
 * Lives here — beside `readCharacterFilterSelection`, which it is a fold over —
 * rather than in either of its two callers: the Bulk Editor's Remove specific
 * picker (E7) and the Entry Manager's character/tag filter (E6) both need the
 * stale values the loaded entries still point at, and a second copy would drift.
 *
 * @param {Array<object>} entries
 * @returns {{names: string[], tags: string[]}}
 */
export const collectReferencedCharacterFilterValues = (entries) => {
  const names = new Set();
  const tags = new Set();
  for (const entry of entries ?? []) {
    const selection = readCharacterFilterSelection(entry);
    for (const name of selection.names) names.add(name);
    for (const tag of selection.tags) tags.add(tag);
  }
  return { names: [...names], tags: [...tags] };
};

/* -------------------------------------------------------------------------- */
/* Entry Manager filters (ticket 08) — pure predicates                        */
/* -------------------------------------------------------------------------- */

/**
 * Which side of the has/hasn't toggle one entry falls on (R21).
 *
 * E4 — an **inert filter** (`isExclude: true` with nothing selected) gates
 * nothing at generation time, so it counts as **"hasn't"**, exactly as the
 * column's sort key treats it. A missing key is "hasn't" for the same reason.
 *
 * @param {object} entry Lorebook entry, read only.
 * @returns {string} one of `CHARACTER_FILTER_PRESENCE_VALUES`
 */
export const getCharacterFilterPresenceValue = (entry) => {
  const { names, tags } = readCharacterFilterSelection(entry);
  return names.length + tags.length > 0
    ? CHARACTER_FILTER_PRESENCE_HAS
    : CHARACTER_FILTER_PRESENCE_HASNT;
};

/**
 * One pickable value of the "filter to a specific character or tag" control.
 *
 * Characters are keyed by avatar key and tags by tag ID, and the two namespaces
 * can collide (nothing stops a tag from being named like an avatar file), so the
 * kind is part of the key rather than assumed from the value.
 *
 * @param {string} kind `'character'` or `'tag'`
 * @param {string} value avatar key or tag ID
 * @returns {string}
 */
export const encodeCharacterFilterValueKey = (kind, value) => `${kind}:${String(value)}`;

/**
 * Every value key one entry references, whether its filter includes or excludes
 * them (R22): the entry does reference that character either way.
 *
 * @param {object} entry Lorebook entry, read only.
 * @returns {string[]}
 */
export const getEntryCharacterFilterValueKeys = (entry) => {
  const { names, tags } = readCharacterFilterSelection(entry);
  return [
    ...names.map((name) => encodeCharacterFilterValueKey('character', name)),
    ...tags.map((tag) => encodeCharacterFilterValueKey('tag', tag)),
  ];
};

/**
 * R22 — whether an entry survives the "filter to a specific character or tag".
 *
 * Nothing picked means the filter is off, so every entry passes. Otherwise the
 * entry must reference at least one picked value — include-mode and
 * exclude-mode filters alike. A stale value matches like any other: it is what
 * the entry actually stores, and finding those entries is the point (E6).
 *
 * @param {object} entry Lorebook entry, read only.
 * @param {Iterable<string>|Set<string>} selectedKeys keys from `encodeCharacterFilterValueKey`.
 * @returns {boolean}
 */
export const entryMatchesCharacterFilterValues = (entry, selectedKeys) => {
  const selected = selectedKeys instanceof Set ? selectedKeys : new Set(selectedKeys ?? []);
  if (!selected.size) return true;
  return getEntryCharacterFilterValueKeys(entry).some((key) => selected.has(key));
};

/**
 * The pickable list behind the R22 picker: every existing character and tag,
 * plus any value the loaded entries still reference that no host list knows
 * about — marked stale, so an entry pointing at a deleted character stays
 * findable (E6).
 *
 * Built on `buildCharacterFilterOptions`, so the display-name resolution,
 * collision disambiguation and stale marking are the ones the column and the
 * Bulk Editor already use.
 *
 * @param {object} args
 * @param {Array<object>} [args.entries] the loaded entries.
 * @param {Iterable<string>} [args.selected] currently picked value keys.
 * @param {{characters?: Array, tags?: Array}} [args.hostLists] Test seam.
 * @returns {Array<object>} options carrying an extra `filterValue` key.
 */
export const buildCharacterFilterPickerOptions = ({
  entries = [],
  selected = [],
  hostLists,
} = {}) => {
  const referenced = collectReferencedCharacterFilterValues(entries);
  const unionEntry = { characterFilter: { isExclude: false, ...referenced } };
  const selectedKeys = new Set(selected ?? []);
  return buildCharacterFilterOptions(unionEntry, hostLists).map((option) => {
    const filterValue = encodeCharacterFilterValueKey(option.kind, option.value);
    return { ...option, filterValue, selected: selectedKeys.has(filterValue) };
  });
};

/**
 * The value keys of a picker option list — what `filters.characterFilterValue`
 * holds. One helper, so the Entry Manager and the filter-chip display cannot
 * disagree about how a picked value is spelled.
 *
 * @param {Array<{filterValue: string}>} options
 * @returns {string[]}
 */
export const toCharacterFilterValueKeys = (options) =>
  (options ?? []).map((option) => option.filterValue);

/**
 * Split formatted lines into the first `limit` and the remainder (R5).
 * Nothing is dropped — the caller renders both halves and toggles the overflow.
 */
export const truncateCharacterFilterLines = (lines, limit = CHARACTER_FILTER_LINE_LIMIT) => {
  const all = Array.isArray(lines) ? lines : [];
  const visible = all.slice(0, limit);
  const overflow = all.slice(limit);
  return { visible, overflow, hiddenCount: overflow.length };
};
