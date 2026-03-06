import { setTooltip } from '../utils.js';
import { ORDER_HELPER_RECURSION_OPTIONS } from '../../shared/constants.js';
import {
    BULK_APPLY_BATCH_SIZE,
    APPLY_DIRTY_CLASS,
    NON_NEGATIVE_PLACEHOLDER,
    createLabeledBulkContainer,
    createApplyButton,
    getSafeTbodyRows,
    getBulkTargets,
    saveUpdatedBooks,
    withApplyButtonLock,
    createPersistedBulkNumberInput,
    runApplyNonNegativeIntegerField,
    buildRecursionCheckboxRow,
    applyRecursionFlagsToRowInputs,
} from './bulk-edit-row.helpers.js';

export function buildBulkSelectSection({
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

export function buildApplyAllSection(applyRegistry) {
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

export function buildBulkProbabilitySection({
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

export function buildBulkStickySection({
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

export function buildBulkCooldownSection({
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

export function buildBulkDelaySection({
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

export function buildBulkStateSection({
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

export function buildBulkStrategySection({
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
                const rowStrat = tr.querySelector('[name="entryStateSelector"]');
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

export function buildBulkRecursionSection({
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

export function buildBulkBudgetSection({
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
