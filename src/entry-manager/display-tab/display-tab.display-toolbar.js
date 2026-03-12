import {
    MULTISELECT_DROPDOWN_CLOSE_HANDLER,
    setTooltip,
    createMultiselectDropdownCheckbox,
    wireMultiselectDropdown,
    wrapRowContent,
} from '../entry-manager.utils.js';
import { ENTRY_MANAGER_TOGGLE_COLUMNS, ENTRY_MANAGER_RECURSION_OPTIONS } from '../../shared/constants.js';

const COLUMN_VISIBILITY_HINT = 'Choose which columns are visible';
const TABLE_SORT_HINT = 'Sort rows in the table';
const KEYWORD_COLUMN_TEXT_TOGGLE_HINT = 'Show/hide keyword column text';

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

function createColumnVisibilityDropdownDom() {
    const columnVisibilityContainer = createActionThinContainer('Columns', COLUMN_VISIBILITY_HINT);
    const columnVisibilityWrap = document.createElement('div');
    columnVisibilityWrap.classList.add('stwid--columnVisibility');

    const menuWrap = document.createElement('div');
    menuWrap.classList.add('stwid--multiselectDropdownWrap');

    const menuButton = buildColumnDropdownButton(COLUMN_VISIBILITY_HINT);
    menuWrap.append(menuButton);

    const menu = document.createElement('div');
    menu.classList.add('stwid--multiselectDropdownMenu', 'stwid--menu');

    return { columnVisibilityContainer, columnVisibilityWrap, menuWrap, menuButton, menu };
}

function applyAndPersistColumnVisibility({
    entryManagerState,
    columnInputs,
    body,
    storageKey,
    applyEntryManagerColumnVisibility,
    menu,
}) {
    return (overrides)=>{
        for (const column of ENTRY_MANAGER_TOGGLE_COLUMNS) {
            const nextValue = Boolean(overrides[column.key]);
            entryManagerState.columns[column.key] = nextValue;
            const inputControl = columnInputs.get(column.key);
            if (inputControl) inputControl.setChecked(nextValue);
        }
        localStorage.setItem(
            storageKey,
            JSON.stringify(entryManagerState.columns),
        );
        applyEntryManagerColumnVisibility(body);

        const closeMenu = menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
        if (typeof closeMenu === 'function') closeMenu();
    };
}

function addColumnVisibilityPresetActions({ menu, setColumnVisibility, mainColumnDefaults }) {
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
    const {
        columnVisibilityContainer,
        columnVisibilityWrap,
        menuWrap,
        menuButton,
        menu,
    } = createColumnVisibilityDropdownDom();
    const columnInputs = new Map();
    const mainColumnDefaults = Object.fromEntries(
        Object.entries(ENTRY_MANAGER_DEFAULT_COLUMNS)
            .map(([key, value])=>[key, Boolean(value)]),
    );
    const setColumnVisibility = applyAndPersistColumnVisibility({
        entryManagerState,
        columnInputs,
        body,
        storageKey: ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
        applyEntryManagerColumnVisibility,
        menu,
    });

    addColumnVisibilityPresetActions({ menu, setColumnVisibility, mainColumnDefaults });
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
    const tableSortContainer = createActionThinContainer('Table Sorting', TABLE_SORT_HINT);
    const sortWrap = document.createElement('label');
    sortWrap.classList.add('stwid--table-sort');
    setTooltip(sortWrap, TABLE_SORT_HINT);
    const sortSel = document.createElement('select');
    sortSel.classList.add('text_pole', 'stwid--smallSelectTextPole');
    setTooltip(sortSel, TABLE_SORT_HINT);
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

function buildFilterChip({ headerName, valueLabels, onRemove }) {
    const chip = document.createElement('div');
    chip.classList.add('stwid--filterChip');

    const chipLabel = document.createElement('span');
    chipLabel.textContent = `${headerName}: ${valueLabels.join(', ')}`;
    chip.append(chipLabel);

    const removeBtn = document.createElement('button');
    removeBtn.classList.add('stwid--chipRemove');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', onRemove);
    chip.append(removeBtn);

    return chip;
}

function renderActiveFilterChips({
    chipContainer,
    entryManagerState,
    filterConfigs,
    FILTER_KEY_LABELS,
    getFilterValueLabels,
    clearFilterHandlers,
    activeFiltersEl,
}) {
    chipContainer.innerHTML = '';
    const filters = entryManagerState.filters;
    let hasActiveFilter = false;

    for (const { key, allValues } of filterConfigs) {
        const selected = filters[key] ?? [];
        if (!allValues.length) continue;
        if (selected.length >= allValues.length) continue;
        hasActiveFilter = true;

        chipContainer.append(buildFilterChip({
            headerName: FILTER_KEY_LABELS[key] ?? key,
            valueLabels: getFilterValueLabels(key, selected),
            onRemove: clearFilterHandlers[key],
        }));
    }

    activeFiltersEl.style.display = hasActiveFilter ? '' : 'none';
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
        const filterConfigs = [
            { key: 'strategy', allValues: entryManagerState.strategyValues.length ? entryManagerState.strategyValues : getStrategyValues() },
            { key: 'position', allValues: entryManagerState.positionValues.length ? entryManagerState.positionValues : getPositionValues() },
            { key: 'recursion', allValues: entryManagerState.recursionValues ?? [] },
            { key: 'outlet', allValues: entryManagerState.outletValues.length ? entryManagerState.outletValues : getOutletValues() },
            { key: 'automationId', allValues: entryManagerState.automationIdValues.length ? entryManagerState.automationIdValues : getAutomationIdValues() },
            { key: 'group', allValues: entryManagerState.groupValues.length ? entryManagerState.groupValues : getGroupValues() },
        ];
        renderActiveFilterChips({
            chipContainer,
            entryManagerState,
            filterConfigs,
            FILTER_KEY_LABELS,
            getFilterValueLabels,
            clearFilterHandlers,
            activeFiltersEl,
        });
    };

    return { activeFiltersEl, chipContainer, refresh };
}

function buildKeysToggle({ body, entryManagerState, storageKey }) {
    const keyToggleContainer = createActionThinContainer('Keys', KEYWORD_COLUMN_TEXT_TOGGLE_HINT);
    const keyToggle = document.createElement('div');
    keyToggle.classList.add('menu_button');
    keyToggle.classList.add('fa-solid', 'fa-fw');
    setTooltip(keyToggle, KEYWORD_COLUMN_TEXT_TOGGLE_HINT);

    const applyKeyToggleStyle = ()=>{
        keyToggle.classList.toggle('fa-eye', !entryManagerState.hideKeys);
        keyToggle.classList.toggle('fa-eye-slash', entryManagerState.hideKeys);
        keyToggle.classList.toggle('stwid--state-active', entryManagerState.hideKeys);
    };

    applyKeyToggleStyle();
    keyToggle.addEventListener('click', ()=>{
        entryManagerState.hideKeys = !entryManagerState.hideKeys;
        localStorage.setItem(storageKey, entryManagerState.hideKeys);
        body.classList.toggle('stwid--hideKeys', entryManagerState.hideKeys);
        applyKeyToggleStyle();
    });

    keyToggleContainer.append(keyToggle);
    return keyToggleContainer;
}

function buildFilterToggle({ dom, entryManagerState, getEntryManagerEntries, updateEntryManagerPreview, clearEntryManagerScriptFilters }) {
    const filterToggle = document.createElement('div');
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

    return filterToggle;
}

function createFilterValueLabelHelpers({
    getStrategyOptions,
    getPositionOptions,
    getOutletOptions,
    getAutomationIdOptions,
    getGroupOptions,
}) {
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

    return { FILTER_KEY_LABELS, getFilterValueLabels };
}

function buildClearFilterHandlers({
    entryManagerState,
    filterIndicatorRefs,
    refresh,
    getValues,
    applyFilters,
}) {
    const filterHandlerConfigs = [
        { key: 'strategy', getAllValues: getValues.strategy, applyFn: applyFilters.strategy },
        { key: 'position', getAllValues: getValues.position, applyFn: applyFilters.position },
        { key: 'recursion', getAllValues: getValues.recursion, applyFn: applyFilters.recursion },
        { key: 'outlet', getAllValues: getValues.outlet, applyFn: applyFilters.outlet },
        { key: 'automationId', getAllValues: getValues.automationId, applyFn: applyFilters.automationId },
        { key: 'group', getAllValues: getValues.group, applyFn: applyFilters.group },
    ];

    return Object.fromEntries(filterHandlerConfigs.map(({ key, getAllValues, applyFn })=>[
        key,
        makeClearFilterHandler(
            key,
            getAllValues,
            applyFn,
            entryManagerState,
            filterIndicatorRefs[key],
            refresh,
        ),
    ]));
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
}) {
    const displayToolbarRow = document.createElement('div');
    displayToolbarRow.classList.add('stwid--order-action-bar');


    displayToolbarRow.append(buildKeysToggle({
        body,
        entryManagerState,
        storageKey: ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY,
    }));

    const columnVisibilityContainer = buildColumnVisibilityDropdown({
        body,
        entryManagerState,
        ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
        ENTRY_MANAGER_DEFAULT_COLUMNS,
        applyEntryManagerColumnVisibility,
    });
    displayToolbarRow.append(columnVisibilityContainer);

    const addDivider = ()=>{
        const divider = document.createElement('div');
        divider.classList.add('stwid--actionsDivider');
        displayToolbarRow.append(divider);
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
    displayToolbarRow.append(tableSortContainer);
    addDivider();


    displayToolbarRow.append(buildFilterToggle({
        dom,
        entryManagerState,
        getEntryManagerEntries,
        updateEntryManagerPreview,
        clearEntryManagerScriptFilters,
    }));


    const displayToolbarInfo = document.createElement('div');
    displayToolbarInfo.classList.add('stwid--displayToolbarInfo');

    displayToolbarRow.append(displayToolbarInfo);


    const { FILTER_KEY_LABELS, getFilterValueLabels } = createFilterValueLabelHelpers({
        getStrategyOptions,
        getPositionOptions,
        getOutletOptions,
        getAutomationIdOptions,
        getGroupOptions,
    });

    let refresh = ()=>{};


    const clearFilterHandlers = buildClearFilterHandlers({
        entryManagerState,
        filterIndicatorRefs,
        refresh: ()=>refresh(),
        getValues: {
            strategy: ()=>entryManagerState.strategyValues.length ? entryManagerState.strategyValues : getStrategyValues(),
            position: ()=>entryManagerState.positionValues.length ? entryManagerState.positionValues : getPositionValues(),
            recursion: ()=>entryManagerState.recursionValues ?? [],
            outlet: ()=>entryManagerState.outletValues.length ? entryManagerState.outletValues : getOutletValues(),
            automationId: ()=>entryManagerState.automationIdValues.length ? entryManagerState.automationIdValues : getAutomationIdValues(),
            group: ()=>entryManagerState.groupValues.length ? entryManagerState.groupValues : getGroupValues(),
        },
        applyFilters: {
            strategy: applyEntryManagerStrategyFilters,
            position: applyEntryManagerPositionFilters,
            recursion: applyEntryManagerRecursionFilters,
            outlet: applyEntryManagerOutletFilters,
            automationId: applyEntryManagerAutomationIdFilters,
            group: applyEntryManagerGroupFilters,
        },
    });

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

    wrapRowContent(displayToolbarRow);

    return { element: displayToolbarRow, refresh };
}
