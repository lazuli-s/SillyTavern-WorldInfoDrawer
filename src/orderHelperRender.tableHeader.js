import {
    setTooltip,
    createMultiselectDropdownCheckbox,
    wireMultiselectDropdown,
} from './orderHelperRender.utils.js';
import {
    ORDER_HELPER_TABLE_COLUMNS,
    ORDER_HELPER_NUMBER_COLUMN_KEYS,
    ORDER_HELPER_RECURSION_OPTIONS,
} from './constants.js';

/**
 * Builds the filter button + multiselect dropdown menu for a single column.
 *
 * When `normalizeFilters` is null (recursion mode): reads state values directly from
 * `orderHelperState[stateValuesKey]`, returns early from `updateFilterIndicator` if empty,
 * and resets to all values if `filters[stateKey]` is empty — no normalize step.
 *
 * When `normalizeFilters` is a function (standard mode): calls it to normalize the
 * current filter selection and uses `getValues()` as a live fallback for stateValuesKey.
 *
 * @param {{
 *   stateKey: string,
 *   stateValuesKey: string,
 *   getOptions: function(): Array<{value: string, label: string}>,
 *   getValues: function(): string[] | null,
 *   normalizeFilters: function(string[]): string[] | null,
 *   applyFilters: function(): void,
 *   onFilterChange: function(): void,
 *   orderHelperState: object,
 * }} config
 * @returns {{ menuWrap: HTMLElement, updateFilterIndicator: function }}
 */
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
        // Recursion mode: no normalize function; read state values directly.
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
        // Standard mode: normalize filters and use getValues() as live fallback.
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

/**
 * Builds a `div.stwid--columnHeader` containing the column label and a filter dropdown.
 *
 * @param {string} label - Column header text.
 * @param {object} menuConfig - Config forwarded to `buildFilterMenu` (plus onFilterChange).
 * @param {object} orderHelperState
 * @returns {{ header: HTMLElement, updateFilterIndicator: function }}
 */
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

/**
 * Builds the Order Helper table header (`<thead>`) with 6 multiselect column filter menus.
 *
 * Returns the thead element plus six refresh-indicator callbacks.
 * These callbacks are assigned here (they are the `updateFilterIndicator` functions
 * created inside the outlet, automationId, and group filter menus) and must be passed
 * to buildTableBody so that row-level edits can refresh the header filter button state.
 *
 * @param {{
 *   orderHelperState: object,
 *   applyOrderHelperStrategyFilters: function,
 *   applyOrderHelperPositionFilters: function,
 *   applyOrderHelperRecursionFilters: function,
 *   applyOrderHelperOutletFilters: function,
 *   applyOrderHelperAutomationIdFilters: function,
 *   applyOrderHelperGroupFilters: function,
 *   normalizeStrategyFilters: function,
 *   normalizePositionFilters: function,
 *   normalizeOutletFilters: function,
 *   normalizeAutomationIdFilters: function,
 *   normalizeGroupFilters: function,
 *   getStrategyOptions: function,
 *   getStrategyValues: function,
 *   getPositionOptions: function,
 *   getPositionValues: function,
 *   getOutletOptions: function,
 *   getOutletValues: function,
 *   getAutomationIdOptions: function,
 *   getAutomationIdValues: function,
 *   getGroupOptions: function,
 *   getGroupValues: function,
 *   onFilterChange: function,
 * }} ctx
 * @returns {{
 *   thead: HTMLElement,
 *   refreshStrategyFilterIndicator: function,
 *   refreshPositionFilterIndicator: function,
 *   refreshRecursionFilterIndicator: function,
 *   refreshOutletFilterIndicator: function,
 *   refreshAutomationIdFilterIndicator: function,
 *   refreshGroupFilterIndicator: function,
 * }}
 */
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
