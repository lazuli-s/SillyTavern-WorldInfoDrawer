import { setTooltip } from '../entry-manager.utils.js';
import { ENTRY_MANAGER_RECURSION_OPTIONS } from '../../shared/constants.js';
import { maybeYieldToEventLoop } from '../../shared/utils.js';
import { mirrorEntryFieldsToOriginalData } from '../../shared/original-data.js';
import { reloadBooksFromDisk } from '../../shared/book-reload.js';

export const BULK_APPLY_BATCH_SIZE = 200;
export const APPLY_DIRTY_CLASS = 'stwid--apply-dirty';
export const NON_NEGATIVE_PLACEHOLDER = '0+';

export function createLabeledBulkContainer(fieldKey, labelText, hintText) {
  const container = document.createElement('div');
  container.classList.add('stwid--field-group');
  container.dataset.field = fieldKey;
  const label = document.createElement('span');
  label.classList.add('stwid--bulk-edit-label');
  label.textContent = labelText;
  const hint = document.createElement('i');
  hint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulk-edit-label-hint');
  setTooltip(hint, hintText);
  label.append(hint);
  container.append(label);
  return container;
}

export function createApplyButton(
  tooltip,
  runApply,
  applyRegistry,
  { registerInApplyAll = true } = {},
) {
  const applyButtonEl = document.createElement('div');
  applyButtonEl.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
  setTooltip(applyButtonEl, tooltip);
  applyButtonEl.addEventListener('click', () => runApply());
  if (registerInApplyAll) {
    applyRegistry.push({
      isDirty: () => applyButtonEl.classList.contains(APPLY_DIRTY_CLASS),
      runApply,
    });
  }
  return applyButtonEl;
}

export function buildPersistedNumberInput({
  labelText,
  tooltipText,
  storageKey,
  defaultValue,
  minValue = '1',
  maxValue,
  onDirty,
}) {
  const label = document.createElement('label');
  label.classList.add('stwid--input-wrap');
  setTooltip(label, tooltipText);
  label.append(`${labelText}: `);

  const inputEl = document.createElement('input');
  inputEl.classList.add('stwid--cell-input', 'text_pole');
  inputEl.type = 'number';
  inputEl.min = minValue;
  inputEl.max = maxValue;
  inputEl.value = localStorage.getItem(storageKey) ?? defaultValue;
  inputEl.addEventListener('change', () => {
    localStorage.setItem(storageKey, inputEl.value);
    if (typeof onDirty === 'function') {
      onDirty();
    }
  });

  label.append(inputEl);
  return { label, inputEl };
}

export function buildDirectionRadio(
  groupName,
  value,
  labelText,
  hint,
  directionStorageKey,
  applyButton,
) {
  const directionRow = document.createElement('label');
  directionRow.classList.add('stwid--input-wrap');
  setTooltip(directionRow, hint);

  const radioInput = document.createElement('input');
  radioInput.type = 'radio';
  radioInput.name = groupName;
  radioInput.value = value;
  radioInput.checked = (localStorage.getItem(directionStorageKey) ?? 'down') === value;
  radioInput.addEventListener('change', () => {
    if (!radioInput.checked) return;
    localStorage.setItem(directionStorageKey, value);
  });
  radioInput.addEventListener('change', () => applyButton.classList.add(APPLY_DIRTY_CLASS));
  directionRow.append(radioInput);
  directionRow.append(labelText);
  return { directionRow, radioInput };
}

export function buildRecursionCheckboxRow(value, label, recursionCheckboxes) {
  const recursionRow = document.createElement('label');
  recursionRow.classList.add('stwid--option-check-row');

  const recursionCheckbox = document.createElement('input');
  recursionCheckbox.type = 'checkbox';
  recursionCheckbox.classList.add('checkbox');
  setTooltip(recursionCheckbox, label);
  recursionCheckboxes.set(value, recursionCheckbox);
  recursionRow.append(recursionCheckbox);
  recursionRow.append(label);
  return recursionRow;
}

export function getSafeTbodyRows(entryManagerDom) {
  const tbody = entryManagerDom.order?.tbody;
  if (!(tbody instanceof HTMLElement)) {
    toastr.warning('Entry Manager table is not ready yet.');
    return null;
  }
  return [...tbody.children].filter((child) => child instanceof HTMLElement);
}

export function getBulkTargets(rows, cache, isEntryManagerRowSelected, { reverse = false } = {}) {
  const orderedRows = reverse ? [...rows].reverse() : rows;
  const targets = [];
  let skippedInvalidRow = false;
  for (const rowEl of orderedRows) {
    if (rowEl.classList.contains('stwid--state-filtered')) continue;
    if (!isEntryManagerRowSelected(rowEl)) continue;
    const bookName = rowEl.getAttribute('data-book');
    const entryUid = rowEl.getAttribute('data-uid');
    if (!bookName || entryUid === null) {
      skippedInvalidRow = true;
      continue;
    }
    const entryData = cache?.[bookName]?.entries?.[entryUid];
    if (!entryData) {
      skippedInvalidRow = true;
      continue;
    }
    targets.push({ tr: rowEl, bookName, uid: entryUid, entryData });
  }
  if (skippedInvalidRow) {
    console.warn('STWID: skipped one or more bulk-edit rows due to missing book/entry data.');
  }
  return targets;
}

/**
 * Writes every book a bulk edit touched, one at a time.
 *
 * A book that fails to save does not stop the others: all of them are
 * attempted, the failures are named to the user through `toastr`, and each
 * failed book is reloaded from disk so the table stops showing a change that
 * never reached it. Books that saved keep their changes — there is no rollback.
 *
 * KNOWN LIMIT (host behaviour, read 15-08-2026 in
 * vendor/SillyTavern/public/scripts/world-info.js `_save`): the host posts to
 * /api/worldinfo/edit and never checks `response.ok`, so `saveWorldInfo` only
 * rejects when the request itself fails (server unreachable, connection lost,
 * request aborted). A save the server *answers* with 4xx/5xx resolves as if it
 * had worked, and nothing below can see it. Catching that class of failure
 * needs a decision this ticket does not own — re-reading each book after a save
 * to confirm it, or a host change — so it is recorded here rather than papered
 * over: a bulk save can still report success on a server-rejected write.
 *
 * @param {Iterable<string>} books - Book names to save.
 * @param {Function} saveWorldInfo - The host's `saveWorldInfo`.
 * @param {Function} buildSavePayload - Builds one book's save payload from the cache.
 * @param {object} [deps] - Test seam; production callers pass nothing.
 * @param {Function} [deps.reloadBooks] - Defaults to `reloadBooksFromDisk`.
 * @returns {Promise<{failedBooks: string[]}>}
 */
export async function saveUpdatedBooks(
  books,
  saveWorldInfo,
  buildSavePayload,
  { reloadBooks = reloadBooksFromDisk } = {},
) {
  const failedBooks = [];
  for (const bookName of books) {
    try {
      await saveWorldInfo(bookName, buildSavePayload(bookName), true);
    } catch (error) {
      console.error(`STWID: failed to save book "${bookName}".`, error);
      failedBooks.push(bookName);
    }
  }

  if (failedBooks.length > 0) {
    // Reload first, then report what actually happened. Announcing "reloaded"
    // before the reload would state the table is showing the truth even when
    // the reload itself failed and it is still showing the rejected change.
    let reloadedBooks = [];
    try {
      reloadedBooks = (await reloadBooks(failedBooks)) ?? [];
    } catch (error) {
      console.error('STWID: failed to reload books after a failed bulk save.', error);
    }

    const bookList = failedBooks.map((bookName) => `"${bookName}"`).join(', ');
    const allReloaded = reloadedBooks.length === failedBooks.length;
    toastr.error(
      allReloaded
        ? `Failed to save ${bookList}. Reloaded from disk — changes to ${
            failedBooks.length === 1 ? 'that book' : 'those books'
          } were lost.`
        : `Failed to save ${bookList}, and could not reload ${
            failedBooks.length === 1 ? 'it' : 'them'
          } from disk. The table may still show changes that were never saved.`,
    );
  }

  return { failedBooks };
}

function setApplyButtonBusy(button, isBusy) {
  button.dataset.stwidBusy = isBusy ? '1' : '0';
  button.style.pointerEvents = isBusy ? 'none' : '';
  button.classList.toggle('stwid--state-disabled', isBusy);
  button.setAttribute('aria-disabled', isBusy ? 'true' : 'false');
}

export async function withApplyButtonLock(button, callback) {
  if (button.dataset.stwidBusy === '1') return;
  setApplyButtonBusy(button, true);
  try {
    await callback();
  } finally {
    setApplyButtonBusy(button, false);
  }
}

export function createPersistedBulkNumberInput({
  container,
  storageKey,
  min,
  max,
  placeholder,
  tooltip,
}) {
  const input = document.createElement('input');
  input.classList.add('stwid--cell-input', 'text_pole');
  input.type = 'number';
  input.min = min;
  if (max !== undefined) input.max = max;
  input.placeholder = placeholder ?? '';
  setTooltip(input, tooltip);

  const storedValue = localStorage.getItem(storageKey);
  if (storedValue !== null) input.value = storedValue;

  input.addEventListener('change', () => {
    localStorage.setItem(storageKey, input.value);
  });
  container.append(input);
  return input;
}

export async function runApplyNonNegativeIntegerField({
  input,
  entryField,
  rowInputName,
  emptyValueWarning,
  invalidValueWarning,
  dom: entryManagerDom,
  cache,
  isEntryManagerRowSelected,
  saveWorldInfo,
  buildSavePayload,
  applyButton,
}) {
  const rawValue = input.value.trim();
  if (rawValue === '') {
    toastr.warning(emptyValueWarning);
    return;
  }

  const parsedValue = parseInt(rawValue, 10);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    toastr.warning(invalidValueWarning);
    return;
  }

  await withApplyButtonLock(applyButton, async () => {
    const rows = getSafeTbodyRows(entryManagerDom);
    if (!rows) return;

    const targets = getBulkTargets(rows, cache, isEntryManagerRowSelected);
    const books = new Set();
    for (let i = 0; i < targets.length; i++) {
      const { tr, bookName, entryData } = targets[i];
      books.add(bookName);
      entryData[entryField] = parsedValue;
      mirrorEntryFieldsToOriginalData(cache[bookName], entryData, [entryField]);
      const rowInput = tr.querySelector(`[name="${rowInputName}"]`);
      if (rowInput) rowInput.value = String(parsedValue);
      await maybeYieldToEventLoop(i, BULK_APPLY_BATCH_SIZE);
    }
    // saveUpdatedBooks reports and reloads its own failures; it does not throw.
    const { failedBooks } = await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
    // Leave the row marked dirty when a book did not save, so the user can retry.
    if (failedBooks.length === 0) applyButton.classList.remove(APPLY_DIRTY_CLASS);
  });
}

export function applyRecursionFlagsToRowInputs(domInputs, entryData, recursionCheckboxes) {
  let recursionInputIndex = 0;
  for (const { value } of ENTRY_MANAGER_RECURSION_OPTIONS) {
    const checked = recursionCheckboxes.get(value).checked;
    entryData[value] = checked;
    if (domInputs[recursionInputIndex]) domInputs[recursionInputIndex].checked = checked;
    recursionInputIndex++;
  }
}

/** The camelCase entry fields `applyRecursionFlagsToRowInputs` writes. */
export const RECURSION_ENTRY_FIELDS = ENTRY_MANAGER_RECURSION_OPTIONS.map((o) => o.value);
