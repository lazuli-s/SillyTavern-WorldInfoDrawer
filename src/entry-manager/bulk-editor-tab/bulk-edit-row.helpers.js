import { setTooltip } from '../utils.js';
import { ENTRY_MANAGER_RECURSION_OPTIONS } from '../../shared/constants.js';

export const BULK_APPLY_BATCH_SIZE = 200;
export const APPLY_DIRTY_CLASS = 'stwid--applyDirty';
export const NON_NEGATIVE_PLACEHOLDER = '0+';

export function createLabeledBulkContainer(fieldKey, labelText, hintText) {
    const container = document.createElement('div');
    container.classList.add('stwid--thinContainer');
    container.dataset.field = fieldKey;
    const label = document.createElement('span');
    label.classList.add('stwid--bulkEditLabel');
    label.textContent = labelText;
    const hint = document.createElement('i');
    hint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(hint, hintText);
    label.append(hint);
    container.append(label);
    return container;
}

export function createApplyButton(tooltip, runFn, applyRegistry) {
    const applyButtonEl = document.createElement('div');
    applyButtonEl.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
    setTooltip(applyButtonEl, tooltip);
    applyButtonEl.addEventListener('click', ()=>runFn());
    applyRegistry.push({
        isDirty: ()=>applyButtonEl.classList.contains(APPLY_DIRTY_CLASS),
        runApply: runFn,
    });
    return applyButtonEl;
}

export function buildDirectionRadio(groupName, value, labelText, hint, directionStorageKey, applyButton) {
    const directionRow = document.createElement('label');
    directionRow.classList.add('stwid--inputWrap');
    setTooltip(directionRow, hint);

    const radioInput = document.createElement('input');
    radioInput.type = 'radio';
    radioInput.name = groupName;
    radioInput.value = value;
    radioInput.checked = (localStorage.getItem(directionStorageKey) ?? 'down') === value;
    radioInput.addEventListener('change', ()=>{
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
    recursionRow.classList.add('stwid--small-check-row');

    const recursionCheckbox = document.createElement('input');
    recursionCheckbox.type = 'checkbox';
    recursionCheckbox.classList.add('checkbox');
    setTooltip(recursionCheckbox, label);
    recursionCheckboxes.set(value, recursionCheckbox);
    recursionRow.append(recursionCheckbox);
    recursionRow.append(label);
    return recursionRow;
}

export function getSafeTbodyRows(dom) {
    const tbody = dom.order?.tbody;
    if (!(tbody instanceof HTMLElement)) {
        toastr.warning('Entry Manager table is not ready yet.');
        return null;
    }
    return [...tbody.children].filter((child)=>child instanceof HTMLElement);
}

export function getBulkTargets(rows, cache, isEntryManagerRowSelected, { reverse = false } = {}) {
    const orderedRows = reverse ? [...rows].reverse() : rows;
    const targets = [];
    let skippedInvalidRow = false;
    for (const tr of orderedRows) {
        if (tr.classList.contains('stwid--state-filtered')) continue;
        if (!isEntryManagerRowSelected(tr)) continue;
        const bookName = tr.getAttribute('data-book');
        const uid = tr.getAttribute('data-uid');
        if (!bookName || uid === null) {
            skippedInvalidRow = true;
            continue;
        }
        const entryData = cache?.[bookName]?.entries?.[uid];
        if (!entryData) {
            skippedInvalidRow = true;
            continue;
        }
        targets.push({ tr, bookName, uid, entryData });
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
    input.classList.add('stwid-compactInput', 'text_pole');
    input.type = 'number';
    input.min = min;
    if (max !== undefined) input.max = max;
    input.placeholder = placeholder ?? '';
    setTooltip(input, tooltip);

    const storedValue = localStorage.getItem(storageKey);
    if (storedValue !== null) input.value = storedValue;

    input.addEventListener('change', ()=>{
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
    dom,
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

    const rows = getSafeTbodyRows(dom);
    if (!rows) return;

    const targets = getBulkTargets(rows, cache, isEntryManagerRowSelected);
    const books = new Set();
    for (const { tr, bookName, entryData } of targets) {
        books.add(bookName);
        entryData[entryField] = parsedValue;
        const rowInput = tr.querySelector(`[name="${rowInputName}"]`);
        if (rowInput) rowInput.value = String(parsedValue);
    }
    await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
    applyButton.classList.remove(APPLY_DIRTY_CLASS);
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
