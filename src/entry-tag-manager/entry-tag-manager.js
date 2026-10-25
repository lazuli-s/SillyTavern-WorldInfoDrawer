// Manage entry tags — the popup opened by the gear in the Visibility tab's
// Entry tags group.
//
// A copy of the host's own "Manage tags" popup, built on the host's popup
// (`callGenericPopup`): a title row with Restore defaults and Create, the sort
// mode select and a hint line, then one row per tag — drag handle, emoji
// button, colour swatch (the host's `toolcool-color-picker`), the name as a
// coloured editable pill, its usage count and a trash button. Look: the entry
// tags spec, Visual decisions 7 (7A) and 9 (9G).
//
// Every edit is written to the settings at once and reported through
// `onTagsChange`, so the filter pills and the editor picker follow while the
// popup is still open. The tag rules (names, Restore defaults, sort modes,
// order) live in `shared/entry-tags.js`.
//
// Usage counts read every loaded book. While the popup is open, a book the
// host reports changed (`WORLDINFO_UPDATED`) is counted from the data the host
// sent, since the drawer's cache catches up with it a moment later.
//
// The emoji button shows the tag's emoji (or a dimmed `fa-ban` for none) and
// opens the emoji grid in a panel under it (`entry-tag-manager.emoji-grid.js`,
// Visual decision 8 (8A)).

import {
  ENTRY_TAG_NAME_MAX_LENGTH,
  ENTRY_TAG_SORT,
  countEntryTagUsage,
  createEntryTag,
  deleteEntryTag,
  formatEntryTagUsage,
  iterateCacheEntries,
  nextNewEntryTagName,
  normalizeEntryTagName,
  paintEntryTagPill,
  renameEntryTag,
  reorderEntryTags,
  restoreDefaultEntryTags,
  setEntryTagColor,
  setEntryTagEmoji,
  sortEntryTags,
} from '../shared/entry-tags.js';
import { isEntryTagFilterActive, normalizeEntryTagFilter } from '../shared/entry-tags.filter.js';
import { Settings } from '../shared/settings.js';
import { getSortableDelay } from '../shared/st-host.js';
import { openEmojiPopover } from './entry-tag-manager.emoji-grid.js';

const LOG_PREFIX = '[STWID]';
const ROOT_CLASS = 'stwid--tag-manager';
const LIST_CLASS = 'stwid--tag-manager__list';
const HANDLE_CLASS = 'stwid--tag-manager__handle';
const ROW_CLASS = 'tag_view_item';
const SWATCH_CLASS = 'stwid--tag-manager__swatch';
const EMOJI_CLASS = 'stwid--tag-manager__emoji';
// Not the host's `tag_view_name` / `tag_delete`: the host listens for input and clicks on
// those classes document-wide and would treat these rows as its own character tags.
const NAME_CLASS = 'stwid--tag-manager__name';
const COUNTER_CLASS = 'tag_view_counter';
const DELETE_CLASS = 'stwid--tag-manager__delete';
const HIDDEN_STATE_CLASS = 'stwid--state-hidden';

const TITLE = 'Entry tags';
const HINT =
  'Drag ☰ to reorder. Click a name to rename. Click the colour or the emoji to change them.';
const EMPTY_TEXT = 'No entry tags. Create one, or restore the defaults.';
const SORT_OPTIONS = Object.freeze([
  [ENTRY_TAG_SORT.MANUAL, 'Manual (Drag & Drop)'],
  [ENTRY_TAG_SORT.ALPHA, 'Alphabetical (A-Z)'],
  [ENTRY_TAG_SORT.USAGE, 'Most used'],
]);

const RENAME_REFUSED = Object.freeze({
  blank: 'A tag name cannot be blank. The old name was put back.',
  duplicate: (existing) =>
    `A tag named “${existing.name}” already exists. The old name was put back.`,
});
const RENAME_CAPPED = `Tag names are capped at ${ENTRY_TAG_NAME_MAX_LENGTH} characters.`;

/** The delete confirmation's text: what deleting does, naming how many entries use the tag. */
function formatDeleteEntryTagMessage(count) {
  if (count === 0) return 'No entry uses this tag.';
  const who = count === 1 ? 'that entry keeps it and shows' : 'those entries keep it and show';
  return `Used by ${formatEntryTagUsage(count)}. Only the tag is deleted: ${who} an “Unknown tag” pill instead. No book is changed.`;
}

/** The toast after Restore defaults. */
function formatRestoreDefaultsMessage(addedCount) {
  if (addedCount === 0) return 'Every default tag is already here.';
  return `Restored ${addedCount} default ${addedCount === 1 ? 'tag' : 'tags'}.`;
}

const getHost = () => {
  const context = globalThis.SillyTavern?.getContext?.() ?? {};
  return {
    callGenericPopup: context.callGenericPopup,
    POPUP_TYPE: context.POPUP_TYPE,
    POPUP_RESULT: context.POPUP_RESULT,
    eventSource: context.eventSource ?? null,
    eventTypes: context.eventTypes ?? context.event_types ?? null,
  };
};

const createMenuButton = ({ iconClass, label, title }) => {
  const button = document.createElement('div');
  button.classList.add('menu_button', 'menu_button_icon');
  button.tabIndex = 0;
  button.setAttribute('role', 'button');
  button.title = title;
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', iconClass);
  const text = document.createElement('span');
  text.textContent = label;
  button.append(icon, text);
  return button;
};

const buildHead = () => {
  const head = document.createElement('div');
  head.classList.add('title_restorable', 'stwid--tag-manager__head');
  const title = document.createElement('h3');
  title.textContent = TITLE;
  const buttons = document.createElement('div');
  buttons.classList.add('flex-container');
  const restoreButton = createMenuButton({
    iconClass: 'fa-rotate-left',
    label: 'Restore defaults',
    title: 'Re-add any default tag that was deleted',
  });
  const createButton = createMenuButton({
    iconClass: 'fa-plus',
    label: 'Create',
    title: 'Create a new tag',
  });
  buttons.append(restoreButton, createButton);
  head.append(title, buttons);
  return { head, restoreButton, createButton };
};

const buildSortBlock = (mode) => {
  const block = document.createElement('div');
  block.classList.add('stwid--tag-manager__sort');
  const row = document.createElement('div');
  row.classList.add('flex-container', 'stwid--tag-manager__sort-row');
  const label = document.createElement('span');
  label.textContent = 'Sort mode:';
  const select = document.createElement('select');
  select.classList.add('text_pole');
  select.setAttribute('aria-label', 'Sort mode');
  for (const [value, text] of SORT_OPTIONS) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  select.value = mode;
  row.append(label, select);
  const hint = document.createElement('small');
  hint.textContent = HINT;
  block.append(row, hint);
  return { block, select };
};

/** Shows a tag's emoji on its button, or a dimmed `fa-ban` when it has none. */
const paintEmojiButton = (button, tag) => {
  if (tag.emoji) {
    button.textContent = tag.emoji;
    button.setAttribute('aria-label', `Emoji: ${tag.emoji}`);
  } else {
    const none = document.createElement('i');
    none.classList.add('fa-solid', 'fa-ban', 'stwid--tag-manager__no-emoji');
    none.setAttribute('aria-hidden', 'true');
    button.replaceChildren(none);
    button.setAttribute('aria-label', 'No emoji');
  }
};

const buildEmojiButton = (tag) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add(EMOJI_CLASS);
  button.title = 'Choose emoji';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  paintEmojiButton(button, tag);
  return button;
};

const buildSwatch = (tag) => {
  const swatch = document.createElement('toolcool-color-picker');
  swatch.classList.add(SWATCH_CLASS);
  swatch.setAttribute('color', tag.color);
  swatch.setAttribute('button-width', '1.5em');
  swatch.setAttribute('button-height', '1.5em');
  swatch.setAttribute('button-padding', '0');
  swatch.title = 'Change colour';
  return swatch;
};

const buildRow = ({ tag, count, manual }) => {
  const row = document.createElement('div');
  row.classList.add(ROW_CLASS);
  row.dataset.tagId = tag.id;

  const handle = document.createElement('div');
  handle.classList.add('drag-handle', HANDLE_CLASS);
  // Alphabetical and Most used keep the handle's space but hide it.
  handle.classList.toggle(HIDDEN_STATE_CLASS, !manual);
  handle.title = 'Drag to reorder tag';
  handle.setAttribute('aria-hidden', 'true');
  handle.textContent = '☰';

  const name = document.createElement('div');
  name.classList.add(NAME_CLASS, 'tag');
  name.contentEditable = 'true';
  name.spellcheck = false;
  name.setAttribute('role', 'textbox');
  name.setAttribute('aria-label', `Tag name: ${tag.name}`);
  name.textContent = tag.name;
  paintEntryTagPill(name, tag);

  const counter = document.createElement('div');
  counter.classList.add(COUNTER_CLASS);
  counter.textContent = formatEntryTagUsage(count);

  const remove = document.createElement('div');
  remove.classList.add(DELETE_CLASS, 'fa-solid', 'fa-trash-can', 'right_menu_button');
  remove.tabIndex = 0;
  remove.setAttribute('role', 'button');
  remove.title = 'Delete tag';
  remove.setAttribute('aria-label', `Delete tag ${tag.name}`);

  row.append(handle, buildEmojiButton(tag), buildSwatch(tag), name, counter, remove);
  return row;
};

/** The id of the tag whose row holds an element. */
const tagIdOf = (element) => element.closest?.(`.${ROW_CLASS}`)?.dataset.tagId;

/** Selects all of an editable element's text, so typing replaces it. */
const selectContents = (element) => {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};

/**
 * Builds the popup's content and wires it. Returns the root and a cleanup.
 * @param {{ getCache: () => object, onTagsChange: (change: { filterAffected: boolean }) => void,
 *   confirmDelete: (tag: object, count: number) => Promise<boolean> }} args
 */
function buildEntryTagManager({ getCache, onTagsChange, confirmDelete }) {
  const settings = Settings.instance;
  const root = document.createElement('div');
  root.classList.add(ROOT_CLASS);
  const { head, restoreButton, createButton } = buildHead();
  const { block: sortBlock, select: sortSelect } = buildSortBlock(settings.entryTagSort);
  const list = document.createElement('div');
  list.classList.add(LIST_CLASS);
  root.append(head, sortBlock, list);

  // Books the host reported changed while the popup is open, by name.
  const fresherEntries = {};
  let usage = new Map();

  const countUsage = () => {
    usage = countEntryTagUsage(iterateCacheEntries(getCache(), fresherEntries));
  };
  const usageOf = (id) => usage.get(id) ?? 0;
  const isManual = () => settings.entryTagSort === ENTRY_TAG_SORT.MANUAL;
  const findTag = (id) => settings.entryTags.find((tag) => tag.id === id) ?? null;
  const findRow = (id) => [...list.children].find((row) => row.dataset?.tagId === id) ?? null;

  const commit = (nextTags, { filterAffected = false } = {}) => {
    settings.entryTags = nextTags;
    settings.save();
    onTagsChange({ filterAffected });
  };

  // The open emoji panel, if any: { tagId, close }.
  let emojiPopover = null;
  const closeEmojiPopover = () => emojiPopover?.close?.();

  const renderList = () => {
    // The panel hangs from a row this is about to replace.
    closeEmojiPopover();
    countUsage();
    const manual = isManual();
    const ordered = sortEntryTags(settings.entryTags, settings.entryTagSort, usage);
    if (!ordered.length) {
      const empty = document.createElement('div');
      empty.classList.add('stwid--tag-manager__empty');
      empty.textContent = EMPTY_TEXT;
      list.replaceChildren(empty);
    } else {
      const rows = ordered.map((tag) => buildRow({ tag, count: usageOf(tag.id), manual }));
      // The picker's `change` does not bubble, so each swatch gets its own listener.
      for (const row of rows) {
        row.querySelector(`.${SWATCH_CLASS}`).addEventListener('change', onColorChange);
      }
      list.replaceChildren(...rows);
    }
    $(list).sortable('option', 'disabled', !manual);
  };

  const isEditingName = () => document.activeElement?.classList?.contains(NAME_CLASS) ?? false;

  /** New counts after a book changed; Most used re-sorts unless a name is being typed. */
  const refreshUsage = () => {
    if (settings.entryTagSort === ENTRY_TAG_SORT.USAGE && !isEditingName()) {
      renderList();
      return;
    }
    countUsage();
    for (const row of list.children) {
      const counter = row.querySelector(`.${COUNTER_CLASS}`);
      if (counter) counter.textContent = formatEntryTagUsage(usageOf(row.dataset.tagId));
    }
  };

  const renameFromPill = (nameEl) => {
    const id = tagIdOf(nameEl);
    const tag = findTag(id);
    if (!tag) return;
    const typed = nameEl.textContent ?? '';
    if (typed === tag.name) return;
    const result = renameEntryTag(settings.entryTags, id, typed);
    if (!result.ok) {
      nameEl.textContent = tag.name;
      if (result.reason === 'duplicate') toastr.warning(RENAME_REFUSED.duplicate(result.existing));
      else toastr.warning(RENAME_REFUSED.blank);
      return;
    }
    const newName = normalizeEntryTagName(typed);
    nameEl.textContent = newName;
    nameEl.setAttribute('aria-label', `Tag name: ${newName}`);
    nameEl
      .closest(`.${ROW_CLASS}`)
      ?.querySelector(`.${DELETE_CLASS}`)
      ?.setAttribute('aria-label', `Delete tag ${newName}`);
    if (newName !== typed.trim()) toastr.info(RENAME_CAPPED);
    commit(result.tags);
    // Alphabetical order may have changed; the focus has already left the name.
    if (settings.entryTagSort === ENTRY_TAG_SORT.ALPHA) renderList();
  };

  const createTag = () => {
    const result = createEntryTag(settings.entryTags, nextNewEntryTagName(settings.entryTags));
    if (!result.ok) return;
    commit(result.tags);
    renderList();
    const nameEl = findRow(result.tag.id)?.querySelector(`.${NAME_CLASS}`);
    if (!nameEl) return;
    nameEl.scrollIntoView({ block: 'nearest' });
    nameEl.focus();
    selectContents(nameEl);
  };

  const restoreDefaults = () => {
    const { tags, added } = restoreDefaultEntryTags(settings.entryTags);
    toastr.info(formatRestoreDefaultsMessage(added.length));
    if (!added.length) return;
    // A restored tag reappears on the entries still carrying its id.
    const filterAffected = isEntryTagFilterActive(settings.entryTagFilter);
    commit(tags, { filterAffected });
    renderList();
  };

  const deleteTag = async (id) => {
    const tag = findTag(id);
    if (!tag) return;
    if (!(await confirmDelete(tag, usageOf(id)))) return;
    if (!findTag(id)) return;
    const filterAffected = isEntryTagFilterActive(settings.entryTagFilter);
    const nextTags = deleteEntryTag(settings.entryTags, id);
    // A selection on the deleted tag is dropped now, so restoring the tag later
    // does not bring it back.
    settings.entryTagFilter = normalizeEntryTagFilter(settings.entryTagFilter, nextTags);
    const nextFocusId = findRow(id)?.nextElementSibling?.dataset?.tagId ?? null;
    commit(nextTags, { filterAffected });
    renderList();
    const nextFocus = nextFocusId && findRow(nextFocusId)?.querySelector(`.${DELETE_CLASS}`);
    (nextFocus || createButton).focus();
  };

  const setEmoji = (id, emoji) => {
    const tag = findTag(id);
    // Picking the emoji the tag already has changes nothing.
    if (!tag || (tag.emoji ?? null) === (emoji ?? null)) return;
    commit(setEntryTagEmoji(settings.entryTags, id, emoji));
    const button = findRow(id)?.querySelector(`.${EMOJI_CLASS}`);
    if (button) paintEmojiButton(button, findTag(id));
  };

  const toggleEmojiPopover = (button) => {
    const id = tagIdOf(button);
    const wasOpenHere = emojiPopover?.tagId === id;
    closeEmojiPopover();
    const tag = findTag(id);
    if (wasOpenHere || !tag) return;
    const opened = { tagId: id, close: null };
    emojiPopover = opened;
    opened.close = openEmojiPopover({
      button,
      mount: root,
      label: `Emoji for ${tag.name}`,
      current: tag.emoji,
      onPick: (emoji) => setEmoji(id, emoji),
      onClose: () => {
        if (emojiPopover === opened) emojiPopover = null;
      },
    }).close;
  };

  function onColorChange(evt) {
    const row = evt.currentTarget.closest(`.${ROW_CLASS}`);
    const tag = findTag(row?.dataset.tagId);
    const color = evt.detail?.hex?.toLowerCase?.();
    // The picker also reports the colour it was given; only a real change counts.
    if (!tag || !color || color === tag.color.toLowerCase()) return;
    commit(setEntryTagColor(settings.entryTags, tag.id, color));
    paintEntryTagPill(row.querySelector(`.${NAME_CLASS}`), { ...tag, color });
  }

  restoreButton.addEventListener('click', restoreDefaults);
  createButton.addEventListener('click', createTag);
  sortSelect.addEventListener('change', () => {
    settings.entryTagSort = sortSelect.value;
    settings.save();
    renderList();
    onTagsChange({ filterAffected: false });
  });

  list.addEventListener('click', (evt) => {
    const remove = evt.target.closest?.(`.${DELETE_CLASS}`);
    if (remove) void deleteTag(tagIdOf(remove));
    const emojiButton = evt.target.closest?.(`.${EMOJI_CLASS}`);
    if (emojiButton) toggleEmojiPopover(emojiButton);
  });
  list.addEventListener('focusout', (evt) => {
    if (evt.target.classList?.contains(NAME_CLASS)) renameFromPill(evt.target);
  });
  list.addEventListener('keydown', (evt) => {
    const target = evt.target;
    if (!target.classList?.contains(NAME_CLASS)) return;
    if (evt.key === 'Enter') {
      evt.preventDefault();
      target.blur();
    } else if (evt.key === 'Escape') {
      // Puts the name back and keeps the popup open.
      evt.preventDefault();
      evt.stopPropagation();
      target.textContent = findTag(tagIdOf(target))?.name ?? '';
      target.blur();
    }
  });
  // The host's keyboard layer turns Enter on a focused control into a click;
  // Space, which a `role="button"` also answers to, is left to us.
  root.addEventListener('keydown', (evt) => {
    if (evt.key !== ' ' || !evt.target.matches?.(`.menu_button, .${DELETE_CLASS}`)) return;
    evt.preventDefault();
    evt.target.click();
  });

  $(list).sortable({
    delay: getSortableDelay(),
    handle: `.${HANDLE_CLASS}`,
    stop: () => {
      if (!isManual()) return;
      const orderedIds = [...list.children].map((row) => row.dataset.tagId).filter(Boolean);
      const nextTags = reorderEntryTags(settings.entryTags, orderedIds);
      // A drag dropped back where it started changes nothing.
      if (nextTags.every((tag, index) => tag === settings.entryTags[index])) return;
      commit(nextTags);
    },
  });
  renderList();

  const onWorldInfoUpdated = (bookName, data) => {
    if (!data?.entries) return;
    fresherEntries[bookName] = data.entries;
    refreshUsage();
  };

  const cleanup = () => {
    closeEmojiPopover();
    try {
      $(list).sortable('destroy');
    } catch {
      // Already gone with the popup.
    }
  };

  return { root, onWorldInfoUpdated, cleanup };
}

let isOpen = false;

/**
 * Opens the Manage entry tags popup; resolves when it closes. A second call
 * while it is open does nothing.
 * @param {object} args
 * @param {() => object} args.getCache - The drawer's book cache.
 * @param {(change: { filterAffected: boolean }) => void} args.onTagsChange - Called after
 *   every saved edit; `filterAffected` is true when the change can alter which
 *   entries an active tag filter shows.
 */
export async function openEntryTagManager({ getCache, onTagsChange }) {
  if (isOpen) return;
  const { callGenericPopup, POPUP_TYPE, POPUP_RESULT, eventSource, eventTypes } = getHost();
  if (typeof callGenericPopup !== 'function' || !POPUP_TYPE || !POPUP_RESULT) {
    console.warn(LOG_PREFIX, 'Manage entry tags: the host popup is unavailable.');
    toastr.error('Could not open Manage entry tags.');
    return;
  }

  const confirmDelete = async (tag, count) => {
    const content = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = `Delete the entry tag “${tag.name}”?`;
    const text = document.createElement('p');
    text.textContent = formatDeleteEntryTagMessage(count);
    content.append(title, text);
    const result = await callGenericPopup(content, POPUP_TYPE.CONFIRM, null, {
      okButton: 'Delete',
      cancelButton: 'Cancel',
    });
    return result === POPUP_RESULT.AFFIRMATIVE;
  };

  isOpen = true;
  const updatedEvent = eventTypes?.WORLDINFO_UPDATED;
  let manager = null;
  try {
    manager = buildEntryTagManager({ getCache, onTagsChange, confirmDelete });
    if (updatedEvent) eventSource?.on?.(updatedEvent, manager.onWorldInfoUpdated);
    await callGenericPopup(manager.root, POPUP_TYPE.TEXT, null, {
      allowVerticalScrolling: true,
      wide: true,
      large: true,
    });
  } catch (error) {
    console.error(LOG_PREFIX, 'Manage entry tags failed.', error);
    toastr.error('Manage entry tags failed. Changes already made were saved.');
  } finally {
    if (manager) {
      if (updatedEvent) eventSource?.removeListener?.(updatedEvent, manager.onWorldInfoUpdated);
      manager.cleanup();
    }
    isOpen = false;
  }
}
