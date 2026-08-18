import { closeOpenMultiselectDropdownMenus } from '../shared/multiselect-dropdown.js';

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
