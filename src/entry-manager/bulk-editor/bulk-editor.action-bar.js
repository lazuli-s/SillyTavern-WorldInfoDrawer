import {
    MULTISELECT_DROPDOWN_CLOSE_HANDLER,
    closeOpenMultiselectDropdownMenus,
    setTooltip,
    createMultiselectDropdownCheckbox,
    wireMultiselectDropdown,
    wireCollapseRow,
} from './bulk-editor.utils.js';
import { ORDER_HELPER_TOGGLE_COLUMNS, ORDER_HELPER_RECURSION_OPTIONS } from '../../shared/constants.js';

const BULK_APPLY_BATCH_SIZE = 200;
const APPLY_DIRTY_CLASS = 'stwid--applyDirty';


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


function createCollapsibleRowTitle(titleText) {
    const rowTitle = document.createElement('div');
    rowTitle.classList.add('stwid--RowTitle');
    rowTitle.textContent = titleText;

    const collapseChevron = document.createElement('i');
    collapseChevron.classList.add('fa-solid', 'fa-fw', 'fa-chevron-down', 'stwid--collapseChevron');
    rowTitle.prepend(collapseChevron);
    rowTitle.classList.add('stwid--collapsibleTitle');

    return { rowTitle, collapseChevron };
}


function wrapRowContent(row, rowTitle, collapseChevron, initialCollapsed) {
    const contentWrap = document.createElement('div');
    contentWrap.classList.add('stwid--rowContentWrap');
    while (row.children.length > 1) {
        contentWrap.append(row.children[1]);
    }
    row.append(contentWrap);
    wireCollapseRow(rowTitle, row, contentWrap, collapseChevron, { initialCollapsed });
    return contentWrap;
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

    const { rowTitle, collapseChevron } = createCollapsibleRowTitle('Visibility');
    row.append(rowTitle);

    
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

    wrapRowContent(row, rowTitle, collapseChevron, initialCollapsed);

    return { element: row, refresh };
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
    initialCollapsed = false,
}) {
    const row = document.createElement('div');
    row.classList.add('stwid--bulkEditRow');

    const { rowTitle, collapseChevron } = createCollapsibleRowTitle('Bulk Editor');
    row.append(rowTitle);

    
    const selectContainer = createLabeledBulkContainer('select', 'Select', 'Toggle selection of entries. Selected entries are targeted by bulk operations in this row.');

    const selectAll = document.createElement('div'); {
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
        selectContainer.append(selectAll);
    }

    const selectionCountEl = document.createElement('span');
    selectionCountEl.classList.add('stwid--visibilityCount');
    selectionCountEl.textContent = 'Selected 0 out of 0 entries';
    selectContainer.append(selectionCountEl);

    row.append(selectContainer);

    const refreshSelectionCount = ()=>{
        const rows = dom.order.tbody ? [...dom.order.tbody.children] : [];
        const visible = rows.filter((tableRow)=>!tableRow.classList.contains('stwid--state-filtered'));
        const total = visible.length;
        const selected = visible.filter((tableRow)=>isOrderHelperRowSelected(tableRow)).length;
        selectionCountEl.textContent = `Selected ${selected} out of ${total} entries`;
    };

    
    
    const applyRegistry = [];

    
    const activeStateContainer = createLabeledBulkContainer('activeState', 'State', 'Choose enabled or disabled and apply it to all selected entries at once.');

    const activeToggle = document.createElement('div'); {
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
    }

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
    const applyActiveState = createApplyButton('Apply the active state to all selected entries', runApplyActiveState, applyRegistry);
    activeToggle.addEventListener('click', () => applyActiveState.classList.add(APPLY_DIRTY_CLASS));
    activeStateContainer.append(activeToggle, applyActiveState);

    row.append(activeStateContainer);

    
    const strategyContainer = createLabeledBulkContainer('strategy', 'Strategy', 'Choose a strategy and apply it to all selected entries at once.');

    const strategySelect = document.createElement('select'); {
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
    }

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
    const applyStrategy = createApplyButton('Apply selected strategy to all selected entries', runApplyStrategy, applyRegistry);
    strategySelect.addEventListener('change', () => applyStrategy.classList.add(APPLY_DIRTY_CLASS));
    strategyContainer.append(applyStrategy);

    row.append(strategyContainer);

    
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
            start.max = '10000';
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
            step.max = '10000';
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

    
    const recursionContainer = createLabeledBulkContainer('recursion', 'Recursion', 'Set recursion flags on all selected entries. Overwrites the existing values of all three flags.');

    
    const recursionCheckboxes = new Map();
    const recursionOptions = document.createElement('div'); {
        recursionOptions.classList.add('stwid--recursionOptions');
        for (const { value, label } of ORDER_HELPER_RECURSION_OPTIONS) {
            recursionOptions.append(buildRecursionCheckboxRow(value, label, recursionCheckboxes));
        }
        recursionContainer.append(recursionOptions);
    }

    const runApplyRecursion = async () => {
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();
        for (const { tr, bookName, entryData } of targets) {
            books.add(bookName);
            const domInputs = tr.querySelectorAll('[data-col="recursion"] .stwid--recursionOptions input[type="checkbox"]');
            let i = 0;
            for (const { value } of ORDER_HELPER_RECURSION_OPTIONS) {
                const checked = recursionCheckboxes.get(value).checked;
                entryData[value] = checked;
                if (domInputs[i]) domInputs[i].checked = checked;
                i++;
            }
            applyOrderHelperRecursionFilterToRow(tr, entryData);
        }
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyRecursion.classList.remove(APPLY_DIRTY_CLASS);
    };
    const applyRecursion = createApplyButton('Apply recursion flags to all selected entries, overwriting their current values', runApplyRecursion, applyRegistry);
    for (const input of recursionCheckboxes.values()) {
        input.addEventListener('change', () => applyRecursion.classList.add(APPLY_DIRTY_CLASS));
    }
    recursionContainer.append(applyRecursion);

    row.append(recursionContainer);

    
    const budgetContainer = createLabeledBulkContainer('budget', 'Budget', 'Set the Ignore Budget flag on all selected entries, overwriting existing values. When enabled, an entry bypasses the World Info token budget limit.');

    let budgetIgnoreCheckbox;
    const budgetOptions = document.createElement('div'); {
        budgetOptions.classList.add('stwid--recursionOptions');
        const budgetRow = document.createElement('label'); {
            budgetRow.classList.add('stwid--small-check-row');
            const input = document.createElement('input'); {
                input.type = 'checkbox';
                input.classList.add('checkbox');
                setTooltip(input, 'Ignore World Info budget limit for this entry');
                budgetIgnoreCheckbox = input;
                budgetRow.append(input);
            }
            budgetRow.append('Ignore budget');
            budgetOptions.append(budgetRow);
        }
        budgetContainer.append(budgetOptions);
    }

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
    const applyBudget = createApplyButton('Apply Ignore Budget to all selected entries, overwriting their current values', runApplyBudget, applyRegistry);
    budgetIgnoreCheckbox.addEventListener('change', () => applyBudget.classList.add(APPLY_DIRTY_CLASS));
    budgetContainer.append(applyBudget);

    row.append(budgetContainer);

    
    const probabilityContainer = createLabeledBulkContainer('probability', 'Probability', 'Trigger probability (0–100%). Sets how likely the entry fires when its keywords match. Leave blank to skip.');

    const probabilityInput = document.createElement('input'); {
        probabilityInput.classList.add('stwid-compactInput', 'text_pole');
        probabilityInput.type = 'number';
        probabilityInput.min = '0';
        probabilityInput.max = '100';
        probabilityInput.placeholder = '0–100';
        setTooltip(probabilityInput, 'Probability value to apply (0–100)');
        const stored = localStorage.getItem('stwid--bulk-probability-value');
        if (stored !== null) probabilityInput.value = stored;
        probabilityInput.addEventListener('change', ()=>{
            localStorage.setItem('stwid--bulk-probability-value', probabilityInput.value);
        });
        probabilityContainer.append(probabilityInput);
    }

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
    const applyProbability = createApplyButton('Apply this probability to all selected entries', runApplyProbability, applyRegistry);
    probabilityInput.addEventListener('change', () => applyProbability.classList.add(APPLY_DIRTY_CLASS));
    probabilityContainer.append(applyProbability);

    row.append(probabilityContainer);

    
    const stickyContainer = createLabeledBulkContainer('sticky', 'Sticky', 'Sticky turns — keeps the entry active for N turns after it triggers. Leave blank to skip.');

    const stickyInput = document.createElement('input'); {
        stickyInput.classList.add('stwid-compactInput', 'text_pole');
        stickyInput.type = 'number';
        stickyInput.min = '0';
        stickyInput.placeholder = '0+';
        setTooltip(stickyInput, 'Sticky turns value to apply');
        const stored = localStorage.getItem('stwid--bulk-sticky-value');
        if (stored !== null) stickyInput.value = stored;
        stickyInput.addEventListener('change', ()=>{
            localStorage.setItem('stwid--bulk-sticky-value', stickyInput.value);
        });
        stickyContainer.append(stickyInput);
    }

    const runApplySticky = async () => {
        const rawValue = stickyInput.value.trim();
        if (rawValue === '') {
            toastr.warning('Enter a sticky value (0 or more).');
            return;
        }
        const parsed = parseInt(rawValue, 10);
        if (!Number.isInteger(parsed) || parsed < 0) {
            toastr.warning('Sticky must be a non-negative whole number.');
            return;
        }
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();
        for (const { tr, bookName, entryData } of targets) {
            books.add(bookName);
            entryData.sticky = parsed;
            const rowInp = tr.querySelector('[name="sticky"]');
            if (rowInp) rowInp.value = String(parsed);
        }
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applySticky.classList.remove(APPLY_DIRTY_CLASS);
    };
    const applySticky = createApplyButton('Apply this sticky value to all selected entries', runApplySticky, applyRegistry);
    stickyInput.addEventListener('change', () => applySticky.classList.add(APPLY_DIRTY_CLASS));
    stickyContainer.append(applySticky);

    row.append(stickyContainer);

    
    const cooldownContainer = createLabeledBulkContainer('cooldown', 'Cooldown', 'Cooldown turns — prevents the entry from re-triggering for N turns after activation. Leave blank to skip.');

    const cooldownInput = document.createElement('input'); {
        cooldownInput.classList.add('stwid-compactInput', 'text_pole');
        cooldownInput.type = 'number';
        cooldownInput.min = '0';
        cooldownInput.placeholder = '0+';
        setTooltip(cooldownInput, 'Cooldown turns value to apply');
        const stored = localStorage.getItem('stwid--bulk-cooldown-value');
        if (stored !== null) cooldownInput.value = stored;
        cooldownInput.addEventListener('change', ()=>{
            localStorage.setItem('stwid--bulk-cooldown-value', cooldownInput.value);
        });
        cooldownContainer.append(cooldownInput);
    }

    const runApplyCooldown = async () => {
        const rawValue = cooldownInput.value.trim();
        if (rawValue === '') {
            toastr.warning('Enter a cooldown value (0 or more).');
            return;
        }
        const parsed = parseInt(rawValue, 10);
        if (!Number.isInteger(parsed) || parsed < 0) {
            toastr.warning('Cooldown must be a non-negative whole number.');
            return;
        }
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();
        for (const { tr, bookName, entryData } of targets) {
            books.add(bookName);
            entryData.cooldown = parsed;
            const rowInp = tr.querySelector('[name="cooldown"]');
            if (rowInp) rowInp.value = String(parsed);
        }
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyCooldown.classList.remove(APPLY_DIRTY_CLASS);
    };
    const applyCooldown = createApplyButton('Apply this cooldown value to all selected entries', runApplyCooldown, applyRegistry);
    cooldownInput.addEventListener('change', () => applyCooldown.classList.add(APPLY_DIRTY_CLASS));
    cooldownContainer.append(applyCooldown);

    row.append(cooldownContainer);

    
    const bulkDelayContainer = createLabeledBulkContainer('bulkDelay', 'Delay', 'Delay turns — the entry will not activate until N messages have passed since the chat started. Leave blank to skip.');

    const bulkDelayInput = document.createElement('input'); {
        bulkDelayInput.classList.add('stwid-compactInput', 'text_pole');
        bulkDelayInput.type = 'number';
        bulkDelayInput.min = '0';
        bulkDelayInput.placeholder = '0+';
        setTooltip(bulkDelayInput, 'Delay turns value to apply');
        const stored = localStorage.getItem('stwid--bulk-delay-value');
        if (stored !== null) bulkDelayInput.value = stored;
        bulkDelayInput.addEventListener('change', ()=>{
            localStorage.setItem('stwid--bulk-delay-value', bulkDelayInput.value);
        });
        bulkDelayContainer.append(bulkDelayInput);
    }

    const runApplyBulkDelay = async () => {
        const rawValue = bulkDelayInput.value.trim();
        if (rawValue === '') {
            toastr.warning('Enter a delay value (0 or more).');
            return;
        }
        const parsed = parseInt(rawValue, 10);
        if (!Number.isInteger(parsed) || parsed < 0) {
            toastr.warning('Delay must be a non-negative whole number.');
            return;
        }
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();
        for (const { tr, bookName, entryData } of targets) {
            books.add(bookName);
            entryData.delay = parsed;
            const rowInp = tr.querySelector('[name="delay"]');
            if (rowInp) rowInp.value = String(parsed);
        }
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyBulkDelay.classList.remove(APPLY_DIRTY_CLASS);
    };
    const applyBulkDelay = createApplyButton('Apply this delay value to all selected entries', runApplyBulkDelay, applyRegistry);
    bulkDelayInput.addEventListener('change', () => applyBulkDelay.classList.add(APPLY_DIRTY_CLASS));
    bulkDelayContainer.append(applyBulkDelay);

    row.append(bulkDelayContainer);

    
    const applyAllContainer = createLabeledBulkContainer('applyAll', 'Apply All Changes', 'Applies all containers that have unsaved changes. Skips containers that have not been modified.');

    const applyAll = document.createElement('div'); {
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
    }

    row.append(applyAllContainer);

    wrapRowContent(row, rowTitle, collapseChevron, initialCollapsed);

    return { element: row, refreshSelectionCount, cleanup };
}



