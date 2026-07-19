import { setTooltip } from '../entry-manager.utils.js';
import { ENTRY_MANAGER_RECURSION_OPTIONS } from '../../shared/constants.js';
import { maybeYieldToEventLoop } from '../../shared/utils.js';

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

export async function saveUpdatedBooks(books, saveWorldInfo, buildSavePayload) {
  for (const bookName of books) {
    await saveWorldInfo(bookName, buildSavePayload(bookName), true);
  }
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
      const rowInput = tr.querySelector(`[name="${rowInputName}"]`);
      if (rowInput) rowInput.value = String(parsedValue);
      await maybeYieldToEventLoop(i, BULK_APPLY_BATCH_SIZE);
    }
    try {
      await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
      applyButton.classList.remove(APPLY_DIRTY_CLASS);
    } catch (error) {
      console.error('Failed to save bulk non-negative integer field.', error);
      toastr.error('Failed to save bulk changes.');
    }
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
