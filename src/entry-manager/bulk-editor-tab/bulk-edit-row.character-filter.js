// Bulk Editor row for the "Filter to Characters or Tags" column (ticket 06).
//
// Three modes and no others (R16, D7 — "add to existing" is an explicit
// non-goal):
//
// | Mode            | Effect on each selected entry                            |
// |-----------------|----------------------------------------------------------|
// | Replace         | names, tags AND the exclude mode are overwritten (D8)     |
// | Remove specific | the picked values are stripped; exclude untouched         |
// | Clear all       | the `characterFilter` key is deleted outright             |
//
// The picker is the same shared dropdown, the same option rows and the same
// stale marking the column's inline editor uses — reused from
// `table.body.character-filter.js` rather than copied, so the two can never
// drift apart. Writes go through the existing bulk save serializer (R18); the
// per-entry write semantics come from `entry-manager.utils.js`, so the
// delete-when-empty rule (R17) is the same code the inline editor obeys (R12).

import {
  setTooltip,
  buildCharacterFilterOptions,
  collectReferencedCharacterFilterValues,
  readCharacterFilterSelection,
  computeCharacterFilterValue,
  setCharacterFilterValue,
  CHARACTER_FILTER_INCLUDE_LABEL,
  CHARACTER_FILTER_EXCLUDE_LABEL,
  CHARACTER_FILTER_EMPTY_STATE,
} from '../entry-manager.utils.js';
import {
  buildCharacterFilterMenuShell,
  buildCharacterFilterOptionRow,
  refreshCharacterFilterCell,
  CHARACTER_FILTER_SEARCH_TEXT_DATASET_KEY,
} from '../table/table.body.character-filter.js';
import {
  wireMultiselectDropdown,
  MULTISELECT_DROPDOWN_HIDDEN_CLASS,
  MULTISELECT_DROPDOWN_OPTION_SELECTOR,
} from '../../shared/multiselect-dropdown.js';
import { maybeYieldToEventLoop } from '../../shared/utils.js';
import { mirrorEntryFieldsToOriginalData } from '../../shared/original-data.js';
import {
  BULK_APPLY_BATCH_SIZE,
  APPLY_DIRTY_CLASS,
  createLabeledBulkContainer,
  createApplyButton,
  getSafeTbodyRows,
  getBulkTargets,
  saveUpdatedBooks,
  withApplyButtonLock,
} from './bulk-edit-row.helpers.js';

const MODE_REPLACE = 'replace';
const MODE_REMOVE = 'remove';
const MODE_CLEAR = 'clear';

const STORAGE_KEY_BULK_CHARACTER_FILTER_MODE = 'stwid--bulk-character-filter-mode';

/** R16 / D7 — the three modes offered, in the order the ticket lists them. */
export const BULK_CHARACTER_FILTER_MODES = Object.freeze([
  Object.freeze({
    value: MODE_REPLACE,
    label: 'Replace',
    hint: 'Overwrite the characters, the tags and the include/exclude mode of every selected entry with what you pick. The selected entries end up identical.',
  }),
  Object.freeze({
    value: MODE_REMOVE,
    label: 'Remove specific',
    hint: 'Strip the picked characters and tags from every selected entry. Everything else the entry had — including its include/exclude mode — is kept.',
  }),
  Object.freeze({
    value: MODE_CLEAR,
    label: 'Clear all',
    hint: 'Delete the character/tag filter from every selected entry outright. Asks for confirmation first.',
  }),
]);

// Same wording as the cell's own options, except that this picker acts on many
// entries at once — so a stale value is "strip it from every selected entry",
// not "remove it from this entry".
const optionTooltip = (option) =>
  option.stale
    ? `Stale value --- "${option.value}" refers to something that no longer exists. ` +
      'Tick it to strip it from every selected entry.'
    : option.kind === 'character'
      ? `Avatar key: ${option.value}`
      : `Tag ID: ${option.value}`;

const ROW_HINT =
  'Set the character/tag filter across all selected entries. ' +
  'Replace overwrites everything including the include/exclude mode; ' +
  'Remove specific strips only what you pick; ' +
  'Clear all deletes the filter entirely and confirms first. ' +
  'Replace with nothing picked and Exclude off does the same thing as Clear all.';

/* -------------------------------------------------------------------------- */
/* Pure logic                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The value one entry must be stored as, for one bulk mode.
 *
 * @param {object} args
 * @param {object} args.entry The lorebook entry, read only — nothing is mutated here.
 * @param {string} args.mode One of `BULK_CHARACTER_FILTER_MODES`.
 * @param {{isExclude?: boolean, names?: Array, tags?: Array}} args.selection What the user picked.
 * @returns {object|undefined} the value to store, or `undefined` meaning "delete the key" (R17).
 */
export const computeBulkCharacterFilterValue = ({ entry, mode, selection = {} }) => {
  // Clear all is unconditional: the key goes, whatever the entry held (R16).
  if (mode === MODE_CLEAR) return undefined;

  // Replace overwrites names, tags *and* the exclude mode, so every selected
  // entry ends up with the identical value (D8).
  if (mode === MODE_REPLACE) return computeCharacterFilterValue(selection);

  if (mode === MODE_REMOVE) {
    // `readCharacterFilterSelection` coerces with String(), so a legacy numeric
    // tag ID lines up with the string IDs the picker offers (R3b/E14).
    const current = readCharacterFilterSelection(entry);
    const removedNames = new Set((selection.names ?? []).map(String));
    const removedTags = new Set((selection.tags ?? []).map(String));
    return computeCharacterFilterValue({
      // Untouched on purpose: only Replace may change the mode (R16).
      isExclude: current.isExclude,
      names: current.names.filter((name) => !removedNames.has(name)),
      tags: current.tags.filter((tag) => !removedTags.has(tag)),
    });
  }

  // Every other return value above is a write, so an unrecognised mode must not
  // fall through to one of them.
  throw new Error(`[STWID] Unknown bulk character-filter mode: ${String(mode)}`);
};

// Moved to `entry-manager.utils.js` in ticket 08, which needed the same fold for
// the Entry Manager's character/tag filter picker (E6). Re-exported here so this
// row's own API — and every caller and test naming it — is unchanged.
// This is what makes stale values pickable in Remove specific (E7): a character
// deleted from the roster appears in no host list, but it is still stored in
// these entries and must be sweepable out of all of them in one action.
export { collectReferencedCharacterFilterValues };

/**
 * The pickable option list for one mode.
 *
 * Built on the column's own `buildCharacterFilterOptions`, so display-name
 * resolution, collision disambiguation and stale marking are the ones the cell
 * already uses. `selected` is then overwritten from the user's pending picks —
 * the options are a shopping list here, not a view of any one entry.
 *
 * @param {object} args
 * @param {string} args.mode
 * @param {Array<object>} args.entries The selected entries (Remove specific only).
 * @param {{names?: Array, tags?: Array}} args.selection What the user has picked so far.
 * @param {{characters?: Array, tags?: Array}} [args.hostLists] Test seam.
 * @returns {Array<object>}
 */
export const buildBulkCharacterFilterOptionList = ({
  mode,
  entries = [],
  selection = {},
  hostLists,
}) => {
  // Clear all takes no values, so it offers none.
  if (mode === MODE_CLEAR) return [];

  // `buildCharacterFilterOptions` appends the stored values no host list knows
  // about — which is exactly E7's stale values when the "entry" it reads is the
  // union of the selected ones. Replace passes no stored values, so it offers
  // the live rosters only: a stale value must never be writable into an entry.
  const referenced =
    mode === MODE_REMOVE
      ? collectReferencedCharacterFilterValues(entries)
      : { names: [], tags: [] };
  const unionEntry = { characterFilter: { isExclude: false, ...referenced } };

  const pickedNames = new Set((selection.names ?? []).map(String));
  const pickedTags = new Set((selection.tags ?? []).map(String));
  return buildCharacterFilterOptions(unionEntry, hostLists).map((option) => ({
    ...option,
    selected: (option.kind === 'character' ? pickedNames : pickedTags).has(option.value),
  }));
};

const sameValueList = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

/**
 * Whether storing `next` would leave the entry exactly as it already is.
 *
 * Values are compared the way the rest of this feature reads them — coerced with
 * `String()` (R3b/E14) — so an entry holding a legacy numeric tag ID counts as
 * unchanged and is not rewritten behind the user's back. Order matters: the
 * stored order is the order the user picked, and reordering it would be a write.
 *
 * @param {unknown} current The entry's stored `characterFilter`.
 * @param {object|undefined} next Result of `computeBulkCharacterFilterValue`.
 * @returns {boolean}
 */
export const isSameCharacterFilterValue = (current, next) => {
  const isAbsent = current === undefined;
  if (next === undefined) return isAbsent;
  if (isAbsent) return false;
  // A malformed stored value is not equal to anything: replacing it is a real
  // change, and the host normalises the same shape on load (§1.1).
  if (typeof current !== 'object' || current === null || Array.isArray(current)) return false;

  const stored = readCharacterFilterSelection({ characterFilter: current });
  return (
    stored.isExclude === next.isExclude &&
    sameValueList(stored.names, next.names) &&
    sameValueList(stored.tags, next.tags)
  );
};

/**
 * R18c / D16 — the Clear all confirmation body, naming the affected entry count
 * at every selection size, including one.
 *
 * @param {number} count
 * @returns {string}
 */
export const buildClearAllConfirmMessage = (count) =>
  `This deletes the character/tag filter from ${count} selected ${
    count === 1 ? 'entry' : 'entries'
  }, including any stale value stored in ${count === 1 ? 'it' : 'them'}. It cannot be undone.`;

/* -------------------------------------------------------------------------- */
/* Row                                                                        */
/* -------------------------------------------------------------------------- */

const readStoredMode = () => {
  const stored = localStorage.getItem(STORAGE_KEY_BULK_CHARACTER_FILTER_MODE);
  return BULK_CHARACTER_FILTER_MODES.some((mode) => mode.value === stored) ? stored : MODE_REPLACE;
};

function buildModeSelect() {
  const modeSelect = document.createElement('select');
  modeSelect.classList.add('stwid--input', 'text_pole', 'stwid--sort-select');
  setTooltip(modeSelect, 'What applying this row does to every selected entry');
  for (const mode of BULK_CHARACTER_FILTER_MODES) {
    const option = document.createElement('option');
    option.value = mode.value;
    option.textContent = mode.label;
    setTooltip(option, mode.hint);
    modeSelect.append(option);
  }
  modeSelect.value = readStoredMode();
  modeSelect.addEventListener('change', () => {
    localStorage.setItem(STORAGE_KEY_BULK_CHARACTER_FILTER_MODE, modeSelect.value);
  });
  return modeSelect;
}

function buildPickerTrigger() {
  const trigger = document.createElement('div');
  trigger.classList.add('menu_button', 'stwid--multiselect-dropdown__button', 'interactable');
  const label = document.createElement('span');
  trigger.append(label);
  const caret = document.createElement('i');
  caret.classList.add('fa-solid', 'fa-fw', 'fa-caret-down');
  trigger.append(caret);
  return { trigger, label };
}

/**
 * R18c — confirms Clear all through the host's own popup, the pattern
 * `book-folders.folder-actions.js` already uses. Escape, Cancel and a popup we
 * cannot reach all answer "no", so nothing is written.
 *
 * @param {number} count
 * @returns {Promise<boolean>}
 */
async function confirmClearAll(count) {
  const context = globalThis.SillyTavern?.getContext?.() ?? {};
  const { Popup, POPUP_RESULT } = context;
  if (typeof Popup?.show?.confirm !== 'function' || !POPUP_RESULT) {
    // Fail safe: this is the one mode that destroys values the user cannot
    // reconstruct, so an unconfirmable Clear all does not happen at all.
    console.warn('[STWID] Popup is unavailable; aborting the bulk Clear all.');
    toastr.error('Could not show the confirmation dialog. Nothing was cleared.');
    return false;
  }
  const result = await Popup.show.confirm(
    'Clear the character/tag filter?',
    buildClearAllConfirmMessage(count),
    { okButton: 'Clear filter', cancelButton: 'Cancel' },
  );
  return result === POPUP_RESULT.AFFIRMATIVE;
}

/**
 * Builds the Bulk Editor's character/tag filter row (R15).
 *
 * @param {object} args Same shape every other bulk section takes.
 * @returns {HTMLElement}
 */
export function buildBulkCharacterFilterSection({
  dom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyRegistry,
}) {
  const container = createLabeledBulkContainer('characterFilter', 'Char/Tag Filter', ROW_HINT);

  // Deliberately not persisted, unlike the mode: the picks name characters and
  // tags that may not exist in the next session, and Replace would then write a
  // remembered stale value into every selected entry on one click.
  let selection = { isExclude: false, names: [], tags: [] };

  const modeSelect = buildModeSelect();
  const { trigger, label: triggerLabel } = buildPickerTrigger();

  const pickerWrap = document.createElement('div');
  pickerWrap.classList.add('stwid--multiselect-dropdown__wrap');

  const { menu, header, list, heading, excludeRow, excludeInput } = buildCharacterFilterMenuShell({
    excludeTooltip:
      'Replace only: exclude the picked characters and tags instead of filtering to them. ' +
      'The selected entries all end up with this same mode.',
  });

  const isPickerMode = () => modeSelect.value !== MODE_CLEAR;

  const pickedCount = () => selection.names.length + selection.tags.length;

  const refreshTriggerLabel = () => {
    const count = pickedCount();
    triggerLabel.textContent = count === 0 ? 'Select' : `${count} picked`;
    setTooltip(
      trigger,
      modeSelect.value === MODE_REMOVE
        ? 'Pick the characters and tags to strip from every selected entry'
        : 'Pick the characters and tags every selected entry will be filtered to',
    );
  };

  const refreshHeading = () => {
    if (modeSelect.value === MODE_REMOVE) {
      heading.textContent = 'Remove from the filter';
      return;
    }
    heading.textContent = selection.isExclude
      ? CHARACTER_FILTER_EXCLUDE_LABEL
      : CHARACTER_FILTER_INCLUDE_LABEL;
  };

  // The exclude mode is only meaningful for Replace: Remove leaves it exactly
  // as each entry had it, so offering the toggle there would be a lie.
  const refreshExcludeVisibility = () => {
    excludeRow.classList.toggle(
      MULTISELECT_DROPDOWN_HIDDEN_CLASS,
      modeSelect.value !== MODE_REPLACE,
    );
  };

  const refreshPickerState = () => {
    const usesPicker = isPickerMode();
    // The wrap carries both the dimming and the pointer-events block; the
    // trigger only has to report the state to assistive tech.
    pickerWrap.classList.toggle('stwid--state-disabled', !usesPicker);
    trigger.setAttribute('aria-disabled', usesPicker ? 'false' : 'true');
    trigger.tabIndex = usesPicker ? 0 : -1;
    refreshExcludeVisibility();
    refreshHeading();
    refreshTriggerLabel();
  };

  /** The entries the row would write to right now. Silent: opening a dropdown
   *  is not the user asking for anything, so an unbuilt table is not a warning. */
  const getSelectedEntries = () => {
    const rows = getSafeTbodyRows(dom, { warn: false });
    if (!rows) return [];
    return getBulkTargets(rows, cache, isEntryManagerRowSelected).map((target) => target.entryData);
  };

  const onToggleOption = (option, isChecked) => {
    const bucket = option.kind === 'character' ? 'names' : 'tags';
    if (isChecked) {
      if (!selection[bucket].includes(option.value)) selection[bucket].push(option.value);
    } else {
      selection[bucket] = selection[bucket].filter((value) => value !== option.value);
    }
    refreshTriggerLabel();
    applyButton.classList.add(APPLY_DIRTY_CLASS);
  };

  // Rebuilt on every open: the roster, the tags and — for Remove specific — the
  // stale values the *currently selected* entries reference all change between
  // one open and the next.
  const refreshMenu = () => {
    excludeInput.checked = selection.isExclude;
    for (const option of list.querySelectorAll(MULTISELECT_DROPDOWN_OPTION_SELECTOR)) {
      option.remove();
    }
    const options = buildBulkCharacterFilterOptionList({
      mode: modeSelect.value,
      entries: modeSelect.value === MODE_REMOVE ? getSelectedEntries() : [],
      selection,
    });
    const fragment = document.createDocumentFragment();
    for (const option of options) {
      fragment.append(buildCharacterFilterOptionRow(option, onToggleOption, optionTooltip));
    }
    list.append(fragment);
    refreshHeading();
  };

  wireMultiselectDropdown(menu, trigger, pickerWrap, {
    listContainer: list,
    // Viewport-positioned, like the column's own picker: the bulk row is inside
    // the Entry Manager's scroll containers, and this mode is also what caps the
    // menu's height so a 100-character roster still fits on screen.
    inCell: true,
    onBeforeOpen: refreshMenu,
    getExtraTabStops: () =>
      modeSelect.value === MODE_REPLACE &&
      !excludeRow.classList.contains(MULTISELECT_DROPDOWN_HIDDEN_CLASS)
        ? [excludeInput]
        : [],
    emptyStateText: CHARACTER_FILTER_EMPTY_STATE,
    search: {
      placeholder: 'Search characters and tags…',
      ariaLabel: 'Search characters and tags',
      noResultsText: 'No matching character or tag.',
      container: header,
      getOptionSearchText: (option) =>
        option.dataset[CHARACTER_FILTER_SEARCH_TEXT_DATASET_KEY] ?? '',
    },
  });

  excludeInput.addEventListener('change', () => {
    selection.isExclude = excludeInput.checked;
    refreshHeading();
    applyButton.classList.add(APPLY_DIRTY_CLASS);
  });

  modeSelect.addEventListener('change', () => {
    // Picks do not survive a mode change: a stale value is pickable in Remove
    // specific and must never carry over into a Replace, which would write it
    // into every selected entry.
    selection = { isExclude: false, names: [], tags: [] };
    excludeInput.checked = false;
    refreshPickerState();
    applyButton.classList.add(APPLY_DIRTY_CLASS);
  });

  const runApply = async () => {
    await withApplyButtonLock(applyButton, async () => {
      const mode = modeSelect.value;
      if (mode === MODE_REMOVE && pickedCount() === 0) {
        toastr.warning('Pick at least one character or tag to remove.');
        return;
      }

      const rows = getSafeTbodyRows(dom);
      if (!rows) return;
      const targets = getBulkTargets(rows, cache, isEntryManagerRowSelected);
      if (targets.length === 0) {
        toastr.warning('No entries selected.');
        return;
      }

      // R18c — Clear all confirms at every selection size; Replace and Remove
      // never do. Cancelling or pressing Escape writes nothing at all.
      if (mode === MODE_CLEAR && !(await confirmClearAll(targets.length))) return;

      const books = new Set();
      for (let i = 0; i < targets.length; i++) {
        const { bookName, uid, entryData } = targets[i];
        const next = computeBulkCharacterFilterValue({ entry: entryData, mode, selection });
        // An entry the mode does not actually change is left alone, and its book
        // is not marked for saving. Without this, a Remove that matches nothing
        // would rewrite every selected book — and normalise values on the way
        // through, turning a legacy numeric tag ID into a string in entries the
        // user never touched.
        if (!isSameCharacterFilterValue(entryData.characterFilter, next)) {
          books.add(bookName);
          setCharacterFilterValue(entryData, next);
          // R25b — a deleted key mirrors as `undefined`, exactly as the host does.
          mirrorEntryFieldsToOriginalData(cache[bookName], entryData, ['characterFilter']);
          // The cell owns its own rendering; ask it to re-read rather than reach
          // into its DOM from here.
          refreshCharacterFilterCell(bookName, uid, entryData);
        }
        await maybeYieldToEventLoop(i, BULK_APPLY_BATCH_SIZE);
      }

      // R18 — the existing serializer, which reports and reloads its own failed
      // books (ticket 02); it does not throw.
      const { failedBooks } = await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
      // Leave the row marked dirty when a book did not save, so the user can retry.
      if (failedBooks.length === 0) applyButton.classList.remove(APPLY_DIRTY_CLASS);
    });
  };

  const applyButton = createApplyButton(
    'Apply this character/tag filter change to all selected entries',
    runApply,
    applyRegistry,
  );

  pickerWrap.append(trigger, menu);
  container.append(modeSelect, pickerWrap, applyButton);
  refreshPickerState();
  return container;
}
