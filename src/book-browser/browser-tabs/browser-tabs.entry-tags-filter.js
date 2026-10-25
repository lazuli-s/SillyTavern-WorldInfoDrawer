// Visibility tab — the Entry tags group.
//
// A second labelled group, on its own line under the Visibility group: the
// Untagged pill, the Clear all pill, then one pill per tag in the one tag
// order. Clicking a tag pill or Untagged cycles it off → include → exclude →
// off, like the host's character tag filter (the rules live in
// `shared/entry-tags.filter.js`). Look: the entry tags spec, Visual decisions
// 3 (3B), 4 (4D), 9 (9G) and 10 (10D).
//
// The gear at the group's right edge opens the Manage entry tags popup
// (`entry-tag-manager/`). Each edit made there re-renders the pills at once and
// is passed on through `onEntryTagsChange`, which refreshes the editor's row;
// one that can change what an active filter shows also re-renders an open
// Entry Manager.
//
// Hiding is entry-level, with its own class (`stwid--filter-entry-tags`), so
// it stacks with the Search tab's class and the book Visibility filter's
// instead of sharing one Search clears freely. A book with no entry left
// showing gets the class too. The entry open in the editor is kept visible
// until another entry is opened or the selection changes.
//
// With many tags the pills fold to three lines behind a dashed `+N more`
// expander, which unfolds them all and then reads `Show less` (Decision 5,
// 5B). The fold is measured, so it waits until the group has a width and
// re-applies whenever that width changes. Folded is the default on load.
//
// The selection lives on the settings object (`entryTagFilter`), so it
// survives a reload. A changed selection is reported through
// `onEntryTagFilterChange`, which re-renders an open Entry Manager.

import {
  formatEntryTagPillText,
  getOrderedEntryTags,
  iterateCacheEntries,
  paintEntryTagPill,
} from '../../shared/entry-tags.js';
import {
  ENTRY_TAG_FILTER_STATE,
  countItemsInFirstLines,
  createEmptyEntryTagFilter,
  cycleEntryTagFilterTag,
  cycleEntryTagFilterUntagged,
  formatEntryTagFoldLabel,
  getEntryTagFilterTagState,
  nextKeptEntry,
  normalizeEntryTagFilter,
  resolveEntryTagFilterHiding,
} from '../../shared/entry-tags.filter.js';
import { Settings } from '../../shared/settings.js';
import { ENTRY_TAGS_FILTERED_CLASS } from '../../shared/utils.js';
import { openEntryTagManager } from '../../entry-tag-manager/entry-tag-manager.js';

const GROUP_CLASS = 'stwid--entry-tags-filter';
const PILLS_CLASS = 'stwid--entry-tags-filter__pills';
const PILLS_UNFOLDED_CLASS = 'stwid--entry-tags-filter__pills--unfolded';
const UNTAGGED_CLASS = 'stwid--entry-tags__untagged';
const INCLUDED_CLASS = 'selected';
const EXCLUDED_CLASS = 'excluded';
const MORE_CLASS = 'stwid--entry-tags-filter__more';
const FOLDED_CLASS = 'stwid--state-hidden';
const UNTAGGED_KEY = 'untagged';
const CLEAR_ALL_KEY = 'clear';
const MORE_KEY = 'more';
const FOLD_MAX_LINES = 3;
const MANAGE_CLASS = 'stwid--entry-tags-filter__manage';
const MANAGE_LABEL = 'Manage entry tags';

const GROUP_LABEL = 'Entry tags';
const GROUP_HINT =
  'Click a tag to show only entries with it, again to hide them, again to turn it off.';
const UNTAGGED_TOOLTIP = 'Untagged entries — click to include, again to exclude, again to turn off';
const CLEAR_ALL_TOOLTIP = 'Clear all tag filters';
const SHOW_LESS_LABEL = 'Show less';
const UNFOLD_TOOLTIP = 'Show every entry tag';
const FOLD_TOOLTIP = 'Fold the entry tags to three lines';
const STATE_SUFFIX = Object.freeze({
  [ENTRY_TAG_FILTER_STATE.OFF]: '',
  [ENTRY_TAG_FILTER_STATE.INCLUDE]: ' — included',
  [ENTRY_TAG_FILTER_STATE.EXCLUDE]: ' — excluded',
});

const createPill = (key) => {
  const pill = document.createElement('span');
  pill.classList.add('tag', 'interactable');
  pill.tabIndex = 0;
  pill.setAttribute('role', 'button');
  pill.dataset.filterKey = key;
  return pill;
};

const createUntaggedPill = () => {
  const pill = createPill(UNTAGGED_KEY);
  pill.classList.add(UNTAGGED_CLASS);
  pill.title = UNTAGGED_TOOLTIP;
  const name = document.createElement('span');
  name.classList.add('tag_name');
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-tag');
  name.append(icon, ' Untagged');
  pill.append(name);
  return pill;
};

const createClearAllPill = () => {
  const pill = createPill(CLEAR_ALL_KEY);
  pill.classList.add('actionable', 'clearAllFilters');
  pill.title = CLEAR_ALL_TOOLTIP;
  pill.setAttribute('aria-label', CLEAR_ALL_TOOLTIP);
  const icon = document.createElement('span');
  icon.classList.add('tag_name', 'fa-solid', 'fa-filter-circle-xmark');
  pill.append(icon);
  return pill;
};

const createTagPill = (tag) => {
  const pill = createPill(tag.id);
  pill.dataset.tagName = tag.name;
  paintEntryTagPill(pill, tag);
  const name = document.createElement('span');
  name.classList.add('tag_name');
  name.textContent = formatEntryTagPillText(tag);
  pill.append(name);
  return pill;
};

const createExpanderPill = () => {
  const pill = createPill(MORE_KEY);
  pill.classList.add('placeholder-expander', MORE_CLASS, FOLDED_CLASS);
  const name = document.createElement('span');
  name.classList.add('tag_name');
  pill.append(name);
  return pill;
};

const isFilteringPill = (pill) =>
  pill.classList.contains(INCLUDED_CLASS) || pill.classList.contains(EXCLUDED_CLASS);

const measureBoxes = (elements) =>
  elements.map((element) => {
    const { top, height } = element.getBoundingClientRect();
    return { top, height };
  });

const syncPillState = (pill, state) => {
  pill.classList.toggle(INCLUDED_CLASS, state === ENTRY_TAG_FILTER_STATE.INCLUDE);
  pill.classList.toggle(EXCLUDED_CLASS, state === ENTRY_TAG_FILTER_STATE.EXCLUDE);
  const baseLabel = pill.dataset.tagName ?? 'Untagged entries';
  const label = `${baseLabel}${STATE_SUFFIX[state] ?? ''}`;
  if (pill.dataset.filterKey !== UNTAGGED_KEY) pill.title = label;
  pill.setAttribute('aria-label', label);
};

const buildGroupLabel = () => {
  const label = document.createElement('span');
  label.classList.add('stwid--field-group__label');
  label.textContent = GROUP_LABEL;
  const hint = document.createElement('i');
  hint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--field-group__label-hint');
  hint.title = GROUP_HINT;
  label.append(hint);
  return label;
};

const createManageButton = (onActivate) => {
  const button = document.createElement('div');
  button.classList.add('menu_button', 'fa-solid', 'fa-fw', 'fa-gear', MANAGE_CLASS);
  button.tabIndex = 0;
  button.setAttribute('role', 'button');
  button.title = MANAGE_LABEL;
  button.setAttribute('aria-label', MANAGE_LABEL);
  button.addEventListener('click', onActivate);
  // The host's keyboard layer turns Enter on a `.menu_button` into a click; Space is ours.
  button.addEventListener('keydown', (evt) => {
    if (evt.key !== ' ') return;
    evt.preventDefault();
    button.click();
  });
  return button;
};

const createEntryTagsFilterSlice = ({
  runtime,
  updateFolderActiveToggles,
  onEntryTagFilterChange,
  onEntryTagsChange,
}) => {
  let pillsEl = null;
  let moreEl = null;
  let pillsSignature = null;
  // Unfolded by the expander; not saved, so a reload folds again.
  let foldOpen = false;
  let foldWidth = 0;
  let foldResizeObserver = null;
  // The entry kept visible while it fails the filter (see `nextKeptEntry`).
  let kept = { keptEntry: null, lastOpenKey: null };

  /** The saved selection with deleted tags dropped — written back so a restored tag stays off. */
  const readSelection = () => {
    const settings = Settings.instance;
    const selection = normalizeEntryTagFilter(settings.entryTagFilter, settings.entryTags);
    settings.entryTagFilter = selection;
    return selection;
  };

  const renderPills = () => {
    if (!pillsEl) return;
    const orderedTags = getOrderedEntryTags(Settings.instance, () =>
      iterateCacheEntries(runtime.cache),
    );
    const signature = JSON.stringify(
      orderedTags.map((tag) => [tag.id, tag.name, tag.emoji, tag.color]),
    );
    if (signature === pillsSignature) return;
    pillsSignature = signature;
    const focusedKey = pillsEl.contains(document.activeElement)
      ? document.activeElement.dataset?.filterKey
      : null;
    pillsEl.replaceChildren(
      createUntaggedPill(),
      createClearAllPill(),
      ...orderedTags.map(createTagPill),
      moreEl,
    );
    if (focusedKey) {
      [...pillsEl.children]
        .find((pill) => pill.dataset.filterKey === focusedKey)
        ?.focus({ preventScroll: true });
    }
  };

  const setExpander = ({ label, title, expanded }) => {
    moreEl.querySelector('.tag_name').textContent = label;
    moreEl.title = title;
    moreEl.setAttribute('aria-expanded', String(expanded));
  };

  const labelFoldedExpander = (hiddenPills) => {
    setExpander({
      label: formatEntryTagFoldLabel({
        hiddenCount: hiddenPills.length,
        activeHiddenCount: hiddenPills.filter(isFilteringPill).length,
      }),
      title: UNFOLD_TOOLTIP,
      expanded: false,
    });
  };

  const fitsWithExpander = (shownPills) => {
    const shown = [...shownPills, moreEl];
    return countItemsInFirstLines(measureBoxes(shown), FOLD_MAX_LINES) === shown.length;
  };

  /**
   * Folds the pills to three lines behind the expander, or — unfolded — shows
   * them all with `Show less`. It measures the pills, so it does nothing while
   * the group has no width (its tab is not the open one); the resize observer
   * calls it again once it has.
   */
  const applyFold = () => {
    if (!pillsEl || !moreEl || pillsEl.clientWidth === 0) return;
    const pills = [...pillsEl.children].filter((pill) => pill !== moreEl);
    for (const pill of pills) pill.classList.remove(FOLDED_CLASS);
    moreEl.classList.add(FOLDED_CLASS);
    pillsEl.classList.remove(PILLS_UNFOLDED_CLASS);
    const fitting = countItemsInFirstLines(measureBoxes(pills), FOLD_MAX_LINES);
    if (fitting >= pills.length) return;
    moreEl.classList.remove(FOLDED_CLASS);
    if (foldOpen) {
      // Capped and scrolling in CSS, so the books below stay in view.
      pillsEl.classList.add(PILLS_UNFOLDED_CLASS);
      setExpander({ label: SHOW_LESS_LABEL, title: FOLD_TOOLTIP, expanded: true });
      return;
    }
    let shownCount = fitting;
    for (const pill of pills.slice(shownCount)) pill.classList.add(FOLDED_CLASS);
    labelFoldedExpander(pills.slice(shownCount));
    // The expander needs room on the last line too, so give up pills until it fits.
    while (shownCount > 0 && !fitsWithExpander(pills.slice(0, shownCount))) {
      shownCount -= 1;
      pills[shownCount].classList.add(FOLDED_CLASS);
      labelFoldedExpander(pills.slice(shownCount));
    }
  };

  const syncPillStates = (selection) => {
    for (const pill of pillsEl?.children ?? []) {
      const key = pill.dataset.filterKey;
      if (key === CLEAR_ALL_KEY || key === MORE_KEY) continue;
      const state =
        key === UNTAGGED_KEY ? selection.untagged : getEntryTagFilterTagState(selection, key);
      syncPillState(pill, state);
    }
    // A state change can change the expander's `· K active` and so its width.
    applyFold();
  };

  const updateKeptEntry = ({ selectionChanged }) => {
    kept = nextKeptEntry({
      previous: kept,
      openEntry: runtime.getCurrentEditor?.() ?? null,
      selectionChanged,
    });
  };

  /**
   * Re-reads the selection and the tag list, then sets the hide class on every
   * rendered entry row and book row. Folder visibility is left to the caller.
   */
  const applyEntryTagFilterClasses = ({ selectionChanged = false } = {}) => {
    const selection = readSelection();
    renderPills();
    syncPillStates(selection);
    updateKeptEntry({ selectionChanged });
    const cache = runtime.cache ?? {};
    const books = {};
    for (const [bookName, book] of Object.entries(cache)) books[bookName] = book?.entries ?? {};
    const hiding = resolveEntryTagFilterHiding({
      books,
      selection,
      tags: Settings.instance.entryTags,
      keptEntry: kept.keptEntry,
    });
    for (const [bookName, { bookHidden, hiddenUids }] of Object.entries(hiding)) {
      const dom = cache[bookName]?.dom;
      dom?.root?.classList.toggle(ENTRY_TAGS_FILTERED_CLASS, bookHidden);
      for (const [uid, entryDom] of Object.entries(dom?.entry ?? {})) {
        entryDom?.root?.classList.toggle(ENTRY_TAGS_FILTERED_CLASS, hiddenUids.has(uid));
      }
    }
  };

  const applyEntryTagFilter = (options) => {
    applyEntryTagFilterClasses(options);
    updateFolderActiveToggles?.();
  };

  const setSelection = (selection) => {
    const changed = JSON.stringify(selection) !== JSON.stringify(readSelection());
    Settings.instance.entryTagFilter = selection;
    Settings.instance.save();
    applyEntryTagFilter({ selectionChanged: true });
    // A re-render reselects every Entry Manager row, so Clear all on an empty
    // filter must not cost the user their row selection.
    if (changed) onEntryTagFilterChange?.();
  };

  /** What the Clear all pill does; the Book Browser's empty state calls it too. */
  const clearEntryTagFilter = () => setSelection(createEmptyEntryTagFilter());

  /** After an edit in Manage entry tags: new pills now, then the editor row and Entry Manager. */
  const onTagDefinitionsChange = ({ filterAffected = false } = {}) => {
    applyEntryTagFilter();
    if (filterAffected) onEntryTagFilterChange?.();
    onEntryTagsChange?.();
  };

  const openManager = () =>
    openEntryTagManager({
      getCache: () => runtime.cache ?? {},
      onTagsChange: onTagDefinitionsChange,
    });

  const onPillActivate = (pill) => {
    const key = pill?.dataset?.filterKey;
    if (!key) return;
    if (key === MORE_KEY) {
      foldOpen = !foldOpen;
      applyFold();
    } else if (key === CLEAR_ALL_KEY) {
      clearEntryTagFilter();
    } else if (key === UNTAGGED_KEY) {
      setSelection(cycleEntryTagFilterUntagged(readSelection()));
    } else {
      setSelection(cycleEntryTagFilterTag(readSelection(), key));
    }
  };

  const setupEntryTagsFilterSection = (row) => {
    const group = document.createElement('div');
    group.classList.add('stwid--field-group', GROUP_CLASS);
    group.append(buildGroupLabel());
    pillsEl = document.createElement('div');
    pillsEl.classList.add('tags', 'rm_tag_filter', PILLS_CLASS);
    pillsEl.addEventListener('click', (evt) => {
      onPillActivate(evt.target.closest?.(`.${PILLS_CLASS} > .tag`));
    });
    // The host's keyboard layer turns Enter on an `.interactable` into a click;
    // Space, which a `role="button"` also answers to, is left to us.
    pillsEl.addEventListener('keydown', (evt) => {
      if (evt.key !== ' ') return;
      const pill = evt.target.closest?.(`.${PILLS_CLASS} > .tag`);
      if (!pill) return;
      evt.preventDefault();
      pill.click();
    });
    group.append(
      pillsEl,
      createManageButton(() => void openManager()),
    );
    row.append(group);
    moreEl = createExpanderPill();
    pillsSignature = null;
    renderPills();
    syncPillStates(readSelection());
    // Only a width change re-folds: folding changes the height, which would
    // otherwise call this back for nothing.
    foldWidth = 0;
    foldResizeObserver?.disconnect();
    foldResizeObserver = new ResizeObserver(() => {
      const width = pillsEl?.clientWidth ?? 0;
      if (width === foldWidth) return;
      foldWidth = width;
      applyFold();
    });
    foldResizeObserver.observe(pillsEl);
  };

  const cleanup = () => {
    foldResizeObserver?.disconnect();
    foldResizeObserver = null;
  };

  return {
    applyEntryTagFilter,
    applyEntryTagFilterClasses,
    cleanup,
    clearEntryTagFilter,
    setupEntryTagsFilterSection,
  };
};

export { createEntryTagsFilterSlice };
