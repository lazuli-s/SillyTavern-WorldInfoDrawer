import {
    MULTISELECT_DROPDOWN_CLOSE_HANDLER,
    closeOpenMultiselectDropdownMenus,
    setTooltip,
    createMultiselectDropdownCheckbox,
    wireMultiselectDropdown,
    wrapRowContent,
} from '../entry-manager.utils.js';
import { ENTRY_MANAGER_TOGGLE_COLUMNS, ENTRY_MANAGER_RECURSION_OPTIONS } from '../../shared/constants.js';

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


function buildColumnCheckboxOptions(menu, columns, entryManagerState, columnInputs, onColumnChange) {
    for (const column of columns) {
        const option = document.createElement('label');
        option.classList.add('stwid--multiselectDropdownOption', 'stwid--menuItem');
        const inputControl = createMultiselectDropdownCheckbox(Boolean(entryManagerState.columns[column.key]));
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
    entryManagerState,
    ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
    ENTRY_MANAGER_DEFAULT_COLUMNS,
    applyEntryManagerColumnVisibility,
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
        Object.entries(ENTRY_MANAGER_DEFAULT_COLUMNS)
            .map(([key, value])=>[key, Boolean(value)]),
    );
    const setColumnVisibility = (overrides)=>{
        for (const column of ENTRY_MANAGER_TOGGLE_COLUMNS) {
            const nextValue = Boolean(overrides[column.key]);
            entryManagerState.columns[column.key] = nextValue;
            const inputControl = columnInputs.get(column.key);
            if (inputControl) inputControl.setChecked(nextValue);
        }
        localStorage.setItem(
            ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
            JSON.stringify(entryManagerState.columns),
        );
        applyEntryManagerColumnVisibility(body);

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
            Object.fromEntries(ENTRY_MANAGER_TOGGLE_COLUMNS.map((column)=>[column.key, true])),
        ),
    });
    addColumnAction({
        label: 'MAIN COLUMNS',
        icon: 'fa-table-columns',
        onClick: ()=>setColumnVisibility(mainColumnDefaults),
    });
    buildColumnCheckboxOptions(
        menu,
        ENTRY_MANAGER_TOGGLE_COLUMNS,
        entryManagerState,
        columnInputs,
        (column, inputControl)=>{
            entryManagerState.columns[column.key] = inputControl.input.checked;
            localStorage.setItem(
                ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
                JSON.stringify(entryManagerState.columns),
            );
            applyEntryManagerColumnVisibility(body);
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
    entryManagerState,
    appendSortOptions,
    setEntryManagerSort,
    SORT,
    ensureCustomDisplayIndex,
    saveWorldInfo,
    buildSavePayload,
    applyEntryManagerSortToDom,
}) {
    const tableSortContainer = createActionThinContainer('Table Sorting', 'Sort rows in the table');
    const sortWrap = document.createElement('label');
    sortWrap.classList.add('stwid--table-sort');
    setTooltip(sortWrap, 'Sort rows in the table');
    const sortSel = document.createElement('select');
    sortSel.classList.add('text_pole', 'stwid--smallSelectTextPole');
    setTooltip(sortSel, 'Sort rows in the table');
    dom.order.sortSelect = sortSel;
    appendSortOptions(sortSel, entryManagerState.sort, entryManagerState.direction);
    sortSel.addEventListener('change', async()=>{
        const value = JSON.parse(sortSel.value);
        setEntryManagerSort(value.sort, value.direction);
        if (value.sort === SORT.CUSTOM) {
            const updatedBooks = ensureCustomDisplayIndex(entryManagerState.book);
            for (const bookName of updatedBooks) {
                await saveWorldInfo(bookName, buildSavePayload(bookName), true);
            }
        }
        applyEntryManagerSortToDom();
    });
    sortWrap.append(sortSel);
    tableSortContainer.append(sortWrap);
    return { tableSortContainer, sortSel };
}


function buildFilterChipDisplay({
    entryManagerState,
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
        const filters = entryManagerState.filters;
        const filterConfigs = [
            { key: 'strategy', allValues: entryManagerState.strategyValues.length ? entryManagerState.strategyValues : getStrategyValues() },
            { key: 'position', allValues: entryManagerState.positionValues.length ? entryManagerState.positionValues : getPositionValues() },
            { key: 'recursion', allValues: entryManagerState.recursionValues ?? [] },
            { key: 'outlet', allValues: entryManagerState.outletValues.length ? entryManagerState.outletValues : getOutletValues() },
            { key: 'automationId', allValues: entryManagerState.automationIdValues.length ? entryManagerState.automationIdValues : getAutomationIdValues() },
            { key: 'group', allValues: entryManagerState.groupValues.length ? entryManagerState.groupValues : getGroupValues() },
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


export function buildDisplayToolbar({
    body,
    entryManagerState,
    dom,
    ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY,
    ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
    ENTRY_MANAGER_DEFAULT_COLUMNS,
    applyEntryManagerColumnVisibility,
    clearEntryManagerScriptFilters,
    setEntryManagerSort,
    applyEntryManagerSortToDom,
    ensureCustomDisplayIndex,
    saveWorldInfo,
    buildSavePayload,
    appendSortOptions,
    getEntryManagerEntries,
    updateEntryManagerPreview,
    SORT,
    applyEntryManagerStrategyFilters,
    applyEntryManagerPositionFilters,
    applyEntryManagerRecursionFilters,
    applyEntryManagerOutletFilters,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilters,
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
            keyToggle.classList.toggle('fa-eye', !entryManagerState.hideKeys);
            keyToggle.classList.toggle('fa-eye-slash', entryManagerState.hideKeys);
            keyToggle.classList.toggle('stwid--state-active', entryManagerState.hideKeys);
        };
        applyKeyToggleStyle();
        keyToggle.addEventListener('click', ()=>{

            entryManagerState.hideKeys = !entryManagerState.hideKeys;
            localStorage.setItem(ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY, entryManagerState.hideKeys);
            body.classList.toggle('stwid--hideKeys', entryManagerState.hideKeys);
            applyKeyToggleStyle();
        });
        keyToggleContainer.append(keyToggle);
    }
    row.append(keyToggleContainer);

    const columnVisibilityContainer = buildColumnVisibilityDropdown({
        body,
        entryManagerState,
        ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
        ENTRY_MANAGER_DEFAULT_COLUMNS,
        applyEntryManagerColumnVisibility,
    });
    row.append(columnVisibilityContainer);

    const addDivider = ()=>{
        const divider = document.createElement('div');
        divider.classList.add('stwid--actionsDivider');
        row.append(divider);
    };

    const { tableSortContainer } = buildSortSelector({
        dom,
        entryManagerState,
        appendSortOptions,
        setEntryManagerSort,
        SORT,
        ensureCustomDisplayIndex,
        saveWorldInfo,
        buildSavePayload,
        applyEntryManagerSortToDom,
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
                updateEntryManagerPreview(getEntryManagerEntries(entryManagerState.book, true));
            } else {
                clearEntryManagerScriptFilters();
            }
        });
        row.append(filterToggle);
    }


    const displayToolbarInfo = document.createElement('div');
    displayToolbarInfo.classList.add('stwid--displayToolbarInfo');

    row.append(displayToolbarInfo);


    const FILTER_KEY_LABELS = Object.fromEntries(
        ENTRY_MANAGER_TOGGLE_COLUMNS.map((col)=>[col.key, col.label]),
    );


    const getFilterValueLabels = (filterKey, selectedValues)=>{
        let options;
        switch (filterKey) {
            case 'strategy':     options = getStrategyOptions();     break;
            case 'position':     options = getPositionOptions();     break;
            case 'outlet':       options = getOutletOptions();       break;
            case 'automationId': options = getAutomationIdOptions(); break;
            case 'group':        options = getGroupOptions();        break;
            case 'recursion':    options = ENTRY_MANAGER_RECURSION_OPTIONS; break;
            default: return selectedValues.map(String);
        }
        const labelMap = Object.fromEntries(options.map((opt)=>[opt.value, opt.label]));
        return selectedValues.map((selectedValue)=>labelMap[selectedValue] ?? String(selectedValue));
    };




    let refresh = ()=>{};


    const clearFilterHandlers = {
        strategy: makeClearFilterHandler(
            'strategy',
            ()=>entryManagerState.strategyValues.length ? entryManagerState.strategyValues : getStrategyValues(),
            applyEntryManagerStrategyFilters,
            entryManagerState,
            filterIndicatorRefs.strategy,
            ()=>refresh(),
        ),
        position: makeClearFilterHandler(
            'position',
            ()=>entryManagerState.positionValues.length ? entryManagerState.positionValues : getPositionValues(),
            applyEntryManagerPositionFilters,
            entryManagerState,
            filterIndicatorRefs.position,
            ()=>refresh(),
        ),
        recursion: makeClearFilterHandler(
            'recursion',
            ()=>entryManagerState.recursionValues ?? [],
            applyEntryManagerRecursionFilters,
            entryManagerState,
            filterIndicatorRefs.recursion,
            ()=>refresh(),
        ),
        outlet: makeClearFilterHandler(
            'outlet',
            ()=>entryManagerState.outletValues.length ? entryManagerState.outletValues : getOutletValues(),
            applyEntryManagerOutletFilters,
            entryManagerState,
            filterIndicatorRefs.outlet,
            ()=>refresh(),
        ),
        automationId: makeClearFilterHandler(
            'automationId',
            ()=>entryManagerState.automationIdValues.length ? entryManagerState.automationIdValues : getAutomationIdValues(),
            applyEntryManagerAutomationIdFilters,
            entryManagerState,
            filterIndicatorRefs.automationId,
            ()=>refresh(),
        ),
        group: makeClearFilterHandler(
            'group',
            ()=>entryManagerState.groupValues.length ? entryManagerState.groupValues : getGroupValues(),
            applyEntryManagerGroupFilters,
            entryManagerState,
            filterIndicatorRefs.group,
            ()=>refresh(),
        ),
    };

    const filterChipDisplay = buildFilterChipDisplay({
        entryManagerState,
        getStrategyValues,
        getPositionValues,
        getOutletValues,
        getAutomationIdValues,
        getGroupValues,
        clearFilterHandlers,
        FILTER_KEY_LABELS,
        getFilterValueLabels,
    });
    displayToolbarInfo.append(filterChipDisplay.activeFiltersEl);
    refresh = filterChipDisplay.refresh;

    wrapRowContent(row);

    return { element: row, refresh };
}
