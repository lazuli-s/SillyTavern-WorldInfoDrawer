import {
    MULTISELECT_DROPDOWN_CLOSE_HANDLER,
    closeOpenMultiselectDropdownMenus,
    setTooltip,
    createMultiselectDropdownCheckbox,
    wireMultiselectDropdown,
} from './bulk-editor.utils.js';
import { wrapRowContent } from './bulk-editor.action-bar.helpers.js';
import { ORDER_HELPER_TOGGLE_COLUMNS, ORDER_HELPER_RECURSION_OPTIONS } from '../../shared/constants.js';

function createActionThinContainer(labelText, hintText) {
    const container = document.createElement('div');
    container.classList.add('stwid--thinContainer');

    const containerLabel = document.createElement('div');
    containerLabel.classList.add('stwid--thinContainerLabel');
    containerLabel.textContent = labelText;

    const containerHint = document.createElement('i');
    containerHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
    setTooltip(containerHint, hintText);
    containerLabel.append(containerHint);

    container.append(containerLabel);
    return container;
}

function makeClearFilterHandler(key, getAllValues, applyFn, stateRef, indicatorRef, refreshFn) {
    return ()=>{
        stateRef.filters[key] = [...getAllValues()];
        applyFn();
        indicatorRef?.();
        refreshFn();
    };
}


function buildColumnDropdownButton(hint) {
    const menuButton = document.createElement('div');
    menuButton.classList.add('menu_button', 'stwid--multiselectDropdownButton');
    menuButton.textContent = 'Select';
    setTooltip(menuButton, hint);

    const caret = document.createElement('i');
    caret.classList.add('fa-solid', 'fa-fw', 'fa-caret-down');
    menuButton.append(caret);
    return menuButton;
}


function buildColumnCheckboxOptions(menu, columns, orderHelperState, columnInputs, onColumnChange) {
    for (const column of columns) {
        const option = document.createElement('label');
        option.classList.add('stwid--multiselectDropdownOption', 'stwid--menuItem');
        const inputControl = createMultiselectDropdownCheckbox(Boolean(orderHelperState.columns[column.key]));
        columnInputs.set(column.key, inputControl);
        inputControl.input.addEventListener('change', ()=>onColumnChange(column, inputControl));
        option.append(inputControl.input);
        option.append(inputControl.checkbox);
        const optionLabel = document.createElement('span');
        optionLabel.textContent = column.label;
        option.append(optionLabel);
        menu.append(option);
    }
}

function buildColumnVisibilityDropdown({
    body,
    orderHelperState,
    ORDER_HELPER_COLUMNS_STORAGE_KEY,
    ORDER_HELPER_DEFAULT_COLUMNS,
    applyOrderHelperColumnVisibility,
}) {
    const columnVisibilityContainer = createActionThinContainer('Columns', 'Choose which columns are visible');
    const columnVisibilityWrap = document.createElement('div');
    columnVisibilityWrap.classList.add('stwid--columnVisibility');

    const menuWrap = document.createElement('div');
    menuWrap.classList.add('stwid--multiselectDropdownWrap');
    const menuButton = buildColumnDropdownButton('Choose which columns are visible');
    menuWrap.append(menuButton);

    const menu = document.createElement('div');
    menu.classList.add('stwid--multiselectDropdownMenu', 'stwid--menu');
    const columnInputs = new Map();
    const mainColumnDefaults = Object.fromEntries(
        Object.entries(ORDER_HELPER_DEFAULT_COLUMNS)
            .map(([key, value])=>[key, Boolean(value)]),
    );
    const setColumnVisibility = (overrides)=>{
        for (const column of ORDER_HELPER_TOGGLE_COLUMNS) {
            const nextValue = Boolean(overrides[column.key]);
            orderHelperState.columns[column.key] = nextValue;
            const inputControl = columnInputs.get(column.key);
            if (inputControl) inputControl.setChecked(nextValue);
        }
        localStorage.setItem(
            ORDER_HELPER_COLUMNS_STORAGE_KEY,
            JSON.stringify(orderHelperState.columns),
        );
        applyOrderHelperColumnVisibility(body);

        const closeMenu = menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
        if (typeof closeMenu === 'function') closeMenu();
    };
    const addColumnAction = ({ label, icon, onClick })=>{
        const action = document.createElement('div');
        action.classList.add('stwid--multiselectDropdownOption', 'stwid--menuItem');
        action.style.fontWeight = 'bold';
        const iconEl = document.createElement('i');
        iconEl.classList.add('fa-solid', 'fa-fw', icon, 'stwid--multiselectDropdownOptionIcon');
        action.append(iconEl);
        const labelText = document.createElement('span');
        labelText.textContent = label;
        action.append(labelText);
        action.addEventListener('click', onClick);
        menu.append(action);
    };

    addColumnAction({
        label: 'SELECT ALL',
        icon: 'fa-check-double',
        onClick: ()=>setColumnVisibility(
            Object.fromEntries(ORDER_HELPER_TOGGLE_COLUMNS.map((column)=>[column.key, true])),
        ),
    });
    addColumnAction({
        label: 'MAIN COLUMNS',
        icon: 'fa-table-columns',
        onClick: ()=>setColumnVisibility(mainColumnDefaults),
    });
    buildColumnCheckboxOptions(
        menu,
        ORDER_HELPER_TOGGLE_COLUMNS,
        orderHelperState,
        columnInputs,
        (column, inputControl)=>{
            orderHelperState.columns[column.key] = inputControl.input.checked;
            localStorage.setItem(
                ORDER_HELPER_COLUMNS_STORAGE_KEY,
                JSON.stringify(orderHelperState.columns),
            );
            applyOrderHelperColumnVisibility(body);
        },
    );
    wireMultiselectDropdown(menu, menuButton, menuWrap);
    menuWrap.append(menu);
    columnVisibilityWrap.append(menuWrap);
    columnVisibilityContainer.append(columnVisibilityWrap);
    return columnVisibilityContainer;
}


function buildSortSelector({
    dom,
    orderHelperState,
    appendSortOptions,
    setOrderHelperSort,
    SORT,
    ensureCustomDisplayIndex,
    saveWorldInfo,
    buildSavePayload,
    applyOrderHelperSortToDom,
}) {
    const tableSortContainer = createActionThinContainer('Table Sorting', 'Sort rows in the table');
    const sortWrap = document.createElement('label');
    sortWrap.classList.add('stwid--table-sort');
    setTooltip(sortWrap, 'Sort rows in the table');
    const sortSel = document.createElement('select');
    sortSel.classList.add('text_pole', 'stwid--smallSelectTextPole');
    setTooltip(sortSel, 'Sort rows in the table');
    dom.order.sortSelect = sortSel;
    appendSortOptions(sortSel, orderHelperState.sort, orderHelperState.direction);
    sortSel.addEventListener('change', async()=>{
        const value = JSON.parse(sortSel.value);
        setOrderHelperSort(value.sort, value.direction);
        if (value.sort === SORT.CUSTOM) {
            const updatedBooks = ensureCustomDisplayIndex(orderHelperState.book);
            for (const bookName of updatedBooks) {
                await saveWorldInfo(bookName, buildSavePayload(bookName), true);
            }
        }
        applyOrderHelperSortToDom();
    });
    sortWrap.append(sortSel);
    tableSortContainer.append(sortWrap);
    return { tableSortContainer, sortSel };
}


function buildFilterChipDisplay({
    orderHelperState,
    getStrategyValues,
    getPositionValues,
    getOutletValues,
    getAutomationIdValues,
    getGroupValues,
    clearFilterHandlers,
    FILTER_KEY_LABELS,
    getFilterValueLabels,
}) {
    const activeFiltersEl = document.createElement('div');
    activeFiltersEl.classList.add('stwid--activeFilters');
    activeFiltersEl.style.display = 'none';
    const activeFiltersLabel = document.createElement('span');
    activeFiltersLabel.textContent = 'Active filters:';
    activeFiltersEl.append(activeFiltersLabel);
    const chipContainer = document.createElement('div');
    chipContainer.classList.add('stwid--filterChipContainer');
    activeFiltersEl.append(chipContainer);

    const refresh = ()=>{
        chipContainer.innerHTML = '';
        const filters = orderHelperState.filters;
        const filterConfigs = [
            { key: 'strategy', allValues: orderHelperState.strategyValues.length ? orderHelperState.strategyValues : getStrategyValues() },
            { key: 'position', allValues: orderHelperState.positionValues.length ? orderHelperState.positionValues : getPositionValues() },
            { key: 'recursion', allValues: orderHelperState.recursionValues ?? [] },
            { key: 'outlet', allValues: orderHelperState.outletValues.length ? orderHelperState.outletValues : getOutletValues() },
            { key: 'automationId', allValues: orderHelperState.automationIdValues.length ? orderHelperState.automationIdValues : getAutomationIdValues() },
            { key: 'group', allValues: orderHelperState.groupValues.length ? orderHelperState.groupValues : getGroupValues() },
        ];

        let hasActiveFilter = false;
        for (const { key, allValues } of filterConfigs) {
            const selected = filters[key] ?? [];
            if (!allValues.length) continue;
            if (selected.length >= allValues.length) continue;
            hasActiveFilter = true;

            const chip = document.createElement('div');
            chip.classList.add('stwid--filterChip');

            const chipLabel = document.createElement('span');
            const headerName = FILTER_KEY_LABELS[key] ?? key;
            const valueLabels = getFilterValueLabels(key, selected);
            chipLabel.textContent = `${headerName}: ${valueLabels.join(', ')}`;
            chip.append(chipLabel);

            const removeBtn = document.createElement('button');
            removeBtn.classList.add('stwid--chipRemove');
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', clearFilterHandlers[key]);
            chip.append(removeBtn);

            chipContainer.append(chip);
        }

        activeFiltersEl.style.display = hasActiveFilter ? '' : 'none';
    };

    return { activeFiltersEl, chipContainer, refresh };
}


export function buildVisibilityRow({
    body,
    orderHelperState,
    dom,
    ORDER_HELPER_HIDE_KEYS_STORAGE_KEY,
    ORDER_HELPER_COLUMNS_STORAGE_KEY,
    ORDER_HELPER_DEFAULT_COLUMNS,
    applyOrderHelperColumnVisibility,
    clearOrderHelperScriptFilters,
    setOrderHelperSort,
    applyOrderHelperSortToDom,
    ensureCustomDisplayIndex,
    saveWorldInfo,
    buildSavePayload,
    appendSortOptions,
    getOrderHelperEntries,
    updateOrderHelperPreview,
    SORT,
    applyOrderHelperStrategyFilters,
    applyOrderHelperPositionFilters,
    applyOrderHelperRecursionFilters,
    applyOrderHelperOutletFilters,
    applyOrderHelperAutomationIdFilters,
    applyOrderHelperGroupFilters,
    getStrategyOptions,
    getPositionOptions,
    getOutletOptions,
    getAutomationIdOptions,
    getGroupOptions,
    getStrategyValues,
    getPositionValues,
    getOutletValues,
    getAutomationIdValues,
    getGroupValues,
    filterIndicatorRefs,
    initialCollapsed = false,
}) {
    const row = document.createElement('div');
    row.classList.add('stwid--order-action-bar');

    
    const keyToggleContainer = createActionThinContainer('Keys', 'Show/hide keyword column text');
    const keyToggle = document.createElement('div'); {
        keyToggle.classList.add('menu_button');
        keyToggle.classList.add('fa-solid', 'fa-fw');
        setTooltip(keyToggle, 'Show/hide keyword column text');
        const applyKeyToggleStyle = ()=>{
            keyToggle.classList.toggle('fa-eye', !orderHelperState.hideKeys);
            keyToggle.classList.toggle('fa-eye-slash', orderHelperState.hideKeys);
            keyToggle.classList.toggle('stwid--state-active', orderHelperState.hideKeys);
        };
        applyKeyToggleStyle();
        keyToggle.addEventListener('click', ()=>{
            
            orderHelperState.hideKeys = !orderHelperState.hideKeys;
            localStorage.setItem(ORDER_HELPER_HIDE_KEYS_STORAGE_KEY, orderHelperState.hideKeys);
            body.classList.toggle('stwid--hideKeys', orderHelperState.hideKeys);
            applyKeyToggleStyle();
        });
        keyToggleContainer.append(keyToggle);
    }
    row.append(keyToggleContainer);

    const columnVisibilityContainer = buildColumnVisibilityDropdown({
        body,
        orderHelperState,
        ORDER_HELPER_COLUMNS_STORAGE_KEY,
        ORDER_HELPER_DEFAULT_COLUMNS,
        applyOrderHelperColumnVisibility,
    });
    row.append(columnVisibilityContainer);

    const addDivider = ()=>{
        const divider = document.createElement('div');
        divider.classList.add('stwid--actionsDivider');
        row.append(divider);
    };

    const { tableSortContainer } = buildSortSelector({
        dom,
        orderHelperState,
        appendSortOptions,
        setOrderHelperSort,
        SORT,
        ensureCustomDisplayIndex,
        saveWorldInfo,
        buildSavePayload,
        applyOrderHelperSortToDom,
    });
    row.append(tableSortContainer);
    addDivider();

    
    const filterToggle = document.createElement('div'); {
        filterToggle.classList.add('menu_button');
        filterToggle.classList.add('fa-solid', 'fa-fw', 'fa-filter');
        setTooltip(filterToggle, 'Open filters. Apply Order only affects rows that are not filtered out');
        filterToggle.addEventListener('click', ()=>{
            const is = dom.order.filter.root.classList.toggle('stwid--state-active');
            if (is) {
                updateOrderHelperPreview(getOrderHelperEntries(orderHelperState.book, true));
            } else {
                clearOrderHelperScriptFilters();
            }
        });
        row.append(filterToggle);
    }

    
    const visibilityInfo = document.createElement('div');
    visibilityInfo.classList.add('stwid--visibilityInfo');

    row.append(visibilityInfo);

    
    const FILTER_KEY_LABELS = Object.fromEntries(
        ORDER_HELPER_TOGGLE_COLUMNS.map((col)=>[col.key, col.label]),
    );

    
    const getFilterValueLabels = (filterKey, selectedValues)=>{
        let options;
        switch (filterKey) {
            case 'strategy':     options = getStrategyOptions();     break;
            case 'position':     options = getPositionOptions();     break;
            case 'outlet':       options = getOutletOptions();       break;
            case 'automationId': options = getAutomationIdOptions(); break;
            case 'group':        options = getGroupOptions();        break;
            case 'recursion':    options = ORDER_HELPER_RECURSION_OPTIONS; break;
            default: return selectedValues.map(String);
        }
        const labelMap = Object.fromEntries(options.map((opt)=>[opt.value, opt.label]));
        return selectedValues.map((selectedValue)=>labelMap[selectedValue] ?? String(selectedValue));
    };

    
    
    
    let refresh = ()=>{};

    
    const clearFilterHandlers = {
        strategy: makeClearFilterHandler(
            'strategy',
            ()=>orderHelperState.strategyValues.length ? orderHelperState.strategyValues : getStrategyValues(),
            applyOrderHelperStrategyFilters,
            orderHelperState,
            filterIndicatorRefs.strategy,
            ()=>refresh(),
        ),
        position: makeClearFilterHandler(
            'position',
            ()=>orderHelperState.positionValues.length ? orderHelperState.positionValues : getPositionValues(),
            applyOrderHelperPositionFilters,
            orderHelperState,
            filterIndicatorRefs.position,
            ()=>refresh(),
        ),
        recursion: makeClearFilterHandler(
            'recursion',
            ()=>orderHelperState.recursionValues ?? [],
            applyOrderHelperRecursionFilters,
            orderHelperState,
            filterIndicatorRefs.recursion,
            ()=>refresh(),
        ),
        outlet: makeClearFilterHandler(
            'outlet',
            ()=>orderHelperState.outletValues.length ? orderHelperState.outletValues : getOutletValues(),
            applyOrderHelperOutletFilters,
            orderHelperState,
            filterIndicatorRefs.outlet,
            ()=>refresh(),
        ),
        automationId: makeClearFilterHandler(
            'automationId',
            ()=>orderHelperState.automationIdValues.length ? orderHelperState.automationIdValues : getAutomationIdValues(),
            applyOrderHelperAutomationIdFilters,
            orderHelperState,
            filterIndicatorRefs.automationId,
            ()=>refresh(),
        ),
        group: makeClearFilterHandler(
            'group',
            ()=>orderHelperState.groupValues.length ? orderHelperState.groupValues : getGroupValues(),
            applyOrderHelperGroupFilters,
            orderHelperState,
            filterIndicatorRefs.group,
            ()=>refresh(),
        ),
    };

    const filterChipDisplay = buildFilterChipDisplay({
        orderHelperState,
        getStrategyValues,
        getPositionValues,
        getOutletValues,
        getAutomationIdValues,
        getGroupValues,
        clearFilterHandlers,
        FILTER_KEY_LABELS,
        getFilterValueLabels,
    });
    visibilityInfo.append(filterChipDisplay.activeFiltersEl);
    refresh = filterChipDisplay.refresh;

    wrapRowContent(row);

    return { element: row, refresh };
}
