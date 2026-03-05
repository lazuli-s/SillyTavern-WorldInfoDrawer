import {
    MULTISELECT_DROPDOWN_CLOSE_HANDLER,
    closeOpenMultiselectDropdownMenus,
    setTooltip,
} from './bulk-editor.utils.js';
import { wrapRowContent } from './bulk-editor.action-bar.helpers.js';
import { ORDER_HELPER_RECURSION_OPTIONS } from '../../shared/constants.js';

const BULK_APPLY_BATCH_SIZE = 200;
const APPLY_DIRTY_CLASS = 'stwid--applyDirty';
const NON_NEGATIVE_PLACEHOLDER = '0+';
const MAX_ORDER_INPUT = '10000';

function createLabeledBulkContainer(fieldKey, labelText, hintText) {
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

function createApplyButton(tooltip, runFn, applyRegistry) {
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

function buildDirectionRadio(groupName, value, labelText, hint, directionStorageKey, applyButton) {
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


function buildRecursionCheckboxRow(value, label, recursionCheckboxes) {
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

function getSafeTbodyRows(dom) {
    const tbody = dom.order?.tbody;
    if (!(tbody instanceof HTMLElement)) {
        toastr.warning('Entry Manager table is not ready yet.');
        return null;
    }
    return [...tbody.children].filter((child)=>child instanceof HTMLElement);
}


function getBulkTargets(rows, cache, isOrderHelperRowSelected, { reverse = false } = {}) {
    const orderedRows = reverse ? [...rows].reverse() : rows;
    const targets = [];
    let skippedInvalidRow = false;
    for (const tr of orderedRows) {
        if (tr.classList.contains('stwid--state-filtered')) continue;
        if (!isOrderHelperRowSelected(tr)) continue;
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


async function saveUpdatedBooks(books, saveWorldInfo, buildSavePayload) {
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


async function withApplyButtonLock(button, callback) {
    if (button.dataset.stwidBusy === '1') return;
    setApplyButtonBusy(button, true);
    try {
        await callback();
    } finally {
        setApplyButtonBusy(button, false);
    }
}

function createPersistedBulkNumberInput({
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

async function runApplyNonNegativeIntegerField({
    input,
    entryField,
    rowInputName,
    emptyValueWarning,
    invalidValueWarning,
    dom,
    cache,
    isOrderHelperRowSelected,
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

    const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
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

function applyRecursionFlagsToRowInputs(domInputs, entryData, recursionCheckboxes) {
    let recursionInputIndex = 0;
    for (const { value } of ORDER_HELPER_RECURSION_OPTIONS) {
        const checked = recursionCheckboxes.get(value).checked;
        entryData[value] = checked;
        if (domInputs[recursionInputIndex]) domInputs[recursionInputIndex].checked = checked;
        recursionInputIndex++;
    }
}

function buildBulkSelectSection({
    dom,
    getOrderHelperRows,
    isOrderHelperRowSelected,
    setAllOrderHelperRowSelected,
    updateOrderHelperSelectAllButton,
}) {
    const selectContainer = createLabeledBulkContainer(
        'select',
        'Select',
        'Toggle selection of entries. Selected entries are targeted by bulk operations in this row.',
    );

    const selectionCountEl = document.createElement('span');
    selectionCountEl.classList.add('stwid--visibilityCount');
    selectionCountEl.textContent = 'Selected 0 out of 0 entries';

    const refreshSelectionCount = ()=>{
        const rows = dom.order.tbody ? [...dom.order.tbody.children] : [];
        const visible = rows.filter((tableRow)=>!tableRow.classList.contains('stwid--state-filtered'));
        const total = visible.length;
        const selected = visible.filter((tableRow)=>isOrderHelperRowSelected(tableRow)).length;
        selectionCountEl.textContent = `Selected ${selected} out of ${total} entries`;
    };

    const selectAll = document.createElement('div');
    dom.order.selectAll = selectAll;
    selectAll.classList.add('menu_button', 'interactable');
    selectAll.classList.add('fa-solid', 'fa-fw', 'fa-square-check', 'stwid--state-active');
    setTooltip(selectAll, 'Select/deselect all entries to be edited by Apply Order');
    selectAll.addEventListener('click', ()=>{
        const rows = getOrderHelperRows();
        const shouldSelect = !rows.length || rows.some((tableRow)=>!isOrderHelperRowSelected(tableRow));
        setAllOrderHelperRowSelected(shouldSelect);
        updateOrderHelperSelectAllButton();
        refreshSelectionCount();
    });

    selectContainer.append(selectAll, selectionCountEl);
    return { selectContainer, refreshSelectionCount };
}

function buildApplyAllSection(applyRegistry) {
    const applyAllContainer = createLabeledBulkContainer(
        'applyAll',
        'Apply All Changes',
        'Applies all containers that have unsaved changes. Skips containers that have not been modified.',
    );

    const applyAll = document.createElement('div');
    applyAll.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
    setTooltip(applyAll, 'Apply all containers with unsaved changes');
    applyAll.addEventListener('click', async () => {
        await withApplyButtonLock(applyAll, async () => {
            const dirty = applyRegistry.filter(({ isDirty }) => isDirty());
            if (!dirty.length) {
                toastr.info('No changes to apply.');
                return;
            }
            for (const { runApply } of dirty) {
                await runApply();
            }
        });
    });

    applyAllContainer.append(applyAll);
    return applyAllContainer;
}

function buildBulkProbabilitySection({
    dom,
    cache,
    isOrderHelperRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyRegistry,
}) {
    const probabilityContainer = createLabeledBulkContainer(
        'probability',
        'Probability',
        'Trigger probability (0–100%). Sets how likely the entry fires when its keywords match. Leave blank to skip.',
    );

    const probabilityInput = createPersistedBulkNumberInput({
        container: probabilityContainer,
        storageKey: 'stwid--bulk-probability-value',
        min: '0',
        max: '100',
        placeholder: '0–100',
        tooltip: 'Probability value to apply (0–100)',
    });

    const runApplyProbability = async () => {
        const rawValue = probabilityInput.value.trim();
        if (rawValue === '') {
            toastr.warning('Enter a probability value (0–100).');
            return;
        }
        const parsed = parseInt(rawValue, 10);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
            toastr.warning('Probability must be a whole number between 0 and 100.');
            return;
        }
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();
        for (const { tr, bookName, entryData } of targets) {
            books.add(bookName);
            entryData.selective_probability = parsed;
            const rowInp = tr.querySelector('[name="selective_probability"]');
            if (rowInp) rowInp.value = String(parsed);
        }
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyProbability.classList.remove(APPLY_DIRTY_CLASS);
    };

    const applyProbability = createApplyButton(
        'Apply this probability to all selected entries',
        runApplyProbability,
        applyRegistry,
    );
    probabilityInput.addEventListener('change', () => applyProbability.classList.add(APPLY_DIRTY_CLASS));
    probabilityContainer.append(applyProbability);
    return probabilityContainer;
}

function buildBulkStickySection({
    dom,
    cache,
    isOrderHelperRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyRegistry,
}) {
    const stickyContainer = createLabeledBulkContainer(
        'sticky',
        'Sticky',
        'Sticky turns — keeps the entry active for N turns after it triggers. Leave blank to skip.',
    );

    const stickyInput = createPersistedBulkNumberInput({
        container: stickyContainer,
        storageKey: 'stwid--bulk-sticky-value',
        min: '0',
        placeholder: NON_NEGATIVE_PLACEHOLDER,
        tooltip: 'Sticky turns value to apply',
    });

    const runApplySticky = async () => {
        await runApplyNonNegativeIntegerField({
            input: stickyInput,
            entryField: 'sticky',
            rowInputName: 'sticky',
            emptyValueWarning: 'Enter a sticky value (0 or more).',
            invalidValueWarning: 'Sticky must be a non-negative whole number.',
            dom,
            cache,
            isOrderHelperRowSelected,
            saveWorldInfo,
            buildSavePayload,
            applyButton: applySticky,
        });
    };

    const applySticky = createApplyButton(
        'Apply this sticky value to all selected entries',
        runApplySticky,
        applyRegistry,
    );
    stickyInput.addEventListener('change', () => applySticky.classList.add(APPLY_DIRTY_CLASS));
    stickyContainer.append(applySticky);
    return stickyContainer;
}

function buildBulkCooldownSection({
    dom,
    cache,
    isOrderHelperRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyRegistry,
}) {
    const cooldownContainer = createLabeledBulkContainer(
        'cooldown',
        'Cooldown',
        'Cooldown turns — prevents the entry from re-triggering for N turns after activation. Leave blank to skip.',
    );

    const cooldownInput = createPersistedBulkNumberInput({
        container: cooldownContainer,
        storageKey: 'stwid--bulk-cooldown-value',
        min: '0',
        placeholder: NON_NEGATIVE_PLACEHOLDER,
        tooltip: 'Cooldown turns value to apply',
    });

    const runApplyCooldown = async () => {
        await runApplyNonNegativeIntegerField({
            input: cooldownInput,
            entryField: 'cooldown',
            rowInputName: 'cooldown',
            emptyValueWarning: 'Enter a cooldown value (0 or more).',
            invalidValueWarning: 'Cooldown must be a non-negative whole number.',
            dom,
            cache,
            isOrderHelperRowSelected,
            saveWorldInfo,
            buildSavePayload,
            applyButton: applyCooldown,
        });
    };

    const applyCooldown = createApplyButton(
        'Apply this cooldown value to all selected entries',
        runApplyCooldown,
        applyRegistry,
    );
    cooldownInput.addEventListener('change', () => applyCooldown.classList.add(APPLY_DIRTY_CLASS));
    cooldownContainer.append(applyCooldown);
    return cooldownContainer;
}

function buildBulkDelaySection({
    dom,
    cache,
    isOrderHelperRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyRegistry,
}) {
    const bulkDelayContainer = createLabeledBulkContainer(
        'bulkDelay',
        'Delay',
        'Delay turns — the entry will not activate until N messages have passed since the chat started. Leave blank to skip.',
    );

    const bulkDelayInput = createPersistedBulkNumberInput({
        container: bulkDelayContainer,
        storageKey: 'stwid--bulk-delay-value',
        min: '0',
        placeholder: NON_NEGATIVE_PLACEHOLDER,
        tooltip: 'Delay turns value to apply',
    });

    const runApplyBulkDelay = async () => {
        await runApplyNonNegativeIntegerField({
            input: bulkDelayInput,
            entryField: 'delay',
            rowInputName: 'delay',
            emptyValueWarning: 'Enter a delay value (0 or more).',
            invalidValueWarning: 'Delay must be a non-negative whole number.',
            dom,
            cache,
            isOrderHelperRowSelected,
            saveWorldInfo,
            buildSavePayload,
            applyButton: applyBulkDelay,
        });
    };

    const applyBulkDelay = createApplyButton(
        'Apply this delay value to all selected entries',
        runApplyBulkDelay,
        applyRegistry,
    );
    bulkDelayInput.addEventListener('change', () => applyBulkDelay.classList.add(APPLY_DIRTY_CLASS));
    bulkDelayContainer.append(applyBulkDelay);
    return bulkDelayContainer;
}

function buildBulkStateSection({
    dom,
    cache,
    isOrderHelperRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyRegistry,
}) {
    const activeStateContainer = createLabeledBulkContainer(
        'activeState',
        'State',
        'Choose enabled or disabled and apply it to all selected entries at once.',
    );

    const activeToggle = document.createElement('div');
    activeToggle.classList.add('fa-solid', 'killSwitch');
    const storedActive = localStorage.getItem('stwid--bulk-active-value');
    const isActiveOn = storedActive !== 'false';
    activeToggle.classList.toggle('fa-toggle-on', isActiveOn);
    activeToggle.classList.toggle('fa-toggle-off', !isActiveOn);
    setTooltip(activeToggle, 'State to apply: toggle on = enable entries, toggle off = disable entries');
    activeToggle.addEventListener('click', ()=>{
        const isOn = activeToggle.classList.contains('fa-toggle-on');
        activeToggle.classList.toggle('fa-toggle-on', !isOn);
        activeToggle.classList.toggle('fa-toggle-off', isOn);
        localStorage.setItem('stwid--bulk-active-value', String(!isOn));
    });

    const runApplyActiveState = async () => {
        await withApplyButtonLock(applyActiveState, async()=>{
            const rows = getSafeTbodyRows(dom);
            if (!rows) return;

            const willDisable = activeToggle.classList.contains('fa-toggle-off');
            const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
            const books = new Set();
            for (let i = 0; i < targets.length; i++) {
                const { tr, bookName, uid, entryData } = targets[i];
                books.add(bookName);
                entryData.disable = willDisable;
                const rowToggle = tr.querySelector('[name="entryKillSwitch"]');
                if (rowToggle) {
                    rowToggle.classList.toggle('fa-toggle-off', willDisable);
                    rowToggle.classList.toggle('fa-toggle-on', !willDisable);
                }
                const listToggle = cache?.[bookName]?.dom?.entry?.[uid]?.isEnabled;
                if (listToggle) {
                    listToggle.classList.toggle('fa-toggle-off', willDisable);
                    listToggle.classList.toggle('fa-toggle-on', !willDisable);
                }
                if ((i + 1) % BULK_APPLY_BATCH_SIZE === 0) {
                    await new Promise((resolve)=>setTimeout(resolve, 0));
                }
            }
            await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
            applyActiveState.classList.remove(APPLY_DIRTY_CLASS);
        });
    };

    const applyActiveState = createApplyButton(
        'Apply the active state to all selected entries',
        runApplyActiveState,
        applyRegistry,
    );
    activeToggle.addEventListener('click', () => applyActiveState.classList.add(APPLY_DIRTY_CLASS));
    activeStateContainer.append(activeToggle, applyActiveState);
    return activeStateContainer;
}

function buildBulkStrategySection({
    dom,
    cache,
    isOrderHelperRowSelected,
    saveWorldInfo,
    buildSavePayload,
    getStrategyOptions,
    applyOrderHelperStrategyFilterToRow,
    applyRegistry,
}) {
    const strategyContainer = createLabeledBulkContainer(
        'strategy',
        'Strategy',
        'Choose a strategy and apply it to all selected entries at once.',
    );

    const strategySelect = document.createElement('select');
    strategySelect.classList.add('stwid--input', 'text_pole', 'stwid--smallSelectTextPole');
    setTooltip(strategySelect, 'Strategy to apply to selected entries');
    for (const opt of getStrategyOptions()) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        strategySelect.append(option);
    }
    const storedStrategy = localStorage.getItem('stwid--bulk-strategy-value');
    if (storedStrategy && [...strategySelect.options].some((opt)=>opt.value === storedStrategy)) {
        strategySelect.value = storedStrategy;
    }
    strategySelect.addEventListener('change', ()=>{
        localStorage.setItem('stwid--bulk-strategy-value', strategySelect.value);
    });
    strategyContainer.append(strategySelect);

    const runApplyStrategy = async () => {
        await withApplyButtonLock(applyStrategy, async()=>{
            const value = strategySelect.value;
            if (!value) {
                toastr.warning('No strategy selected.');
                return;
            }
            const rows = getSafeTbodyRows(dom);
            if (!rows) return;

            const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
            const books = new Set();
            for (let i = 0; i < targets.length; i++) {
                const { tr, bookName, uid, entryData } = targets[i];
                books.add(bookName);
                entryData.constant = value === 'constant';
                entryData.vectorized = value === 'vectorized';
                const rowStrat = (tr.querySelector('[name="entryStateSelector"]'));
                if (rowStrat) rowStrat.value = value;
                const domStrat = cache?.[bookName]?.dom?.entry?.[uid]?.strategy;
                if (domStrat) domStrat.value = value;
                applyOrderHelperStrategyFilterToRow(tr, entryData);
                if ((i + 1) % BULK_APPLY_BATCH_SIZE === 0) {
                    await new Promise((resolve)=>setTimeout(resolve, 0));
                }
            }
            await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
            applyStrategy.classList.remove(APPLY_DIRTY_CLASS);
        });
    };

    const applyStrategy = createApplyButton(
        'Apply selected strategy to all selected entries',
        runApplyStrategy,
        applyRegistry,
    );
    strategySelect.addEventListener('change', () => applyStrategy.classList.add(APPLY_DIRTY_CLASS));
    strategyContainer.append(applyStrategy);
    return strategyContainer;
}

function buildBulkRecursionSection({
    dom,
    cache,
    isOrderHelperRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyOrderHelperRecursionFilterToRow,
    applyRegistry,
}) {
    const recursionContainer = createLabeledBulkContainer(
        'recursion',
        'Recursion',
        'Set recursion flags on all selected entries. Overwrites the existing values of all three flags.',
    );

    const recursionCheckboxes = new Map();
    const recursionOptions = document.createElement('div');
    recursionOptions.classList.add('stwid--recursionOptions');
    for (const { value, label } of ORDER_HELPER_RECURSION_OPTIONS) {
        recursionOptions.append(buildRecursionCheckboxRow(value, label, recursionCheckboxes));
    }
    recursionContainer.append(recursionOptions);

    const runApplyRecursion = async () => {
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();
        for (const { tr, bookName, entryData } of targets) {
            books.add(bookName);
            const domInputs = tr.querySelectorAll('[data-col="recursion"] .stwid--recursionOptions input[type="checkbox"]');
            applyRecursionFlagsToRowInputs(domInputs, entryData, recursionCheckboxes);
            applyOrderHelperRecursionFilterToRow(tr, entryData);
        }
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyRecursion.classList.remove(APPLY_DIRTY_CLASS);
    };

    const applyRecursion = createApplyButton(
        'Apply recursion flags to all selected entries, overwriting their current values',
        runApplyRecursion,
        applyRegistry,
    );
    for (const input of recursionCheckboxes.values()) {
        input.addEventListener('change', () => applyRecursion.classList.add(APPLY_DIRTY_CLASS));
    }
    recursionContainer.append(applyRecursion);
    return recursionContainer;
}

function buildBulkBudgetSection({
    dom,
    cache,
    isOrderHelperRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyRegistry,
}) {
    const budgetContainer = createLabeledBulkContainer(
        'budget',
        'Budget',
        'Set the Ignore Budget flag on all selected entries, overwriting existing values. When enabled, an entry bypasses the World Info token budget limit.',
    );

    let budgetIgnoreCheckbox;
    const budgetOptions = document.createElement('div');
    budgetOptions.classList.add('stwid--recursionOptions');
    const budgetRow = document.createElement('label');
    budgetRow.classList.add('stwid--small-check-row');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.classList.add('checkbox');
    setTooltip(input, 'Ignore World Info budget limit for this entry');
    budgetIgnoreCheckbox = input;
    budgetRow.append(input);
    budgetRow.append('Ignore budget');
    budgetOptions.append(budgetRow);
    budgetContainer.append(budgetOptions);

    const runApplyBudget = async () => {
        const checked = budgetIgnoreCheckbox.checked;
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();
        for (const { tr, bookName, entryData } of targets) {
            books.add(bookName);
            entryData.ignoreBudget = checked;
            const domInput = tr.querySelector('[data-col="budget"] .stwid--recursionOptions input[type="checkbox"]');
            if (domInput) domInput.checked = checked;
        }
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyBudget.classList.remove(APPLY_DIRTY_CLASS);
    };

    const applyBudget = createApplyButton(
        'Apply Ignore Budget to all selected entries, overwriting their current values',
        runApplyBudget,
        applyRegistry,
    );
    budgetIgnoreCheckbox.addEventListener('change', () => applyBudget.classList.add(APPLY_DIRTY_CLASS));
    budgetContainer.append(applyBudget);
    return budgetContainer;
}

export function buildBulkEditRow({
    dom,
    cache,
    saveWorldInfo,
    buildSavePayload,
    isOrderHelperRowSelected,
    setAllOrderHelperRowSelected,
    updateOrderHelperSelectAllButton,
    getOrderHelperRows,
    getStrategyOptions,
    applyOrderHelperStrategyFilterToRow,
    getPositionOptions,
    applyOrderHelperPositionFilterToRow,
    isOutletPosition,
    getOutletOptions,
    applyOrderHelperOutletFilterToRow,
    syncOrderHelperOutletFilters,
    filterIndicatorRefs,
    applyOrderHelperRecursionFilterToRow,
}) {
    const row = document.createElement('div');
    row.classList.add('stwid--bulkEditRow');

    const { selectContainer, refreshSelectionCount } = buildBulkSelectSection({
        dom,
        getOrderHelperRows,
        isOrderHelperRowSelected,
        setAllOrderHelperRowSelected,
        updateOrderHelperSelectAllButton,
    });
    row.append(selectContainer);

    
    
    const applyRegistry = [];

    row.append(buildBulkStateSection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkStrategySection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        getStrategyOptions,
        applyOrderHelperStrategyFilterToRow,
        applyRegistry,
    }));

    
    const positionContainer = createLabeledBulkContainer('position', 'Position', 'Choose a position and apply it to all selected entries at once.');

    const positionSelect = document.createElement('select'); {
        positionSelect.classList.add('stwid--input', 'text_pole', 'stwid--smallSelectTextPole');
        setTooltip(positionSelect, 'Position to apply to selected entries');
        for (const opt of getPositionOptions()) {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            positionSelect.append(option);
        }
        const storedPosition = localStorage.getItem('stwid--bulk-position-value');
        if (storedPosition && [...positionSelect.options].some((opt)=>opt.value === storedPosition)) {
            positionSelect.value = storedPosition;
        }
        positionSelect.addEventListener('change', ()=>{
            localStorage.setItem('stwid--bulk-position-value', positionSelect.value);
        });
        positionContainer.append(positionSelect);
    }

    const runApplyPosition = async () => {
        const value = positionSelect.value;
        if (!value) {
            toastr.warning('No position selected.');
            return;
        }
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();
        for (const { tr, bookName, uid, entryData } of targets) {
            books.add(bookName);
            entryData.position = value;
            const domPos = cache?.[bookName]?.dom?.entry?.[uid]?.position;
            if (domPos) domPos.value = value;
            applyOrderHelperPositionFilterToRow(tr, entryData);
        }
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyPosition.classList.remove(APPLY_DIRTY_CLASS);
    };
    const applyPosition = createApplyButton('Apply selected position to all selected entries', runApplyPosition, applyRegistry);
    positionSelect.addEventListener('change', () => applyPosition.classList.add(APPLY_DIRTY_CLASS));
    positionContainer.append(applyPosition);

    row.append(positionContainer);

    
    const depthContainer = createLabeledBulkContainer('depth', 'Depth', 'Apply a Depth value to all selected entries at once. Depth controls how many messages back from the latest the trigger check looks (0 = last message). Leave blank to clear depth.');

    const depthInput = document.createElement('input'); {
        depthInput.classList.add('stwid-compactInput', 'text_pole');
        depthInput.type = 'number';
        depthInput.min = '0';
        depthInput.max = '99999';
        depthInput.placeholder = '';
        setTooltip(depthInput, 'Depth value to apply to selected entries');
        const storedDepth = localStorage.getItem('stwid--bulk-depth-value');
        if (storedDepth !== null) depthInput.value = storedDepth;
        depthInput.addEventListener('change', ()=>{
            localStorage.setItem('stwid--bulk-depth-value', depthInput.value);
        });
        depthContainer.append(depthInput);
    }

    const runApplyDepth = async () => {
        const rawValue = depthInput.value.trim();
        const parsedDepth = rawValue === '' ? undefined : parseInt(rawValue, 10);
        if (rawValue !== '' && (!Number.isInteger(parsedDepth) || parsedDepth < 0)) {
            toastr.warning('Depth must be a non-negative whole number, or blank to clear.');
            return;
        }
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();
        for (const { tr, bookName, entryData } of targets) {
            books.add(bookName);
            entryData.depth = parsedDepth;
            const rowDepth = (tr.querySelector('[name="depth"]'));
            if (rowDepth) rowDepth.value = parsedDepth !== undefined ? String(parsedDepth) : '';
        }
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyDepth.classList.remove(APPLY_DIRTY_CLASS);
    };
    const applyDepth = createApplyButton('Apply depth value to all selected entries', runApplyDepth, applyRegistry);
    depthInput.addEventListener('change', () => applyDepth.classList.add(APPLY_DIRTY_CLASS));
    depthContainer.append(applyDepth);

    row.append(depthContainer);

    
    const applyDepthContainerState = ()=>{
        const isDepth = positionSelect.value === '4';
        depthContainer.classList.toggle('stwid--state-disabled', !isDepth);
        depthInput.disabled = !isDepth;
    };
    positionSelect.addEventListener('change', applyDepthContainerState);
    applyDepthContainerState();

    
    const outletContainer = createLabeledBulkContainer('outlet', 'Outlet', 'Apply an Outlet name to all selected entries at once. Only interactable when Position is set to Outlet.');

    const outletDropdownWrap = document.createElement('div');
    outletDropdownWrap.classList.add('stwid--multiselectDropdownWrap');

    const outletInput = document.createElement('input');
    outletInput.classList.add('stwid--input', 'text_pole');
    outletInput.type = 'text';
    outletInput.placeholder = '(none)';
    setTooltip(outletInput, 'Outlet name to apply to selected entries');
    const storedOutlet = localStorage.getItem('stwid--bulk-outlet-value');
    if (storedOutlet !== null) outletInput.value = storedOutlet;

    const outletMenu = document.createElement('div');
    outletMenu.classList.add('stwid--multiselectDropdownMenu', 'stwid--menu');

    const buildOutletMenuOptions = ()=>{
        outletMenu.innerHTML = '';
        const filter = outletInput.value.toLowerCase();
        const allOptions = getOutletOptions();
        const visible = filter ? allOptions.filter((opt)=>opt.value.toLowerCase().includes(filter)) : allOptions;
        for (const opt of visible) {
            const optEl = document.createElement('div');
            optEl.classList.add('stwid--multiselectDropdownOption', 'stwid--menuItem');
            optEl.textContent = opt.value;
            if (opt.value === outletInput.value) optEl.classList.add('stwid--state-active');
            optEl.addEventListener('mousedown', (e)=>{
                e.preventDefault();
                outletInput.value = opt.value;
                localStorage.setItem('stwid--bulk-outlet-value', outletInput.value);
                closeOutletMenu();
            });
            outletMenu.append(optEl);
        }
    };
    const closeOutletMenu = ()=>{
        if (!outletMenu.classList.contains('stwid--state-active')) return;
        outletMenu.classList.remove('stwid--state-active');
        document.removeEventListener('click', handleOutletOutsideClick);
    };
    const openOutletMenu = ()=>{
        if (outletMenu.classList.contains('stwid--state-active')) return;
        closeOpenMultiselectDropdownMenus(outletMenu);
        outletMenu.classList.add('stwid--state-active');
        document.addEventListener('click', handleOutletOutsideClick);
    };
    const handleOutletOutsideClick = (event)=>{
        if (outletDropdownWrap.contains(event.target)) return;
        closeOutletMenu();
    };
    const cleanup = ()=>{
        closeOutletMenu();
        document.removeEventListener('click', handleOutletOutsideClick);
    };
    outletMenu[MULTISELECT_DROPDOWN_CLOSE_HANDLER] = closeOutletMenu;
    outletMenu.addEventListener('click', (event)=>event.stopPropagation());

    outletInput.addEventListener('focus', ()=>{
        buildOutletMenuOptions();
        if (outletMenu.children.length > 0) openOutletMenu();
    });
    outletInput.addEventListener('input', ()=>{
        buildOutletMenuOptions();
        if (outletMenu.children.length === 0) closeOutletMenu();
        else openOutletMenu();
        localStorage.setItem('stwid--bulk-outlet-value', outletInput.value);
    });
    outletInput.addEventListener('change', ()=>{
        localStorage.setItem('stwid--bulk-outlet-value', outletInput.value);
    });
    outletInput.addEventListener('keydown', (e)=>{
        if (e.key === 'Escape') {
            closeOutletMenu();
            outletInput.blur();
        }
    });

    outletDropdownWrap.append(outletInput, outletMenu);
    outletContainer.append(outletDropdownWrap);

    const runApplyOutlet = async () => {
        const value = outletInput.value.trim();
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();
        
        for (const { tr, bookName, entryData } of targets) {
            books.add(bookName);
            entryData.outletName = value;
            const rowOutlet = (tr.querySelector('[name="outletName"]'));
            if (rowOutlet) rowOutlet.value = value;
        }
        
        syncOrderHelperOutletFilters();
        
        for (const { tr, entryData } of targets) {
            applyOrderHelperOutletFilterToRow(tr, entryData);
        }
        filterIndicatorRefs.outlet?.();
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyOutlet.classList.remove(APPLY_DIRTY_CLASS);
    };
    const applyOutlet = createApplyButton('Apply outlet name to all selected entries', runApplyOutlet, applyRegistry);
    outletInput.addEventListener('input', () => applyOutlet.classList.add(APPLY_DIRTY_CLASS));
    outletContainer.append(applyOutlet);

    row.append(outletContainer);

    
    const applyOutletContainerState = ()=>{
        const isOutlet = isOutletPosition(positionSelect.value);
        outletContainer.classList.toggle('stwid--state-disabled', !isOutlet);
        outletInput.disabled = !isOutlet;
    };
    positionSelect.addEventListener('change', applyOutletContainerState);
    applyOutletContainerState();

    
    const orderContainer = createLabeledBulkContainer('order', 'Order', 'Assign sequential Order numbers to selected entries using the start value, spacing, and direction below.');

    const runApplyOrder = async () => {
        await withApplyButtonLock(applyOrder, async()=>{
            const start = Number.parseInt(dom.order.start.value, 10);
            const step = Number.parseInt(dom.order.step.value, 10);
            if (!Number.isInteger(start) || start <= 0) {
                toastr.warning('Start must be a positive whole number.');
                return;
            }
            if (!Number.isInteger(step) || step <= 0) {
                toastr.warning('Spacing must be a positive whole number.');
                return;
            }
            const rows = getSafeTbodyRows(dom);
            if (!rows) return;

            const up = dom.order.direction.up.checked;
            const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected, { reverse: up });
            let order = start;
            const books = new Set();
            for (let i = 0; i < targets.length; i++) {
                const { tr, bookName, entryData } = targets[i];
                books.add(bookName);
                entryData.order = order;
                const orderInput = (tr.querySelector('[name="order"]'));
                if (orderInput) orderInput.value = order.toString();
                order += step;
                if ((i + 1) % BULK_APPLY_BATCH_SIZE === 0) {
                    await new Promise((resolve)=>setTimeout(resolve, 0));
                }
            }
            await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
            applyOrder.classList.remove(APPLY_DIRTY_CLASS);
        });
    };
    
    const applyOrder = createApplyButton('Apply current row order to the Order field', runApplyOrder, applyRegistry);

    
    const startSpacingPair = document.createElement('div');
    startSpacingPair.classList.add('stwid--orderStartSpacingPair');

    const startLbl = document.createElement('label'); {
        startLbl.classList.add('stwid--inputWrap');
        setTooltip(startLbl, 'Starting Order value');
        startLbl.append('Start: ');
        const start = document.createElement('input'); {
            dom.order.start = start;
            start.classList.add('stwid-compactInput', 'text_pole');
            start.type = 'number';
            start.min = '1';
            start.max = MAX_ORDER_INPUT;
            start.value = localStorage.getItem('stwid--order-start') ?? '100';
            start.addEventListener('change', ()=>{
                localStorage.setItem('stwid--order-start', start.value);
            });
            startLbl.append(start);
        }
        startSpacingPair.append(startLbl);
    }

    const stepLbl = document.createElement('label'); {
        stepLbl.classList.add('stwid--inputWrap');
        setTooltip(stepLbl, 'Spacing between Order values');
        stepLbl.append('Spacing: ');
        const step = document.createElement('input'); {
            dom.order.step = step;
            step.classList.add('stwid-compactInput', 'text_pole');
            step.type = 'number';
            step.min = '1';
            step.max = MAX_ORDER_INPUT;
            step.value = localStorage.getItem('stwid--order-step') ?? '10';
            step.addEventListener('change', ()=>{
                localStorage.setItem('stwid--order-step', step.value);
            });
            stepLbl.append(step);
        }
        startSpacingPair.append(stepLbl);
    }

    orderContainer.append(startSpacingPair);
    dom.order.start.addEventListener('change', () => applyOrder.classList.add(APPLY_DIRTY_CLASS));
    dom.order.step.addEventListener('change', () => applyOrder.classList.add(APPLY_DIRTY_CLASS));

    const directionGroup = document.createElement('div'); {
        directionGroup.classList.add('stwid--inputWrap');
        setTooltip(directionGroup, 'Direction used when applying Order values');
        directionGroup.append('Direction: ');
        const directionRadioGroupName = 'stwid--order-direction';
        const radioToggleWrap = document.createElement('div'); {
            radioToggleWrap.classList.add('stwid--toggleWrap');
            const upDirection = buildDirectionRadio(
                directionRadioGroupName,
                'up',
                'up',
                'Start from the bottom row',
                'stwid--order-direction',
                applyOrder,
            );
            dom.order.direction.up = upDirection.radioInput;
            radioToggleWrap.append(upDirection.directionRow);
            const downDirection = buildDirectionRadio(
                directionRadioGroupName,
                'down',
                'down',
                'Start from the top row',
                'stwid--order-direction',
                applyOrder,
            );
            dom.order.direction.down = downDirection.radioInput;
            radioToggleWrap.append(downDirection.directionRow);
            directionGroup.append(radioToggleWrap);
        }
        orderContainer.append(directionGroup);
    }
    orderContainer.append(applyOrder);
    row.append(orderContainer);

    row.append(buildBulkRecursionSection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyOrderHelperRecursionFilterToRow,
        applyRegistry,
    }));
    row.append(buildBulkBudgetSection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));

    row.append(buildBulkProbabilitySection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkStickySection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkCooldownSection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkDelaySection({
        dom,
        cache,
        isOrderHelperRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));

    row.append(buildApplyAllSection(applyRegistry));

    wrapRowContent(row);

    return { element: row, refreshSelectionCount, cleanup };
}
