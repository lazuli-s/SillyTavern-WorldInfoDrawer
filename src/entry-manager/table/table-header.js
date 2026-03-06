import {
    createMultiselectDropdownCheckbox,
    wireMultiselectDropdown,
} from '../utils.js';
import {
    ORDER_HELPER_TABLE_COLUMNS,
    ORDER_HELPER_NUMBER_COLUMN_KEYS,
    ORDER_HELPER_RECURSION_OPTIONS,
} from '../../shared/constants.js';


function buildFilterMenu({ stateKey, stateValuesKey, getOptions, getValues, normalizeFilters, applyFilters, onFilterChange, orderHelperState }) {
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
            const allValues = orderHelperState[stateValuesKey] ?? [];
            if (!allValues.length) return;
            if (!orderHelperState.filters[stateKey].length) {
                orderHelperState.filters[stateKey] = [...allValues];
            }
            const isActive = orderHelperState.filters[stateKey].length !== allValues.length;
            menuButton.classList.toggle('stwid--state-active', isActive);
        };
        updateFilters = ()=>{
            const allValues = orderHelperState[stateValuesKey] ?? [];
            if (!orderHelperState.filters[stateKey].length) {
                orderHelperState.filters[stateKey] = [...allValues];
            }
            updateFilterIndicator();
            applyFilters();
            onFilterChange();
        };
    } else {
        
        updateFilterIndicator = ()=>{
            const allValues = orderHelperState[stateValuesKey].length
                ? orderHelperState[stateValuesKey]
                : getValues();
            const filters = normalizeFilters(orderHelperState.filters[stateKey]);
            orderHelperState.filters[stateKey] = filters.length ? filters : [...allValues];
            const isActive = orderHelperState.filters[stateKey].length !== allValues.length;
            menuButton.classList.toggle('stwid--state-active', isActive);
        };
        updateFilters = ()=>{
            orderHelperState.filters[stateKey] = normalizeFilters(orderHelperState.filters[stateKey]);
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
            orderHelperState.filters[stateKey].includes(optionData.value),
        );
        inputControl.input.addEventListener('change', ()=>{
            if (inputControl.input.checked) {
                if (!orderHelperState.filters[stateKey].includes(optionData.value)) {
                    orderHelperState.filters[stateKey].push(optionData.value);
                }
            } else {
                orderHelperState.filters[stateKey] = orderHelperState.filters[stateKey]
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


function buildFilterColumnHeader(label, menuConfig, orderHelperState) {
    const header = document.createElement('div');
    header.classList.add('stwid--columnHeader');
    const titleDiv = document.createElement('div');
    titleDiv.textContent = label;
    header.append(titleDiv);
    const filterWrap = document.createElement('div');
    filterWrap.classList.add('stwid--columnFilter');
    const { menuWrap, updateFilterIndicator } = buildFilterMenu({ ...menuConfig, orderHelperState });
    filterWrap.append(menuWrap);
    header.append(filterWrap);
    return { header, updateFilterIndicator };
}


export function buildTableHeader({
    orderHelperState,
    applyOrderHelperStrategyFilters,
    applyOrderHelperPositionFilters,
    applyOrderHelperRecursionFilters,
    applyOrderHelperOutletFilters,
    applyOrderHelperAutomationIdFilters,
    applyOrderHelperGroupFilters,
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
        strategy:    { stateKey: 'strategy',     stateValuesKey: 'strategyValues',     getOptions: getStrategyOptions,     getValues: getStrategyValues,     normalizeFilters: normalizeStrategyFilters,     applyFilters: applyOrderHelperStrategyFilters },
        position:    { stateKey: 'position',     stateValuesKey: 'positionValues',     getOptions: getPositionOptions,     getValues: getPositionValues,     normalizeFilters: normalizePositionFilters,     applyFilters: applyOrderHelperPositionFilters },
        recursion:   { stateKey: 'recursion',    stateValuesKey: 'recursionValues',    getOptions: ()=>ORDER_HELPER_RECURSION_OPTIONS, getValues: null, normalizeFilters: null, applyFilters: applyOrderHelperRecursionFilters },
        outlet:      { stateKey: 'outlet',       stateValuesKey: 'outletValues',       getOptions: getOutletOptions,       getValues: getOutletValues,       normalizeFilters: normalizeOutletFilters,       applyFilters: applyOrderHelperOutletFilters },
        automationId:{ stateKey: 'automationId', stateValuesKey: 'automationIdValues', getOptions: getAutomationIdOptions, getValues: getAutomationIdValues, normalizeFilters: normalizeAutomationIdFilters, applyFilters: applyOrderHelperAutomationIdFilters },
        group:       { stateKey: 'group',        stateValuesKey: 'groupValues',        getOptions: getGroupOptions,        getValues: getGroupValues,        normalizeFilters: normalizeGroupFilters,        applyFilters: applyOrderHelperGroupFilters },
    };

    const thead = document.createElement('thead');
    const tr = document.createElement('tr'); {
        for (const col of ORDER_HELPER_TABLE_COLUMNS) {
            const th = document.createElement('th'); {
                const menuConfig = filterMenuConfigs[col.key];
                if (menuConfig) {
                    const { header, updateFilterIndicator } = buildFilterColumnHeader(col.label, { ...menuConfig, onFilterChange }, orderHelperState);
                    th.append(header);
                    refreshFilterIndicators[col.key] = updateFilterIndicator;
                } else {
                    th.textContent = col.label;
                }
                if (col.key) {
                    th.setAttribute('data-col', col.key);
                    if (ORDER_HELPER_NUMBER_COLUMN_KEYS.has(col.key)) {
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

