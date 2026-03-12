import {
    createMultiselectDropdownCheckbox,
    wireMultiselectDropdown,
} from '../entry-manager.utils.js';
import {
    ENTRY_MANAGER_TABLE_COLUMNS,
    ENTRY_MANAGER_NUMBER_COLUMN_KEYS,
    ENTRY_MANAGER_RECURSION_OPTIONS,
} from '../../shared/constants.js';

const ACTIVE_FILTER_CLASS = 'stwid--state-active';

function ensureDefaultFiltersSelected({ stateKey, allValues, entryManagerState }) {
    if (!entryManagerState.filters[stateKey].length) {
        entryManagerState.filters[stateKey] = [...allValues];
    }
}

function updateFilterIndicatorState({
    stateKey,
    stateValuesKey,
    getValues,
    normalizeFilters,
    entryManagerState,
    menuButton,
}) {
    const allValues = normalizeFilters === null
        ? (entryManagerState[stateValuesKey] ?? [])
        : (entryManagerState[stateValuesKey].length ? entryManagerState[stateValuesKey] : getValues());

    if (!allValues.length) {
        return;
    }

    if (normalizeFilters !== null) {
        entryManagerState.filters[stateKey] = normalizeFilters(entryManagerState.filters[stateKey]);
    }

    ensureDefaultFiltersSelected({ stateKey, allValues, entryManagerState });

    const isActive = entryManagerState.filters[stateKey].length !== allValues.length;
    menuButton.classList.toggle(ACTIVE_FILTER_CLASS, isActive);
}

function applyFiltersAndNotify({ updateFilterIndicator, applyFilters, onFilterChange }) {
    updateFilterIndicator();
    applyFilters();
    onFilterChange();
}

function createFilterMenuShell() {
    const menuWrap = document.createElement('div');
    menuWrap.classList.add('stwid--multiselectDropdownWrap');

    const menuButton = document.createElement('div');
    menuButton.classList.add(
        'menu_button',
        'fa-solid',
        'fa-fw',
        'fa-filter',
        'stwid--orderFilterButton',
        'stwid--multiselectDropdownButton',
    );
    menuWrap.append(menuButton);

    const menu = document.createElement('div');
    menu.classList.add('stwid--multiselectDropdownMenu', 'stwid--menu');

    return { menuWrap, menuButton, menu };
}

function createFilterMenuUpdaters({
    stateKey,
    stateValuesKey,
    getValues,
    normalizeFilters,
    applyFilters,
    onFilterChange,
    entryManagerState,
    menuButton,
}) {
    let updateFilterIndicator;
    let updateFilters;

    if (normalizeFilters === null) {
        updateFilterIndicator = () => {
            updateFilterIndicatorState({
                stateKey,
                stateValuesKey,
                getValues,
                normalizeFilters,
                entryManagerState,
                menuButton,
            });
        };

        updateFilters = () => {
            const allValues = entryManagerState[stateValuesKey] ?? [];
            ensureDefaultFiltersSelected({ stateKey, allValues, entryManagerState });
            applyFiltersAndNotify({ updateFilterIndicator, applyFilters, onFilterChange });
        };
    } else {

        updateFilterIndicator = () => {
            updateFilterIndicatorState({
                stateKey,
                stateValuesKey,
                getValues,
                normalizeFilters,
                entryManagerState,
                menuButton,
            });
        };

        updateFilters = () => {
            entryManagerState.filters[stateKey] = normalizeFilters(entryManagerState.filters[stateKey]);
            applyFiltersAndNotify({ updateFilterIndicator, applyFilters, onFilterChange });
        };
    }

    return { updateFilterIndicator, updateFilters };
}

function toggleFilterValue({ stateKey, value, isChecked, entryManagerState }) {
    if (isChecked) {
        if (!entryManagerState.filters[stateKey].includes(value)) {
            entryManagerState.filters[stateKey].push(value);
        }
        return;
    }

    entryManagerState.filters[stateKey] = entryManagerState.filters[stateKey]
        .filter((item) => item !== value);
}

function renderFilterMenuOptions({ options, stateKey, entryManagerState, updateFilters, menu }) {
    if (!options.length) {
        menu.classList.add('stwid--empty');
        menu.textContent = 'No options available.';
    }

    for (const optionData of options) {
        const option = document.createElement('label');
        option.classList.add('stwid--multiselectDropdownOption', 'stwid--menuItem');
        const inputControl = createMultiselectDropdownCheckbox(
            entryManagerState.filters[stateKey].includes(optionData.value),
        );
        inputControl.input.addEventListener('change', () => {
            toggleFilterValue({
                stateKey,
                value: optionData.value,
                isChecked: inputControl.input.checked,
                entryManagerState,
            });
            updateFilters();
        });
        option.append(inputControl.input, inputControl.checkbox);
        const optionLabel = document.createElement('span');
        optionLabel.textContent = optionData.label;
        option.append(optionLabel);
        menu.append(option);
    }
}

function finalizeFilterMenu({ menu, menuButton, menuWrap, updateFilterIndicator }) {
    updateFilterIndicator();
    wireMultiselectDropdown(menu, menuButton, menuWrap);
    menuWrap.append(menu);

    return { menuWrap, updateFilterIndicator };
}

function buildFilterMenu({ stateKey, stateValuesKey, getOptions, getValues, normalizeFilters, applyFilters, onFilterChange, entryManagerState }) {
    const { menuWrap, menuButton, menu } = createFilterMenuShell();
    const { updateFilterIndicator, updateFilters } = createFilterMenuUpdaters({
        stateKey,
        stateValuesKey,
        getValues,
        normalizeFilters,
        applyFilters,
        onFilterChange,
        entryManagerState,
        menuButton,
    });

    const options = getOptions();
    renderFilterMenuOptions({ options, stateKey, entryManagerState, updateFilters, menu });

    return finalizeFilterMenu({ menu, menuButton, menuWrap, updateFilterIndicator });
}


function buildFilterColumnHeader(label, menuConfig, entryManagerState) {
    const header = document.createElement('div');
    header.classList.add('stwid--columnHeader');
    const headerTitle = document.createElement('div');
    headerTitle.textContent = label;
    header.append(headerTitle);
    const filterWrap = document.createElement('div');
    filterWrap.classList.add('stwid--columnFilter');
    const { menuWrap, updateFilterIndicator } = buildFilterMenu({ ...menuConfig, entryManagerState });
    filterWrap.append(menuWrap);
    header.append(filterWrap);
    return { header, updateFilterIndicator };
}


export function buildTableHeader({
    entryManagerState,
    applyEntryManagerStrategyFilters,
    applyEntryManagerPositionFilters,
    applyEntryManagerRecursionFilters,
    applyEntryManagerOutletFilters,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilters,
    normalizeStrategyFilters,
    normalizePositionFilters,
    normalizeOutletFilters,
    normalizeAutomationIdFilters,
    normalizeGroupFilters,
    getStrategyOptions,
    getStrategyValues,
    getPositionOptions,
    getPositionValues,
    getOutletOptions,
    getOutletValues,
    getAutomationIdOptions,
    getAutomationIdValues,
    getGroupOptions,
    getGroupValues,
    onFilterChange = ()=>{},
}) {
    const refreshFilterIndicators = {};

    const filterMenuConfigs = {
        strategy:    { stateKey: 'strategy',     stateValuesKey: 'strategyValues',     getOptions: getStrategyOptions,     getValues: getStrategyValues,     normalizeFilters: normalizeStrategyFilters,     applyFilters: applyEntryManagerStrategyFilters },
        position:    { stateKey: 'position',     stateValuesKey: 'positionValues',     getOptions: getPositionOptions,     getValues: getPositionValues,     normalizeFilters: normalizePositionFilters,     applyFilters: applyEntryManagerPositionFilters },
        recursion:   { stateKey: 'recursion',    stateValuesKey: 'recursionValues',    getOptions: ()=>ENTRY_MANAGER_RECURSION_OPTIONS, getValues: null, normalizeFilters: null, applyFilters: applyEntryManagerRecursionFilters },
        outlet:      { stateKey: 'outlet',       stateValuesKey: 'outletValues',       getOptions: getOutletOptions,       getValues: getOutletValues,       normalizeFilters: normalizeOutletFilters,       applyFilters: applyEntryManagerOutletFilters },
        automationId:{ stateKey: 'automationId', stateValuesKey: 'automationIdValues', getOptions: getAutomationIdOptions, getValues: getAutomationIdValues, normalizeFilters: normalizeAutomationIdFilters, applyFilters: applyEntryManagerAutomationIdFilters },
        group:       { stateKey: 'group',        stateValuesKey: 'groupValues',        getOptions: getGroupOptions,        getValues: getGroupValues,        normalizeFilters: normalizeGroupFilters,        applyFilters: applyEntryManagerGroupFilters },
    };

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr'); {
        for (const col of ENTRY_MANAGER_TABLE_COLUMNS) {
            const headerCell = document.createElement('th'); {
                const menuConfig = filterMenuConfigs[col.key];
                if (menuConfig) {
                    const { header, updateFilterIndicator } = buildFilterColumnHeader(col.label, { ...menuConfig, onFilterChange }, entryManagerState);
                    headerCell.append(header);
                    refreshFilterIndicators[col.key] = updateFilterIndicator;
                } else {
                    headerCell.textContent = col.label;
                }
                if (col.key) {
                    headerCell.setAttribute('data-col', col.key);
                    if (ENTRY_MANAGER_NUMBER_COLUMN_KEYS.has(col.key)) {
                        headerCell.classList.add('stwid--orderTable--NumberColumns');
                    }
                }
                headerRow.append(headerCell);
            }
        }
        thead.append(headerRow);
    }

    return {
        thead,
        refreshStrategyFilterIndicator:     refreshFilterIndicators.strategy     ?? (()=>{}),
        refreshPositionFilterIndicator:     refreshFilterIndicators.position     ?? (()=>{}),
        refreshRecursionFilterIndicator:    refreshFilterIndicators.recursion    ?? (()=>{}),
        refreshOutletFilterIndicator:       refreshFilterIndicators.outlet       ?? (()=>{}),
        refreshAutomationIdFilterIndicator: refreshFilterIndicators.automationId ?? (()=>{}),
        refreshGroupFilterIndicator:        refreshFilterIndicators.group        ?? (()=>{}),
    };
}

