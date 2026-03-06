import {
    createMultiselectDropdownCheckbox,
    wireMultiselectDropdown,
} from '../utils.js';
import {
    ENTRY_MANAGER_TABLE_COLUMNS,
    ENTRY_MANAGER_NUMBER_COLUMN_KEYS,
    ENTRY_MANAGER_RECURSION_OPTIONS,
} from '../../shared/constants.js';


function buildFilterMenu({ stateKey, stateValuesKey, getOptions, getValues, normalizeFilters, applyFilters, onFilterChange, entryManagerState }) {
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

    let updateFilterIndicator;
    let updateFilters;

    if (normalizeFilters === null) {
        
        updateFilterIndicator = ()=>{
            const allValues = entryManagerState[stateValuesKey] ?? [];
            if (!allValues.length) return;
            if (!entryManagerState.filters[stateKey].length) {
                entryManagerState.filters[stateKey] = [...allValues];
            }
            const isActive = entryManagerState.filters[stateKey].length !== allValues.length;
            menuButton.classList.toggle('stwid--state-active', isActive);
        };
        updateFilters = ()=>{
            const allValues = entryManagerState[stateValuesKey] ?? [];
            if (!entryManagerState.filters[stateKey].length) {
                entryManagerState.filters[stateKey] = [...allValues];
            }
            updateFilterIndicator();
            applyFilters();
            onFilterChange();
        };
    } else {
        
        updateFilterIndicator = ()=>{
            const allValues = entryManagerState[stateValuesKey].length
                ? entryManagerState[stateValuesKey]
                : getValues();
            const filters = normalizeFilters(entryManagerState.filters[stateKey]);
            entryManagerState.filters[stateKey] = filters.length ? filters : [...allValues];
            const isActive = entryManagerState.filters[stateKey].length !== allValues.length;
            menuButton.classList.toggle('stwid--state-active', isActive);
        };
        updateFilters = ()=>{
            entryManagerState.filters[stateKey] = normalizeFilters(entryManagerState.filters[stateKey]);
            updateFilterIndicator();
            applyFilters();
            onFilterChange();
        };
    }

    const options = getOptions();
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
        inputControl.input.addEventListener('change', ()=>{
            if (inputControl.input.checked) {
                if (!entryManagerState.filters[stateKey].includes(optionData.value)) {
                    entryManagerState.filters[stateKey].push(optionData.value);
                }
            } else {
                entryManagerState.filters[stateKey] = entryManagerState.filters[stateKey]
                    .filter((item)=>item !== optionData.value);
            }
            updateFilters();
        });
        option.append(inputControl.input, inputControl.checkbox);
        const optionLabel = document.createElement('span');
        optionLabel.textContent = optionData.label;
        option.append(optionLabel);
        menu.append(option);
    }

    updateFilterIndicator();
    wireMultiselectDropdown(menu, menuButton, menuWrap);
    menuWrap.append(menu);

    return { menuWrap, updateFilterIndicator };
}


function buildFilterColumnHeader(label, menuConfig, entryManagerState) {
    const header = document.createElement('div');
    header.classList.add('stwid--columnHeader');
    const titleDiv = document.createElement('div');
    titleDiv.textContent = label;
    header.append(titleDiv);
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
    const tr = document.createElement('tr'); {
        for (const col of ENTRY_MANAGER_TABLE_COLUMNS) {
            const th = document.createElement('th'); {
                const menuConfig = filterMenuConfigs[col.key];
                if (menuConfig) {
                    const { header, updateFilterIndicator } = buildFilterColumnHeader(col.label, { ...menuConfig, onFilterChange }, entryManagerState);
                    th.append(header);
                    refreshFilterIndicators[col.key] = updateFilterIndicator;
                } else {
                    th.textContent = col.label;
                }
                if (col.key) {
                    th.setAttribute('data-col', col.key);
                    if (ENTRY_MANAGER_NUMBER_COLUMN_KEYS.has(col.key)) {
                        th.classList.add('stwid--orderTable--NumberColumns');
                    }
                }
                tr.append(th);
            }
        }
        thead.append(tr);
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

