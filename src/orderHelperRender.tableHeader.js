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
 * Builds the Order Helper table header (`<thead>`) with 6 multiselect column filter menus.
 *
 * Returns the thead element plus three refresh-indicator callbacks.
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
 * }} ctx
 * @returns {{
 *   thead: HTMLElement,
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
}) {
    // These are assigned inside the respective filter menu blocks and returned
    // so the orchestrator can pass them to buildTableBody.
    let refreshOutletFilterIndicator = ()=>{};
    let refreshAutomationIdFilterIndicator = ()=>{};
    let refreshGroupFilterIndicator = ()=>{};

    const thead = document.createElement('thead');
    const tr = document.createElement('tr'); {
        for (const col of ORDER_HELPER_TABLE_COLUMNS) {
            const th = document.createElement('th'); {
                if (col.key === 'strategy') {
                    const header = document.createElement('div'); {
                        header.classList.add('stwid--columnHeader');
                        const title = document.createElement('div'); {
                            title.textContent = col.label;
                            header.append(title);
                        }
                        const filterWrap = document.createElement('div'); {
                            filterWrap.classList.add('stwid--columnFilter');
                            const menuWrap = document.createElement('div'); {
                                menuWrap.classList.add('stwid--multiselectDropdownWrap');
                                const menuButton = document.createElement('div'); {
                                    menuButton.classList.add(
                                        'menu_button',
                                        'fa-solid',
                                        'fa-fw',
                                        'fa-filter',
                                        'stwid--orderFilterButton',
                                        'stwid--multiselectDropdownButton',
                                    );
                                    menuWrap.append(menuButton);
                                }
                                const menu = document.createElement('div'); {
                                    menu.classList.add('stwid--multiselectDropdownMenu');
                                    const updateFilterIndicator = ()=>{
                                        const allValues = orderHelperState.strategyValues.length
                                            ? orderHelperState.strategyValues
                                            : getStrategyValues();
                                        const filters = normalizeStrategyFilters(orderHelperState.filters.strategy);
                                        orderHelperState.filters.strategy = filters.length ? filters : [...allValues];
                                        const isActive = orderHelperState.filters.strategy.length !== allValues.length;
                                        menuButton.classList.toggle('stwid--active', isActive);
                                    };
                                    const updateStrategyFilters = ()=>{
                                        // Phase 2: update state → update indicator → apply filter
                                        orderHelperState.filters.strategy = normalizeStrategyFilters(orderHelperState.filters.strategy);
                                        updateFilterIndicator();
                                        applyOrderHelperStrategyFilters();
                                    };
                                    const strategyOptions = getStrategyOptions();
                                    if (!strategyOptions.length) {
                                        menu.classList.add('stwid--empty');
                                        menu.textContent = 'No strategies available.';
                                    }
                                    for (const optionData of strategyOptions) {
                                        const option = document.createElement('label'); {
                                            option.classList.add('stwid--multiselectDropdownOption');
                                            const inputControl = createMultiselectDropdownCheckbox(
                                                orderHelperState.filters.strategy.includes(optionData.value),
                                            );
                                            inputControl.input.addEventListener('change', ()=>{
                                                if (inputControl.input.checked) {
                                                    if (!orderHelperState.filters.strategy.includes(optionData.value)) {
                                                        orderHelperState.filters.strategy.push(optionData.value);
                                                    }
                                                } else {
                                                    orderHelperState.filters.strategy = orderHelperState.filters.strategy
                                                        .filter((item)=>item !== optionData.value);
                                                }
                                                updateStrategyFilters();
                                            });
                                            option.append(inputControl.input);
                                            option.append(inputControl.checkbox);
                                            const optionLabel = document.createElement('span');
                                            optionLabel.textContent = optionData.label;
                                            option.append(optionLabel);
                                            menu.append(option);
                                        }
                                    }
                                    updateFilterIndicator();
                                    wireMultiselectDropdown(menu, menuButton, menuWrap);
                                    menuWrap.append(menu);
                                }
                                filterWrap.append(menuWrap);
                            }
                            header.append(filterWrap);
                        }
                        th.append(header);
                    }
                } else if (col.key === 'position') {
                    const header = document.createElement('div'); {
                        header.classList.add('stwid--columnHeader');
                        const title = document.createElement('div'); {
                            title.textContent = col.label;
                            header.append(title);
                        }
                        const filterWrap = document.createElement('div'); {
                            filterWrap.classList.add('stwid--columnFilter');
                            const menuWrap = document.createElement('div'); {
                                menuWrap.classList.add('stwid--multiselectDropdownWrap');
                                const menuButton = document.createElement('div'); {
                                    menuButton.classList.add(
                                        'menu_button',
                                        'fa-solid',
                                        'fa-fw',
                                        'fa-filter',
                                        'stwid--orderFilterButton',
                                        'stwid--multiselectDropdownButton',
                                    );
                                    menuWrap.append(menuButton);
                                }
                                const menu = document.createElement('div'); {
                                    menu.classList.add('stwid--multiselectDropdownMenu');
                                    const updateFilterIndicator = ()=>{
                                        const allValues = orderHelperState.positionValues.length
                                            ? orderHelperState.positionValues
                                            : getPositionValues();
                                        const filters = normalizePositionFilters(orderHelperState.filters.position);
                                        orderHelperState.filters.position = filters.length ? filters : [...allValues];
                                        const isActive = orderHelperState.filters.position.length !== allValues.length;
                                        menuButton.classList.toggle('stwid--active', isActive);
                                    };
                                    const updatePositionFilters = ()=>{
                                        // Phase 2: update state → update indicator → apply filter
                                        orderHelperState.filters.position = normalizePositionFilters(orderHelperState.filters.position);
                                        updateFilterIndicator();
                                        applyOrderHelperPositionFilters();
                                    };
                                    const positionOptions = getPositionOptions();
                                    if (!positionOptions.length) {
                                        menu.classList.add('stwid--empty');
                                        menu.textContent = 'No positions available.';
                                    }
                                    for (const optionData of positionOptions) {
                                        const option = document.createElement('label'); {
                                            option.classList.add('stwid--multiselectDropdownOption');
                                            const inputControl = createMultiselectDropdownCheckbox(
                                                orderHelperState.filters.position.includes(optionData.value),
                                            );
                                            inputControl.input.addEventListener('change', ()=>{
                                                if (inputControl.input.checked) {
                                                    if (!orderHelperState.filters.position.includes(optionData.value)) {
                                                        orderHelperState.filters.position.push(optionData.value);
                                                    }
                                                } else {
                                                    orderHelperState.filters.position = orderHelperState.filters.position
                                                        .filter((item)=>item !== optionData.value);
                                                }
                                                updatePositionFilters();
                                            });
                                            option.append(inputControl.input);
                                            option.append(inputControl.checkbox);
                                            const optionLabel = document.createElement('span');
                                            optionLabel.textContent = optionData.label;
                                            option.append(optionLabel);
                                            menu.append(option);
                                        }
                                    }
                                    updateFilterIndicator();
                                    wireMultiselectDropdown(menu, menuButton, menuWrap);
                                    menuWrap.append(menu);
                                }
                                filterWrap.append(menuWrap);
                            }
                            header.append(filterWrap);
                        }
                        th.append(header);
                    }
                } else if (col.key === 'recursion') {
                    const header = document.createElement('div'); {
                        header.classList.add('stwid--columnHeader');
                        const title = document.createElement('div'); {
                            title.textContent = col.label;
                            header.append(title);
                        }
                        const filterWrap = document.createElement('div'); {
                            filterWrap.classList.add('stwid--columnFilter');
                            const menuWrap = document.createElement('div'); {
                                menuWrap.classList.add('stwid--multiselectDropdownWrap');
                                const menuButton = document.createElement('div'); {
                                    menuButton.classList.add(
                                        'menu_button',
                                        'fa-solid',
                                        'fa-fw',
                                        'fa-filter',
                                        'stwid--orderFilterButton',
                                        'stwid--multiselectDropdownButton',
                                    );
                                    menuWrap.append(menuButton);
                                }
                                const menu = document.createElement('div'); {
                                    menu.classList.add('stwid--multiselectDropdownMenu');
                                    const updateFilterIndicator = ()=>{
                                        const allValues = orderHelperState.recursionValues ?? [];
                                        if (!allValues.length) return;
                                        if (!orderHelperState.filters.recursion.length) {
                                            orderHelperState.filters.recursion = [...allValues];
                                        }
                                        const isActive = orderHelperState.filters.recursion.length !== allValues.length;
                                        menuButton.classList.toggle('stwid--active', isActive);
                                    };
                                    const updateRecursionFilters = ()=>{
                                        // Phase 2: update state → update indicator → apply filter
                                        const allValues = orderHelperState.recursionValues ?? [];
                                        if (!orderHelperState.filters.recursion.length) {
                                            orderHelperState.filters.recursion = [...allValues];
                                        }
                                        updateFilterIndicator();
                                        applyOrderHelperRecursionFilters();
                                    };
                                    // Phase 3: use ORDER_HELPER_RECURSION_OPTIONS (shared with row cell builder)
                                    for (const optionData of ORDER_HELPER_RECURSION_OPTIONS) {
                                        const option = document.createElement('label'); {
                                            option.classList.add('stwid--multiselectDropdownOption');
                                            const inputControl = createMultiselectDropdownCheckbox(
                                                orderHelperState.filters.recursion.includes(optionData.value),
                                            );
                                            inputControl.input.addEventListener('change', ()=>{
                                                if (inputControl.input.checked) {
                                                    if (!orderHelperState.filters.recursion.includes(optionData.value)) {
                                                        orderHelperState.filters.recursion.push(optionData.value);
                                                    }
                                                } else {
                                                    orderHelperState.filters.recursion = orderHelperState.filters.recursion
                                                        .filter((item)=>item !== optionData.value);
                                                }
                                                updateRecursionFilters();
                                            });
                                            option.append(inputControl.input);
                                            option.append(inputControl.checkbox);
                                            const optionLabel = document.createElement('span');
                                            optionLabel.textContent = optionData.label;
                                            option.append(optionLabel);
                                            menu.append(option);
                                        }
                                    }
                                    updateFilterIndicator();
                                    wireMultiselectDropdown(menu, menuButton, menuWrap);
                                    menuWrap.append(menu);
                                }
                                filterWrap.append(menuWrap);
                            }
                            header.append(filterWrap);
                        }
                        th.append(header);
                    }
                } else {
                    if (col.key === 'outlet') {
                        const header = document.createElement('div'); {
                            header.classList.add('stwid--columnHeader');
                            const title = document.createElement('div'); {
                                title.textContent = col.label;
                                header.append(title);
                            }
                            const filterWrap = document.createElement('div'); {
                                filterWrap.classList.add('stwid--columnFilter');
                                const menuWrap = document.createElement('div'); {
                                    menuWrap.classList.add('stwid--multiselectDropdownWrap');
                                    const menuButton = document.createElement('div'); {
                                        menuButton.classList.add(
                                            'menu_button',
                                            'fa-solid',
                                            'fa-fw',
                                            'fa-filter',
                                            'stwid--orderFilterButton',
                                            'stwid--multiselectDropdownButton',
                                        );
                                        menuWrap.append(menuButton);
                                    }
                                    const menu = document.createElement('div'); {
                                        menu.classList.add('stwid--multiselectDropdownMenu');
                                        const updateFilterIndicator = ()=>{
                                            const allValues = orderHelperState.outletValues.length
                                                ? orderHelperState.outletValues
                                                : getOutletValues();
                                            const filters = normalizeOutletFilters(orderHelperState.filters.outlet);
                                            orderHelperState.filters.outlet = filters.length ? filters : [...allValues];
                                            const isActive = orderHelperState.filters.outlet.length !== allValues.length;
                                            menuButton.classList.toggle('stwid--active', isActive);
                                        };
                                        // Phase 2: assign the late-bound indicator callback so row-level
                                        // outlet edits can refresh the header filter button state.
                                        refreshOutletFilterIndicator = updateFilterIndicator;
                                        const updateOutletFilters = ()=>{
                                            // Phase 2: update state → update indicator → apply filter
                                            orderHelperState.filters.outlet = normalizeOutletFilters(orderHelperState.filters.outlet);
                                            updateFilterIndicator();
                                            applyOrderHelperOutletFilters();
                                        };
                                        const outletOptions = getOutletOptions();
                                        for (const optionData of outletOptions) {
                                            const option = document.createElement('label'); {
                                                option.classList.add('stwid--multiselectDropdownOption');
                                                const inputControl = createMultiselectDropdownCheckbox(
                                                    orderHelperState.filters.outlet.includes(optionData.value),
                                                );
                                                inputControl.input.addEventListener('change', ()=>{
                                                    if (inputControl.input.checked) {
                                                        if (!orderHelperState.filters.outlet.includes(optionData.value)) {
                                                            orderHelperState.filters.outlet.push(optionData.value);
                                                        }
                                                    } else {
                                                        orderHelperState.filters.outlet = orderHelperState.filters.outlet
                                                            .filter((item)=>item !== optionData.value);
                                                    }
                                                    updateOutletFilters();
                                                });
                                                option.append(inputControl.input);
                                                option.append(inputControl.checkbox);
                                                const optionLabel = document.createElement('span');
                                                optionLabel.textContent = optionData.label;
                                                option.append(optionLabel);
                                                menu.append(option);
                                            }
                                        }
                                        updateFilterIndicator();
                                        wireMultiselectDropdown(menu, menuButton, menuWrap);
                                        menuWrap.append(menu);
                                    }
                                    filterWrap.append(menuWrap);
                                }
                                header.append(filterWrap);
                            }
                            th.append(header);
                        }
                    } else if (col.key === 'automationId') {
                        const header = document.createElement('div'); {
                            header.classList.add('stwid--columnHeader');
                            const title = document.createElement('div'); {
                                title.textContent = col.label;
                                header.append(title);
                            }
                            const filterWrap = document.createElement('div'); {
                                filterWrap.classList.add('stwid--columnFilter');
                                const menuWrap = document.createElement('div'); {
                                    menuWrap.classList.add('stwid--multiselectDropdownWrap');
                                    const menuButton = document.createElement('div'); {
                                        menuButton.classList.add(
                                            'menu_button',
                                            'fa-solid',
                                            'fa-fw',
                                            'fa-filter',
                                            'stwid--orderFilterButton',
                                            'stwid--multiselectDropdownButton',
                                        );
                                        menuWrap.append(menuButton);
                                    }
                                    const menu = document.createElement('div'); {
                                        menu.classList.add('stwid--multiselectDropdownMenu');
                                        const updateFilterIndicator = ()=>{
                                            const allValues = orderHelperState.automationIdValues.length
                                                ? orderHelperState.automationIdValues
                                                : getAutomationIdValues();
                                            const filters = normalizeAutomationIdFilters(orderHelperState.filters.automationId);
                                            orderHelperState.filters.automationId = filters.length ? filters : [...allValues];
                                            const isActive = orderHelperState.filters.automationId.length !== allValues.length;
                                            menuButton.classList.toggle('stwid--active', isActive);
                                        };
                                        // Phase 2: assign the late-bound indicator callback so row-level
                                        // automationId edits can refresh the header filter button state.
                                        refreshAutomationIdFilterIndicator = updateFilterIndicator;
                                        const updateAutomationIdFilters = ()=>{
                                            // Phase 2: update state → update indicator → apply filter
                                            orderHelperState.filters.automationId = normalizeAutomationIdFilters(orderHelperState.filters.automationId);
                                            updateFilterIndicator();
                                            applyOrderHelperAutomationIdFilters();
                                        };
                                        const automationIdOptions = getAutomationIdOptions();
                                        for (const optionData of automationIdOptions) {
                                            const option = document.createElement('label'); {
                                                option.classList.add('stwid--multiselectDropdownOption');
                                                const inputControl = createMultiselectDropdownCheckbox(
                                                    orderHelperState.filters.automationId.includes(optionData.value),
                                                );
                                                inputControl.input.addEventListener('change', ()=>{
                                                    if (inputControl.input.checked) {
                                                        if (!orderHelperState.filters.automationId.includes(optionData.value)) {
                                                            orderHelperState.filters.automationId.push(optionData.value);
                                                        }
                                                    } else {
                                                        orderHelperState.filters.automationId = orderHelperState.filters.automationId
                                                            .filter((item)=>item !== optionData.value);
                                                    }
                                                    updateAutomationIdFilters();
                                                });
                                                option.append(inputControl.input);
                                                option.append(inputControl.checkbox);
                                                const optionLabel = document.createElement('span');
                                                optionLabel.textContent = optionData.label;
                                                option.append(optionLabel);
                                                menu.append(option);
                                            }
                                        }
                                        updateFilterIndicator();
                                        wireMultiselectDropdown(menu, menuButton, menuWrap);
                                        menuWrap.append(menu);
                                    }
                                    filterWrap.append(menuWrap);
                                }
                                header.append(filterWrap);
                            }
                            th.append(header);
                        }
                    } else if (col.key === 'group') {
                        const header = document.createElement('div'); {
                            header.classList.add('stwid--columnHeader');
                            const title = document.createElement('div'); {
                                title.textContent = col.label;
                                header.append(title);
                            }
                            const filterWrap = document.createElement('div'); {
                                filterWrap.classList.add('stwid--columnFilter');
                                const menuWrap = document.createElement('div'); {
                                    menuWrap.classList.add('stwid--multiselectDropdownWrap');
                                    const menuButton = document.createElement('div'); {
                                        menuButton.classList.add(
                                            'menu_button',
                                            'fa-solid',
                                            'fa-fw',
                                            'fa-filter',
                                            'stwid--orderFilterButton',
                                            'stwid--multiselectDropdownButton',
                                        );
                                        menuWrap.append(menuButton);
                                    }
                                    const menu = document.createElement('div'); {
                                        menu.classList.add('stwid--multiselectDropdownMenu');
                                        const updateFilterIndicator = ()=>{
                                            const allValues = orderHelperState.groupValues.length
                                                ? orderHelperState.groupValues
                                                : getGroupValues();
                                            const filters = normalizeGroupFilters(orderHelperState.filters.group);
                                            orderHelperState.filters.group = filters.length ? filters : [...allValues];
                                            const isActive = orderHelperState.filters.group.length !== allValues.length;
                                            menuButton.classList.toggle('stwid--active', isActive);
                                        };
                                        // Phase 2: assign the late-bound indicator callback so row-level
                                        // group edits can refresh the header filter button state.
                                        refreshGroupFilterIndicator = updateFilterIndicator;
                                        const updateGroupFilters = ()=>{
                                            // Phase 2: update state → update indicator → apply filter
                                            orderHelperState.filters.group = normalizeGroupFilters(orderHelperState.filters.group);
                                            updateFilterIndicator();
                                            applyOrderHelperGroupFilters();
                                        };
                                        const groupOptions = getGroupOptions();
                                        for (const optionData of groupOptions) {
                                            const option = document.createElement('label'); {
                                                option.classList.add('stwid--multiselectDropdownOption');
                                                const inputControl = createMultiselectDropdownCheckbox(
                                                    orderHelperState.filters.group.includes(optionData.value),
                                                );
                                                inputControl.input.addEventListener('change', ()=>{
                                                    if (inputControl.input.checked) {
                                                        if (!orderHelperState.filters.group.includes(optionData.value)) {
                                                            orderHelperState.filters.group.push(optionData.value);
                                                        }
                                                    } else {
                                                        orderHelperState.filters.group = orderHelperState.filters.group
                                                            .filter((item)=>item !== optionData.value);
                                                    }
                                                    updateGroupFilters();
                                                });
                                                option.append(inputControl.input);
                                                option.append(inputControl.checkbox);
                                                const optionLabel = document.createElement('span');
                                                optionLabel.textContent = optionData.label;
                                                option.append(optionLabel);
                                                menu.append(option);
                                            }
                                        }
                                        updateFilterIndicator();
                                        wireMultiselectDropdown(menu, menuButton, menuWrap);
                                        menuWrap.append(menu);
                                    }
                                    filterWrap.append(menuWrap);
                                }
                                header.append(filterWrap);
                            }
                            th.append(header);
                        }
                    } else {
                        th.textContent = col.label;
                    }
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

    return { thead, refreshOutletFilterIndicator, refreshAutomationIdFilterIndicator, refreshGroupFilterIndicator };
}
