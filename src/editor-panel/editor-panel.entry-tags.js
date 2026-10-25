// Entry editor — the Entry tags row.
//
// A row inserted directly beneath the host's "Filter to Characters or Tags /
// Filter to Generation Triggers" row of the entry the drawer editor has open
// (the host template is never modified). It shows the entry's tag pills in a
// box drawn like the host's filter box, takes typing to narrow the dropdown or
// to create a tag on the spot, and removes a tag with its ×. Look: the entry
// tags spec, Visual decisions 1 (1A), 2 (2C) and 9 (9G).
//
// How a change is written into the entry and saved is
// `editor-panel.entry-tags.save.js`.

import {
  findEntryTagByName,
  formatEntryTagPillText,
  getOrderedEntryTags,
  iterateCacheEntries,
  normalizeEntryTagName,
  paintEntryTagPill,
  readEntryTagIds,
  writeEntryTagIds,
} from '../shared/entry-tags.js';
import {
  MULTISELECT_DROPDOWN_CLOSE_HANDLER,
  closeOpenMultiselectDropdownMenus,
  multiselectDropdownSearchMatches,
  setMultiselectDropdownOptionCheckboxState,
  wireMultiselectDropdownKeyboardNavigation,
} from '../shared/multiselect-dropdown.js';
import { Settings } from '../shared/settings.js';
import {
  createAndAttachEntryTag,
  createEntryTagsCommit,
  sameEntryTagIds,
} from './editor-panel.entry-tags.save.js';

const LOG_PREFIX = '[STWID]';
const ROW_CLASS = 'stwid--entry-tags';
const ACTIVE_STATE_CLASS = 'stwid--state-active';
const OPTION_CLASSES = ['stwid--multiselect-dropdown__option', 'stwid--menu-item'];


const ENTRY_TAGS_LABEL = 'Entry tags';
const ENTRY_TAGS_PLACEHOLDER = 'Add or create a tag…';
const ENTRY_TAGS_SAVE_FAILED_MESSAGE =
  'Failed to save entry tags. Changes were not persisted.';
const EMPTY_STATE_TEXT = 'No entry tags yet. Type a name to create one.';
const STALE_ID_FRAGMENT_LENGTH = 4;

/** The stale pill's text — two stale ids on one entry differ by the fragment. */
export function formatStaleEntryTagLabel(id) {
  return `Unknown tag · ${Array.from(id).slice(0, STALE_ID_FRAGMENT_LENGTH).join('')}`;
}

export function formatStaleEntryTagTooltip(id) {
  return `Unknown tag (id ${id}). It was deleted here, or the book came from someone else. Click × to remove it.`;
}

const formatCreateEntryTagLabel = (name) => `Create tag “${name}”`;
const formatExistingEntryTagNotice = (typed) => `“${typed}” already exists — pick it below.`;

/**
 * The entry's pills: known tags in the one tag order, then ids with no
 * definition (stale) in the order the entry stores them.
 * @param {object[]} orderedTags
 * @param {string[]} ids
 * @returns {Array<{ id: string, tag: object|null }>} `tag` is null for a stale id.
 */
export function resolveEntryTagPills(orderedTags, ids) {
  const idSet = new Set(ids);
  const known = orderedTags.filter((tag) => idSet.has(tag.id));
  const knownIds = new Set(known.map((tag) => tag.id));
  return [
    ...known.map((tag) => ({ id: tag.id, tag })),
    ...ids.filter((id) => !knownIds.has(id)).map((id) => ({ id, tag: null })),
  ];
}

/**
 * What the dropdown shows for the text typed in the box.
 * - Nothing typed: every tag, ticked when the entry carries it.
 * - A name an existing tag holds (ignoring capitals): no create row; the
 *   "already exists" notice and that tag's row, so the user picks it.
 * - Any other name: the create row first, then the tags whose names contain it.
 * @param {{ orderedTags: object[], selectedIds: string[], query: string }} args
 * @returns {{ createName: string|null, existing: object|null,
 *   rows: Array<{ tag: object, checked: boolean }> }}
 */
export function buildEntryTagPickerModel({ orderedTags, selectedIds, query }) {
  const selected = new Set(selectedIds);
  const toRow = (tag) => ({ tag, checked: selected.has(tag.id) });
  const typed = normalizeEntryTagName(query);
  if (typed === null) {
    return { createName: null, existing: null, rows: orderedTags.map(toRow) };
  }
  const existing = findEntryTagByName(orderedTags, typed);
  if (existing) {
    return { createName: null, existing, rows: [toRow(existing)] };
  }
  return {
    createName: typed,
    existing: null,
    rows: orderedTags.filter((tag) => multiselectDropdownSearchMatches(tag.name, typed)).map(toRow),
  };
}

/* -------------------------------------------------------------------------- */
/* DOM                                                                        */
/* -------------------------------------------------------------------------- */

function buildTagPill(tag) {
  const pill = document.createElement('span');
  pill.classList.add('tag');
  pill.title = tag.name;
  paintEntryTagPill(pill, tag);
  const name = document.createElement('span');
  name.classList.add('tag_name');
  name.textContent = formatEntryTagPillText(tag);
  pill.append(name);
  return pill;
}

function buildStalePill(id) {
  const pill = document.createElement('span');
  pill.classList.add('tag', 'stwid--entry-tags__stale', 'stwid--entry-tags__stale--unknown');
  pill.title = formatStaleEntryTagTooltip(id);
  const name = document.createElement('span');
  name.classList.add('tag_name');
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-circle-question');
  name.append(icon, ` ${formatStaleEntryTagLabel(id)}`);
  pill.append(name);
  return pill;
}

function buildRemoveButton(label, onRemove) {
  const remove = document.createElement('i');
  remove.classList.add('fa-solid', 'fa-circle-xmark', 'tag_remove');
  remove.title = 'Remove tag';
  remove.setAttribute('role', 'button');
  remove.setAttribute('aria-label', `Remove tag ${label}`);
  remove.tabIndex = 0;
  remove.addEventListener('click', (evt) => {
    evt.stopPropagation();
    onRemove({ fromKeyboard: false });
  });
  remove.addEventListener('keydown', (evt) => {
    if (evt.key !== 'Enter' && evt.key !== ' ') return;
    evt.preventDefault();
    evt.stopPropagation();
    onRemove({ fromKeyboard: true });
  });
  return remove;
}

function buildOption(className) {
  const option = document.createElement('button');
  option.type = 'button';
  option.classList.add(...OPTION_CLASSES);
  if (className) option.classList.add(className);
  return option;
}

function buildTagOption({ tag, checked }, onToggle) {
  const option = buildOption();
  option.dataset.stwidTagId = tag.id;
  option.setAttribute('aria-pressed', String(checked));
  const box = document.createElement('i');
  box.classList.add('fa-solid', 'fa-fw', 'stwid--multiselect-dropdown__option-checkbox');
  setMultiselectDropdownOptionCheckboxState(box, checked);
  option.append(box, buildTagPill(tag));
  option.addEventListener('click', (evt) => onToggle(tag, checked, evt));
  return option;
}

function buildCreateOption(name, onCreate) {
  const option = buildOption('stwid--entry-tags__create');
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-fw', 'fa-plus');
  const text = document.createElement('span');
  text.textContent = formatCreateEntryTagLabel(name);
  option.append(icon, text);
  option.addEventListener('click', () => onCreate());
  return option;
}

function buildExistsNotice(typed) {
  const notice = document.createElement('div');
  notice.classList.add('stwid--entry-tags__exists');
  notice.setAttribute('role', 'status');
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-fw', 'fa-triangle-exclamation');
  const text = document.createElement('span');
  text.textContent = formatExistingEntryTagNotice(typed);
  notice.append(icon, text);
  return notice;
}

function buildEmptyState() {
  const empty = document.createElement('div');
  empty.classList.add('stwid--multiselect-dropdown__empty-state');
  empty.textContent = EMPTY_STATE_TEXT;
  return empty;
}

function buildRowSkeleton() {
  const row = document.createElement('div');
  row.classList.add(ROW_CLASS);
  // Every change here saves itself, so the editor's dirty tracking skips the row.
  row.dataset.stwidNoDirty = '';

  const head = document.createElement('div');
  head.classList.add('flex-container', 'justifySpaceBetween');
  const label = document.createElement('small');
  label.textContent = ENTRY_TAGS_LABEL;
  head.append(label);

  const box = document.createElement('div');
  box.classList.add('stwid--entry-tags__box');

  const input = document.createElement('input');
  input.type = 'text';
  input.classList.add('stwid--entry-tags__input');
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Add or create an entry tag');
  input.setAttribute('aria-haspopup', 'menu');
  input.setAttribute('aria-expanded', 'false');
  box.append(input);

  const menu = document.createElement('div');
  menu.classList.add('stwid--multiselect-dropdown__menu', 'stwid--entry-tags__menu');
  menu.setAttribute('aria-label', ENTRY_TAGS_LABEL);

  row.append(head, box, menu);
  return { row, box, input, menu };
}

/**
 * Builds one entry's tag row and wires it. Returns what the controller needs
 * to follow outside edits.
 */
function buildEntryTagsRow({ getOrderedTags, editorEntry, commit, settings }) {
  const { row, box, input, menu } = buildRowSkeleton();
  let isOpen = false;
  let pendingSaves = 0;

  const getIds = () => readEntryTagIds(editorEntry);

  const keyboardNav = wireMultiselectDropdownKeyboardNavigation(menu, {
    getSearchInput: () => input,
    isOpen: () => isOpen,
    // The menu opens on focus of the box's own field; trapping Tab would make
    // that field impossible to leave.
    trapTab: false,
  });

  const renderPills = (orderedTags) => {
    const ids = getIds();
    for (const pill of box.querySelectorAll(':scope > .tag')) pill.remove();
    for (const { id, tag } of resolveEntryTagPills(orderedTags, ids)) {
      const pill = tag ? buildTagPill(tag) : buildStalePill(id);
      const label = tag ? tag.name : formatStaleEntryTagLabel(id);
      pill.append(
        buildRemoveButton(label, ({ fromKeyboard }) => {
          changeIds(getIds().filter((value) => value !== id));
          // The focused × is gone with the re-render; give a keyboard user the field.
          if (fromKeyboard) input.focus();
        }),
      );
      input.before(pill);
    }
    input.placeholder = ids.length ? '' : ENTRY_TAGS_PLACEHOLDER;
  };

  const renderMenu = (orderedTags) => {
    const model = buildEntryTagPickerModel({
      orderedTags,
      selectedIds: getIds(),
      query: input.value,
    });
    menu.replaceChildren();
    if (model.existing) menu.append(buildExistsNotice(normalizeEntryTagName(input.value)));
    if (model.createName) menu.append(buildCreateOption(model.createName, createFromInput));
    for (const rowModel of model.rows) menu.append(buildTagOption(rowModel, toggleTag));
    if (!model.createName && !model.rows.length) menu.append(buildEmptyState());
    keyboardNav.reset();
    keyboardNav.sync();
  };

  // The tag order is worked out once per render: by usage it counts every entry.
  const render = () => {
    const orderedTags = getOrderedTags();
    renderPills(orderedTags);
    if (isOpen) renderMenu(orderedTags);
  };

  function changeIds(nextIds) {
    pendingSaves += 1;
    const pending = commit(nextIds);
    render();
    void pending.then((saved) => {
      pendingSaves -= 1;
      // A failed save rolled the ids back; show what the entry holds now.
      if (!saved) render();
    });
  }

  function toggleTag(tag, checked, evt) {
    const ids = getIds();
    // A keyboard press on a <button> reports `detail === 0`; keep that user's
    // place in the list once it is rebuilt.
    const optionIndex =
      evt?.detail === 0 ? [...menu.querySelectorAll('button')].indexOf(evt.currentTarget) : -1;
    changeIds(checked ? ids.filter((id) => id !== tag.id) : [...ids, tag.id]);
    if (optionIndex >= 0) menu.querySelectorAll('button')[optionIndex]?.focus();
  }

  function createFromInput() {
    const rawName = input.value;
    pendingSaves += 1;
    const pending = createAndAttachEntryTag({
      settings,
      rawName,
      currentIds: getIds(),
      commit,
    });
    input.value = '';
    render();
    input.focus();
    void pending.then((result) => {
      pendingSaves -= 1;
      if (!result.ok || !result.saved) render();
    });
  }

  const onOutsidePointerDown = (evt) => {
    if (!row.contains(evt.target)) close();
  };

  function open() {
    if (!isOpen) {
      closeOpenMultiselectDropdownMenus(menu);
      isOpen = true;
      menu.classList.add(ACTIVE_STATE_CLASS);
      input.setAttribute('aria-expanded', 'true');
      document.addEventListener('pointerdown', onOutsidePointerDown, true);
    }
    renderMenu(getOrderedTags());
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    menu.classList.remove(ACTIVE_STATE_CLASS);
    input.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutsidePointerDown, true);
  }
  menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER] = close;

  input.addEventListener('focus', open);
  input.addEventListener('input', open);
  input.addEventListener('keydown', (evt) => {
    if (evt.key === 'Escape') {
      if (!isOpen) return;
      evt.preventDefault();
      evt.stopPropagation();
      close();
      return;
    }
    if (evt.key === 'Enter') {
      evt.preventDefault();
      evt.stopPropagation();
      // Enter creates; a name that already exists is picked from the list by hand.
      const model = buildEntryTagPickerModel({
        orderedTags: getOrderedTags(),
        selectedIds: getIds(),
        query: input.value,
      });
      if (model.createName) createFromInput();
      return;
    }
    if (!isOpen && evt.key === 'ArrowDown') open();
    keyboardNav.handleKeydown(evt);
  });
  menu.addEventListener('keydown', (evt) => {
    if (evt.key !== 'Escape') return;
    evt.preventDefault();
    evt.stopPropagation();
    close();
    input.focus();
  });
  // Keeps focus in the field while an option is clicked, so the menu stays open
  // and typing carries on; the click itself still fires.
  menu.addEventListener('mousedown', (evt) => evt.preventDefault());
  box.addEventListener('mousedown', (evt) => {
    if (evt.target !== box) return;
    evt.preventDefault();
    input.focus();
  });
  row.addEventListener('focusout', (evt) => {
    if (!row.contains(evt.relatedTarget)) close();
  });

  renderPills(getOrderedTags());

  return {
    row,
    close,
    render,
    /** Re-reads the ids from an entry the host just reported, unless a save of ours is in flight. */
    syncFromStored(storedEntry) {
      if (pendingSaves > 0) return;
      const storedIds = readEntryTagIds(storedEntry);
      if (sameEntryTagIds(storedIds, getIds())) return;
      writeEntryTagIds(editorEntry, storedIds);
      render();
    },
  };
}

const getEventBus = () => {
  const context = globalThis.SillyTavern?.getContext?.();
  return {
    eventSource: context?.eventSource ?? null,
    eventTypes: context?.eventTypes ?? context?.event_types ?? null,
  };
};

/**
 * Owns the tag row of whichever entry the editor has open, and follows outside
 * edits to it: when the host reports the open entry's book changed
 * (`WORLDINFO_UPDATED`), the row re-reads the entry's tags from what was saved.
 * `refresh` redraws it after the tag definitions themselves changed.
 */
export function createEntryTagsRowController({
  cache,
  buildSavePayload,
  enqueueBookSave,
  saveWorldInfo,
}) {
  let current = null;
  const { eventSource, eventTypes } = getEventBus();
  const updatedEvent = eventTypes?.WORLDINFO_UPDATED;

  const onWorldInfoUpdated = (bookName, data) => {
    if (!current || !current.row.isConnected || current.bookName !== bookName) return;
    const storedEntry = data?.entries?.[current.uid];
    if (storedEntry) current.syncFromStored(storedEntry);
  };
  if (updatedEvent) eventSource?.on?.(updatedEvent, onWorldInfoUpdated);

  /**
   * Inserts the row beneath the host's character/trigger filter row of a freshly
   * rendered entry editor.
   */
  const mount = ({ entryEditorDom, bookName, uid, editorPayload, editorEntry }) => {
    current?.close();
    current = null;
    const filterRow = entryEditorDom
      ?.querySelector?.('select[name="characterFilter"]')
      ?.closest('.world_entry_edit > *');
    if (!filterRow) {
      console.warn(LOG_PREFIX, 'Entry tags row skipped: the host filter row was not found.');
      return;
    }
    const settings = Settings.instance;
    const commit = createEntryTagsCommit({
      bookName,
      uid,
      cache,
      editorPayload,
      editorEntry,
      buildSavePayload,
      enqueueBookSave,
      saveWorldInfo,
      onFailure: (error) => {
        console.error(LOG_PREFIX, 'Entry tags save failed for', bookName, uid, error);
        toastr.error(ENTRY_TAGS_SAVE_FAILED_MESSAGE);
      },
    });
    const row = buildEntryTagsRow({
      getOrderedTags: () => getOrderedEntryTags(settings, () => iterateCacheEntries(cache)),
      editorEntry,
      commit,
      settings,
    });
    filterRow.after(row.row);
    current = { ...row, bookName, uid };
  };

  /** Redraws the open row from the current tag definitions (renamed, recoloured, deleted…). */
  const refresh = () => {
    if (current?.row.isConnected) current.render();
  };

  const cleanup = () => {
    current?.close();
    current = null;
    if (updatedEvent) eventSource?.removeListener?.(updatedEvent, onWorldInfoUpdated);
  };

  return { mount, refresh, cleanup };
}
