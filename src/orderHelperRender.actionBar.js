import {
    MULTISELECT_DROPDOWN_CLOSE_HANDLER,
    closeOpenMultiselectDropdownMenus,
    setTooltip,
    createMultiselectDropdownCheckbox,
    wireMultiselectDropdown,
} from './orderHelperRender.utils.js';
import { ORDER_HELPER_TOGGLE_COLUMNS, ORDER_HELPER_RECURSION_OPTIONS } from './constants.js';

/**
 * Builds the Order Helper visibility row (Row 1).
 *
 * Left side: select-all, key visibility, column visibility dropdown, divider, sort selector, script filter toggle.
 * Right side: entry count span + active column-filter chips.
 *
 * @param {{
 *   body: HTMLElement,
 *   orderHelperState: object,
 *   dom: object,
 *   ORDER_HELPER_HIDE_KEYS_STORAGE_KEY: string,
 *   ORDER_HELPER_COLUMNS_STORAGE_KEY: string,
 *   ORDER_HELPER_DEFAULT_COLUMNS: object,
 *   applyOrderHelperColumnVisibility: function,
 *   clearOrderHelperScriptFilters: function,
 *   setOrderHelperSort: function,
 *   applyOrderHelperSortToDom: function,
 *   ensureCustomDisplayIndex: function,
 *   saveWorldInfo: function,
 *   buildSavePayload: function,
 *   appendSortOptions: function,
 *   getOrderHelperEntries: function,
 *   updateOrderHelperPreview: function,
 *   SORT: object,
 *   SORT_DIRECTION: object,
 *   applyOrderHelperStrategyFilters: function,
 *   applyOrderHelperPositionFilters: function,
 *   applyOrderHelperRecursionFilters: function,
 *   applyOrderHelperOutletFilters: function,
 *   applyOrderHelperAutomationIdFilters: function,
 *   applyOrderHelperGroupFilters: function,
 *   getStrategyOptions: function,
 *   getPositionOptions: function,
 *   getOutletOptions: function,
 *   getAutomationIdOptions: function,
 *   getGroupOptions: function,
 *   getStrategyValues: function,
 *   getPositionValues: function,
 *   getOutletValues: function,
 *   getAutomationIdValues: function,
 *   getGroupValues: function,
 *   filterIndicatorRefs: object,
 * }} ctx
 * @returns {{ element: HTMLElement, refresh: function }}
 */
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
    SORT_DIRECTION, // eslint-disable-line no-unused-vars
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
}) {
    const row = document.createElement('div');
    row.classList.add('stwid--order-action-bar');

    // ── Row title ─────────────────────────────────────────────────────────
    const rowTitle = document.createElement('div');
    rowTitle.classList.add('stwid--RowTitle');
    rowTitle.textContent = 'Visibility';
    const collapseChevron = document.createElement('i');
    collapseChevron.classList.add('fa-solid', 'fa-fw', 'fa-chevron-down', 'stwid--collapseChevron');
    rowTitle.prepend(collapseChevron);
    rowTitle.classList.add('stwid--collapsibleTitle');
    row.dataset.collapsed = 'false';
    row.append(rowTitle);

    // ── Key column visibility toggle ──────────────────────────────────────
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
            // Phase 2: update state → update DOM → persist
            orderHelperState.hideKeys = !orderHelperState.hideKeys;
            localStorage.setItem(ORDER_HELPER_HIDE_KEYS_STORAGE_KEY, orderHelperState.hideKeys);
            body.classList.toggle('stwid--hideKeys', orderHelperState.hideKeys);
            applyKeyToggleStyle();
        });
        row.append(keyToggle);
    }

    // ── Column visibility dropdown ────────────────────────────────────────
    const columnVisibilityWrap = document.createElement('div'); {
        columnVisibilityWrap.classList.add('stwid--columnVisibility');
        const labelWrap = document.createElement('div'); {
            labelWrap.classList.add('stwid--columnVisibilityLabel');
            const labelText = document.createElement('div'); {
                labelText.classList.add('stwid--columnVisibilityText');
                labelText.innerHTML = 'Column<br>Visibility:';
                labelWrap.append(labelText);
            }
            columnVisibilityWrap.append(labelWrap);
        }
        const menuWrap = document.createElement('div'); {
            menuWrap.classList.add('stwid--multiselectDropdownWrap');
            const menuButton = document.createElement('div'); {
                menuButton.classList.add('menu_button', 'stwid--multiselectDropdownButton');
                menuButton.textContent = 'Select';
                setTooltip(menuButton, 'Choose which columns are visible');
                const caret = document.createElement('i'); {
                    caret.classList.add('fa-solid', 'fa-fw', 'fa-caret-down');
                    menuButton.append(caret);
                }
                menuWrap.append(menuButton);
            }
            const menu = document.createElement('div'); {
                menu.classList.add('stwid--multiselectDropdownMenu', 'stwid--menu');
                const columnInputs = new Map();
                const mainColumnDefaults = Object.fromEntries(
                    Object.entries(ORDER_HELPER_DEFAULT_COLUMNS)
                        .map(([key, value])=>[key, Boolean(value)]),
                );
                const setColumnVisibility = (overrides)=>{
                    // Phase 2: update state → update checkboxes → persist → apply to DOM → close
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
                    // Close via stored handler so this works regardless of declaration order.
                    const closeMenu = menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
                    if (typeof closeMenu === 'function') closeMenu();
                };
                const addColumnAction = ({ label, icon, onClick })=>{
                    const action = document.createElement('div'); {
                        action.classList.add('stwid--multiselectDropdownOption', 'stwid--menuItem');
                        action.style.fontWeight = 'bold';
                        const iconEl = document.createElement('i'); {
                            iconEl.classList.add('fa-solid', 'fa-fw', icon, 'stwid--multiselectDropdownOptionIcon');
                            action.append(iconEl);
                        }
                        const labelText = document.createElement('span'); {
                            labelText.textContent = label;
                            action.append(labelText);
                        }
                        action.addEventListener('click', onClick);
                        menu.append(action);
                    }
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
                for (const column of ORDER_HELPER_TOGGLE_COLUMNS) {
                    const option = document.createElement('label'); {
                        option.classList.add('stwid--multiselectDropdownOption', 'stwid--menuItem');
                        const inputControl = createMultiselectDropdownCheckbox(
                            Boolean(orderHelperState.columns[column.key]),
                        );
                        columnInputs.set(column.key, inputControl);
                        inputControl.input.addEventListener('change', ()=>{
                            // Phase 2: update state → persist → apply to DOM
                            orderHelperState.columns[column.key] = inputControl.input.checked;
                            localStorage.setItem(
                                ORDER_HELPER_COLUMNS_STORAGE_KEY,
                                JSON.stringify(orderHelperState.columns),
                            );
                            applyOrderHelperColumnVisibility(body);
                        });
                        option.append(inputControl.input);
                        option.append(inputControl.checkbox);
                        const optionLabel = document.createElement('span');
                        optionLabel.textContent = column.label;
                        option.append(optionLabel);
                        menu.append(option);
                    }
                }
                // Phase 3: wire open/close/outside-click.
                wireMultiselectDropdown(menu, menuButton, menuWrap);
                menuWrap.append(menu);
            }
            columnVisibilityWrap.append(menuWrap);
        }
        row.append(columnVisibilityWrap);
    }

    const addDivider = ()=>{
        const divider = document.createElement('div');
        divider.classList.add('stwid--actionsDivider');
        row.append(divider);
    };
    addDivider();

    // ── Sort select ───────────────────────────────────────────────────────
    const sortWrap = document.createElement('label'); {
        sortWrap.classList.add('stwid--inputWrap');
        setTooltip(sortWrap, 'Sort rows in the table');
        sortWrap.append('Sort: ');
        const sortSel = document.createElement('select'); {
            sortSel.classList.add('text_pole');
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
        }
        row.append(sortWrap);
    }
    addDivider();

    // ── Filter panel toggle ───────────────────────────────────────────────
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

    // ── Right side: visibility info ───────────────────────────────────────
    const visibilityInfo = document.createElement('div');
    visibilityInfo.classList.add('stwid--visibilityInfo');

    const activeFiltersEl = document.createElement('div');
    activeFiltersEl.classList.add('stwid--activeFilters');
    activeFiltersEl.style.display = 'none';
    const activeFiltersLabel = document.createElement('span');
    activeFiltersLabel.textContent = 'Active filters:';
    activeFiltersEl.append(activeFiltersLabel);
    const chipContainer = document.createElement('div');
    chipContainer.classList.add('stwid--filterChipContainer');
    activeFiltersEl.append(chipContainer);
    visibilityInfo.append(activeFiltersEl);

    row.append(visibilityInfo);

    // ── Filter label lookup ───────────────────────────────────────────────
    const FILTER_KEY_LABELS = Object.fromEntries(
        ORDER_HELPER_TOGGLE_COLUMNS.map((col)=>[col.key, col.label]),
    );

    // ── Option label lookup for chip text ─────────────────────────────────
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
        const labelMap = Object.fromEntries(options.map((o)=>[o.value, o.label]));
        return selectedValues.map((v)=>labelMap[v] ?? String(v));
    };

    // ── refresh() — rebuilds count + chips ───────────────────────────────
    // Declared as `let` so clearFilterHandlers (defined below) can reference
    // it in closures that only fire after this function body completes.
    let refresh = ()=>{};

    // ── Chip X click handlers ─────────────────────────────────────────────
    const clearFilterHandlers = {
        strategy: ()=>{
            const allValues = orderHelperState.strategyValues.length
                ? [...orderHelperState.strategyValues]
                : getStrategyValues();
            orderHelperState.filters.strategy = allValues;
            applyOrderHelperStrategyFilters();
            filterIndicatorRefs.strategy?.();
            refresh();
        },
        position: ()=>{
            const allValues = orderHelperState.positionValues.length
                ? [...orderHelperState.positionValues]
                : getPositionValues();
            orderHelperState.filters.position = allValues;
            applyOrderHelperPositionFilters();
            filterIndicatorRefs.position?.();
            refresh();
        },
        recursion: ()=>{
            const allValues = orderHelperState.recursionValues ?? [];
            orderHelperState.filters.recursion = [...allValues];
            applyOrderHelperRecursionFilters();
            filterIndicatorRefs.recursion?.();
            refresh();
        },
        outlet: ()=>{
            const allValues = orderHelperState.outletValues.length
                ? [...orderHelperState.outletValues]
                : getOutletValues();
            orderHelperState.filters.outlet = allValues;
            applyOrderHelperOutletFilters();
            filterIndicatorRefs.outlet?.();
            refresh();
        },
        automationId: ()=>{
            const allValues = orderHelperState.automationIdValues.length
                ? [...orderHelperState.automationIdValues]
                : getAutomationIdValues();
            orderHelperState.filters.automationId = allValues;
            applyOrderHelperAutomationIdFilters();
            filterIndicatorRefs.automationId?.();
            refresh();
        },
        group: ()=>{
            const allValues = orderHelperState.groupValues.length
                ? [...orderHelperState.groupValues]
                : getGroupValues();
            orderHelperState.filters.group = allValues;
            applyOrderHelperGroupFilters();
            filterIndicatorRefs.group?.();
            refresh();
        },
    };

    refresh = ()=>{
        // Chips
        chipContainer.innerHTML = '';
        const filters = orderHelperState.filters;
        const filterConfigs = [
            { key: 'strategy',     allValues: orderHelperState.strategyValues.length    ? orderHelperState.strategyValues    : getStrategyValues()    },
            { key: 'position',     allValues: orderHelperState.positionValues.length    ? orderHelperState.positionValues    : getPositionValues()    },
            { key: 'recursion',    allValues: orderHelperState.recursionValues ?? []                                                                  },
            { key: 'outlet',       allValues: orderHelperState.outletValues.length      ? orderHelperState.outletValues      : getOutletValues()      },
            { key: 'automationId', allValues: orderHelperState.automationIdValues.length? orderHelperState.automationIdValues: getAutomationIdValues()},
            { key: 'group',        allValues: orderHelperState.groupValues.length       ? orderHelperState.groupValues       : getGroupValues()       },
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

    // Gather all content after rowTitle into a collapsible wrapper
    const contentWrap = document.createElement('div');
    contentWrap.classList.add('stwid--rowContentWrap');
    while (row.children.length > 1) {
        contentWrap.append(row.children[1]); // row.children[0] is rowTitle
    }
    row.append(contentWrap);

    // Wire collapse toggle
    rowTitle.addEventListener('click', () => {
        const isCollapsed = row.dataset.collapsed === 'true';
        if (isCollapsed) {
            // Expanding
            row.dataset.collapsed = 'false';
            row.classList.remove('stwid--collapsed');
            contentWrap.style.overflow = 'hidden';
            contentWrap.style.maxHeight = '1000px';
            collapseChevron.classList.remove('fa-chevron-right');
            collapseChevron.classList.add('fa-chevron-down');
            contentWrap.addEventListener('transitionend', () => {
                contentWrap.style.overflow = '';
                contentWrap.style.maxHeight = '';
            }, { once: true });
        } else {
            // Collapsing: close open dropdowns, then animate
            closeOpenMultiselectDropdownMenus();
            contentWrap.style.overflow = 'hidden';
            contentWrap.style.maxHeight = contentWrap.scrollHeight + 'px';
            // Force reflow so the browser registers the pinned height before animating
            void contentWrap.offsetHeight;
            contentWrap.style.maxHeight = '0';
            row.dataset.collapsed = 'true';
            row.classList.add('stwid--collapsed');
            collapseChevron.classList.remove('fa-chevron-down');
            collapseChevron.classList.add('fa-chevron-right');
        }
    });

    return { element: row, refresh };
}

/**
 * Builds the Order Helper bulk edit row (Row 2).
 *
 * Left side: bordered Select container (select-all toggle + selection count).
 * Right side: bordered Order container (start / spacing / direction / apply).
 *
 * @param {{
 *   dom: object,
 *   orderHelperState: object,
 *   cache: object,
 *   saveWorldInfo: function,
 *   buildSavePayload: function,
 *   isOrderHelperRowSelected: function,
 *   setAllOrderHelperRowSelected: function,
 *   updateOrderHelperSelectAllButton: function,
 *   getOrderHelperRows: function,
 *   getStrategyOptions: function,
 *   getPositionOptions: function,
 *   applyOrderHelperPositionFilterToRow: function,
 *   isOutletPosition: function,
 *   getOutletOptions: function,
 *   applyOrderHelperOutletFilterToRow: function,
 *   syncOrderHelperOutletFilters: function,
 *   filterIndicatorRefs: object,
 *   applyOrderHelperRecursionFilterToRow: function,
 * }} ctx
 * @returns {{ element: HTMLElement, refreshSelectionCount: function, cleanup: function }}
 */
export function buildBulkEditRow({
    dom,
    orderHelperState, // eslint-disable-line no-unused-vars
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
}) {
    const row = document.createElement('div');
    row.classList.add('stwid--bulkEditRow');

    // ── Row title ─────────────────────────────────────────────────────────
    const rowTitle = document.createElement('div');
    rowTitle.classList.add('stwid--RowTitle');
    rowTitle.textContent = 'Bulk Editor';
    const collapseChevron = document.createElement('i');
    collapseChevron.classList.add('fa-solid', 'fa-fw', 'fa-chevron-down', 'stwid--collapseChevron');
    rowTitle.prepend(collapseChevron);
    rowTitle.classList.add('stwid--collapsibleTitle');
    row.dataset.collapsed = 'false';
    row.append(rowTitle);

    // ── Select container ──────────────────────────────────────────────────
    const selectContainer = document.createElement('div');
    selectContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    selectContainer.dataset.field = 'select';

    const selectLabel = document.createElement('span');
    selectLabel.classList.add('stwid--bulkEditLabel');
    selectLabel.textContent = 'Select';
    const selectLabelHint = document.createElement('i');
    selectLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(selectLabelHint, 'Toggle selection of entries. Selected entries are targeted by bulk operations in this row.');
    selectLabel.append(selectLabelHint);
    selectContainer.append(selectLabel);

    const selectAll = document.createElement('div'); {
        dom.order.selectAll = selectAll;
        selectAll.classList.add('menu_button', 'interactable');
        selectAll.classList.add('fa-solid', 'fa-fw', 'fa-square-check', 'stwid--state-active');
        setTooltip(selectAll, 'Select/deselect all entries to be edited by Apply Order');
        selectAll.addEventListener('click', ()=>{
            const rows = getOrderHelperRows();
            const shouldSelect = !rows.length || rows.some(r=>!isOrderHelperRowSelected(r));
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
        const visible = rows.filter((r)=>!r.classList.contains('stwid--state-filtered'));
        const total = visible.length;
        const selected = visible.filter((r)=>isOrderHelperRowSelected(r)).length;
        selectionCountEl.textContent = `Selected ${selected} out of ${total} entries`;
    };

    const getSafeTbodyRows = ()=>{
        const tbody = dom.order?.tbody;
        if (!(tbody instanceof HTMLElement)) {
            toastr.warning('Order Helper table is not ready yet.');
            return null;
        }
        return [...tbody.children].filter((child)=>child instanceof HTMLElement);
    };

    const getBulkTargets = (rows, { reverse = false } = {})=>{
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
    };

    const saveUpdatedBooks = async (books)=>{
        for (const bookName of books) {
            await saveWorldInfo(bookName, buildSavePayload(bookName), true);
        }
    };

    const setApplyButtonBusy = (button, isBusy)=>{
        button.dataset.stwidBusy = isBusy ? '1' : '0';
        button.style.pointerEvents = isBusy ? 'none' : '';
        button.classList.toggle('stwid--state-disabled', isBusy);
        button.setAttribute('aria-disabled', isBusy ? 'true' : 'false');
    };

    const withApplyButtonLock = async (button, callback)=>{
        if (button.dataset.stwidBusy === '1') return;
        setApplyButtonBusy(button, true);
        try {
            await callback();
        } finally {
            setApplyButtonBusy(button, false);
        }
    };

    // Registry used by "Apply All Changes" to iterate dirty containers.
    // Each entry: { isDirty: () => boolean, runApply: async () => void }
    const applyRegistry = [];

    // ── Toggle Active State container ─────────────────────────────────────
    const activeStateContainer = document.createElement('div');
    activeStateContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    activeStateContainer.dataset.field = 'activeState';

    const activeStateLabel = document.createElement('span');
    activeStateLabel.classList.add('stwid--bulkEditLabel');
    activeStateLabel.textContent = 'State';
    const activeStateLabelHint = document.createElement('i');
    activeStateLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(activeStateLabelHint, 'Choose enabled or disabled and apply it to all selected entries at once.');
    activeStateLabel.append(activeStateLabelHint);
    activeStateContainer.append(activeStateLabel);

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
        activeStateContainer.append(activeToggle);
    }

    const applyActiveState = document.createElement('div'); {
        applyActiveState.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
        setTooltip(applyActiveState, 'Apply the active state to all selected entries');
        const runApplyActiveState = async () => {
            await withApplyButtonLock(applyActiveState, async()=>{
                const rows = getSafeTbodyRows();
                if (!rows) return;

                const willDisable = activeToggle.classList.contains('fa-toggle-off');
                const targets = getBulkTargets(rows);
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
                    if ((i + 1) % 200 === 0) {
                        await new Promise((resolve)=>setTimeout(resolve, 0));
                    }
                }
                await saveUpdatedBooks(books);
                applyActiveState.classList.remove('stwid--applyDirty');
            });
        };
        applyActiveState.addEventListener('click', runApplyActiveState);
        applyRegistry.push({ isDirty: () => applyActiveState.classList.contains('stwid--applyDirty'), runApply: runApplyActiveState });
        activeStateContainer.append(applyActiveState);
    }
    activeToggle.addEventListener('click', () => applyActiveState.classList.add('stwid--applyDirty'));

    row.append(activeStateContainer);

    // ── Strategy container ────────────────────────────────────────────────
    const strategyContainer = document.createElement('div');
    strategyContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    strategyContainer.dataset.field = 'strategy';

    const strategyLabel = document.createElement('span');
    strategyLabel.classList.add('stwid--bulkEditLabel');
    strategyLabel.textContent = 'Strategy';
    const strategyLabelHint = document.createElement('i');
    strategyLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(strategyLabelHint, 'Choose a strategy and apply it to all selected entries at once.');
    strategyLabel.append(strategyLabelHint);
    strategyContainer.append(strategyLabel);

    const strategySelect = document.createElement('select'); {
        strategySelect.classList.add('stwid--input', 'text_pole');
        setTooltip(strategySelect, 'Strategy to apply to selected entries');
        for (const opt of getStrategyOptions()) {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            strategySelect.append(option);
        }
        const storedStrategy = localStorage.getItem('stwid--bulk-strategy-value');
        if (storedStrategy && [...strategySelect.options].some((o)=>o.value === storedStrategy)) {
            strategySelect.value = storedStrategy;
        }
        strategySelect.addEventListener('change', ()=>{
            localStorage.setItem('stwid--bulk-strategy-value', strategySelect.value);
        });
        strategyContainer.append(strategySelect);
    }

    const applyStrategy = document.createElement('div'); {
        applyStrategy.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
        setTooltip(applyStrategy, 'Apply selected strategy to all selected entries');
        const runApplyStrategy = async () => {
            await withApplyButtonLock(applyStrategy, async()=>{
                const value = strategySelect.value;
                if (!value) {
                    toastr.warning('No strategy selected.');
                    return;
                }
                const rows = getSafeTbodyRows();
                if (!rows) return;

                const targets = getBulkTargets(rows);
                const books = new Set();
                for (let i = 0; i < targets.length; i++) {
                    const { tr, bookName, uid, entryData } = targets[i];
                    books.add(bookName);
                    entryData.constant = value === 'constant';
                    entryData.vectorized = value === 'vectorized';
                    const rowStrat = /**@type {HTMLSelectElement}*/(tr.querySelector('[name="entryStateSelector"]'));
                    if (rowStrat) rowStrat.value = value;
                    const domStrat = cache?.[bookName]?.dom?.entry?.[uid]?.strategy;
                    if (domStrat) domStrat.value = value;
                    applyOrderHelperStrategyFilterToRow(tr, entryData);
                    if ((i + 1) % 200 === 0) {
                        await new Promise((resolve)=>setTimeout(resolve, 0));
                    }
                }
                await saveUpdatedBooks(books);
                applyStrategy.classList.remove('stwid--applyDirty');
            });
        };
        applyStrategy.addEventListener('click', runApplyStrategy);
        applyRegistry.push({ isDirty: () => applyStrategy.classList.contains('stwid--applyDirty'), runApply: runApplyStrategy });
        strategyContainer.append(applyStrategy);
    }
    strategySelect.addEventListener('change', () => applyStrategy.classList.add('stwid--applyDirty'));

    row.append(strategyContainer);

    // ── Position container ────────────────────────────────────────────────
    const positionContainer = document.createElement('div');
    positionContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    positionContainer.dataset.field = 'position';

    const positionLabel = document.createElement('span');
    positionLabel.classList.add('stwid--bulkEditLabel');
    positionLabel.textContent = 'Position';
    const positionLabelHint = document.createElement('i');
    positionLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(positionLabelHint, 'Choose a position and apply it to all selected entries at once.');
    positionLabel.append(positionLabelHint);
    positionContainer.append(positionLabel);

    const positionSelect = document.createElement('select'); {
        positionSelect.classList.add('stwid--input', 'text_pole');
        setTooltip(positionSelect, 'Position to apply to selected entries');
        for (const opt of getPositionOptions()) {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            positionSelect.append(option);
        }
        const storedPosition = localStorage.getItem('stwid--bulk-position-value');
        if (storedPosition && [...positionSelect.options].some((o)=>o.value === storedPosition)) {
            positionSelect.value = storedPosition;
        }
        positionSelect.addEventListener('change', ()=>{
            localStorage.setItem('stwid--bulk-position-value', positionSelect.value);
        });
        positionContainer.append(positionSelect);
    }

    const applyPosition = document.createElement('div'); {
        applyPosition.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
        setTooltip(applyPosition, 'Apply selected position to all selected entries');
        const runApplyPosition = async () => {
            const value = positionSelect.value;
            if (!value) {
                toastr.warning('No position selected.');
                return;
            }
            const rows = getSafeTbodyRows();
            if (!rows) return;
            const targets = getBulkTargets(rows);
            const books = new Set();
            for (const { tr, bookName, uid, entryData } of targets) {
                books.add(bookName);
                entryData.position = value;
                const domPos = cache?.[bookName]?.dom?.entry?.[uid]?.position;
                if (domPos) domPos.value = value;
                applyOrderHelperPositionFilterToRow(tr, entryData);
            }
            await saveUpdatedBooks(books);
            applyPosition.classList.remove('stwid--applyDirty');
        };
        applyPosition.addEventListener('click', runApplyPosition);
        applyRegistry.push({ isDirty: () => applyPosition.classList.contains('stwid--applyDirty'), runApply: runApplyPosition });
        positionContainer.append(applyPosition);
    }
    positionSelect.addEventListener('change', () => applyPosition.classList.add('stwid--applyDirty'));

    row.append(positionContainer);

    // ── Depth container ───────────────────────────────────────────────────
    const depthContainer = document.createElement('div');
    depthContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    depthContainer.dataset.field = 'depth';

    const depthLabel = document.createElement('span');
    depthLabel.classList.add('stwid--bulkEditLabel');
    depthLabel.textContent = 'Depth';
    const depthLabelHint = document.createElement('i');
    depthLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(depthLabelHint, 'Apply a Depth value to all selected entries at once. Depth controls how many messages back from the latest the trigger check looks (0 = last message). Leave blank to clear depth.');
    depthLabel.append(depthLabelHint);
    depthContainer.append(depthLabel);

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

    const applyDepth = document.createElement('div'); {
        applyDepth.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
        setTooltip(applyDepth, 'Apply depth value to all selected entries');
        const runApplyDepth = async () => {
            const rawValue = depthInput.value.trim();
            const parsedDepth = rawValue === '' ? undefined : parseInt(rawValue, 10);
            if (rawValue !== '' && (!Number.isInteger(parsedDepth) || parsedDepth < 0)) {
                toastr.warning('Depth must be a non-negative whole number, or blank to clear.');
                return;
            }
            const rows = getSafeTbodyRows();
            if (!rows) return;
            const targets = getBulkTargets(rows);
            const books = new Set();
            for (const { tr, bookName, entryData } of targets) {
                books.add(bookName);
                entryData.depth = parsedDepth;
                const rowDepth = /**@type {HTMLInputElement}*/(tr.querySelector('[name="depth"]'));
                if (rowDepth) rowDepth.value = parsedDepth !== undefined ? String(parsedDepth) : '';
            }
            await saveUpdatedBooks(books);
            applyDepth.classList.remove('stwid--applyDirty');
        };
        applyDepth.addEventListener('click', runApplyDepth);
        applyRegistry.push({ isDirty: () => applyDepth.classList.contains('stwid--applyDirty'), runApply: runApplyDepth });
        depthContainer.append(applyDepth);
    }
    depthInput.addEventListener('change', () => applyDepth.classList.add('stwid--applyDirty'));

    row.append(depthContainer);

    // ── Depth visibility: enabled only when position is atDepth (value 4) ─
    const applyDepthContainerState = ()=>{
        const isDepth = positionSelect.value === '4';
        depthContainer.classList.toggle('stwid--state-disabled', !isDepth);
        depthInput.disabled = !isDepth;
    };
    positionSelect.addEventListener('change', applyDepthContainerState);
    applyDepthContainerState();

    // ── Outlet container ──────────────────────────────────────────────────
    const outletContainer = document.createElement('div');
    outletContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    outletContainer.dataset.field = 'outlet';

    const outletLabel = document.createElement('span');
    outletLabel.classList.add('stwid--bulkEditLabel');
    outletLabel.textContent = 'Outlet';
    const outletLabelHint = document.createElement('i');
    outletLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(outletLabelHint, 'Apply an Outlet name to all selected entries at once. Only interactable when Position is set to Outlet.');
    outletLabel.append(outletLabelHint);
    outletContainer.append(outletLabel);

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
        const visible = filter ? allOptions.filter((o)=>o.value.toLowerCase().includes(filter)) : allOptions;
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

    const applyOutlet = document.createElement('div'); {
        applyOutlet.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
        setTooltip(applyOutlet, 'Apply outlet name to all selected entries');
        const runApplyOutlet = async () => {
            const value = outletInput.value.trim();
            const rows = getSafeTbodyRows();
            if (!rows) return;
            const targets = getBulkTargets(rows);
            const books = new Set();
            // Pass 1: mutate all entries before syncing the filter snapshot.
            for (const { tr, bookName, entryData } of targets) {
                books.add(bookName);
                entryData.outletName = value;
                const rowOutlet = /**@type {HTMLInputElement}*/(tr.querySelector('[name="outletName"]'));
                if (rowOutlet) rowOutlet.value = value;
            }
            // Refresh the snapshot so the new outlet value is included in the allowed list.
            syncOrderHelperOutletFilters();
            // Pass 2: apply the updated filter to each row.
            for (const { tr, entryData } of targets) {
                applyOrderHelperOutletFilterToRow(tr, entryData);
            }
            filterIndicatorRefs.outlet?.();
            await saveUpdatedBooks(books);
            applyOutlet.classList.remove('stwid--applyDirty');
        };
        applyOutlet.addEventListener('click', runApplyOutlet);
        applyRegistry.push({ isDirty: () => applyOutlet.classList.contains('stwid--applyDirty'), runApply: runApplyOutlet });
        outletContainer.append(applyOutlet);
    }
    outletInput.addEventListener('input', () => applyOutlet.classList.add('stwid--applyDirty'));

    row.append(outletContainer);

    // ── Outlet visibility: enabled only when position is outlet ───────────
    const applyOutletContainerState = ()=>{
        const isOutlet = isOutletPosition(positionSelect.value);
        outletContainer.classList.toggle('stwid--state-disabled', !isOutlet);
        outletInput.disabled = !isOutlet;
    };
    positionSelect.addEventListener('change', applyOutletContainerState);
    applyOutletContainerState();

    // ── Order container ───────────────────────────────────────────────────
    const orderContainer = document.createElement('div');
    orderContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    orderContainer.dataset.field = 'order';

    const orderLabel = document.createElement('span');
    orderLabel.classList.add('stwid--bulkEditLabel');
    orderLabel.textContent = 'Order';
    const orderLabelHint = document.createElement('i');
    orderLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(orderLabelHint, 'Assign sequential Order numbers to selected entries using the start value, spacing, and direction below.');
    orderLabel.append(orderLabelHint);
    orderContainer.append(orderLabel);

    // Apply Order button (created before direction radios because the direction
    // radio listeners reference it to toggle its icon class).
    const apply = document.createElement('div'); {
        apply.classList.add('menu_button', 'interactable');
        apply.classList.add('fa-solid', 'fa-fw', 'fa-check');
        setTooltip(apply, 'Apply current row order to the Order field');
        const runApplyOrder = async () => {
            await withApplyButtonLock(apply, async()=>{
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
                const rows = getSafeTbodyRows();
                if (!rows) return;

                const up = dom.order.direction.up.checked;
                const targets = getBulkTargets(rows, { reverse: up });
                let order = start;
                const books = new Set();
                for (let i = 0; i < targets.length; i++) {
                    const { tr, bookName, entryData } = targets[i];
                    books.add(bookName);
                    entryData.order = order;
                    const orderInput = /**@type {HTMLInputElement | null}*/(tr.querySelector('[name="order"]'));
                    if (orderInput) orderInput.value = order.toString();
                    order += step;
                    if ((i + 1) % 200 === 0) {
                        await new Promise((resolve)=>setTimeout(resolve, 0));
                    }
                }
                await saveUpdatedBooks(books);
                apply.classList.remove('stwid--applyDirty');
            });
        };
        apply.addEventListener('click', runApplyOrder);
        applyRegistry.push({ isDirty: () => apply.classList.contains('stwid--applyDirty'), runApply: runApplyOrder });
    }

    // Start + Spacing are stacked vertically inside a sub-wrapper (Feature 1).
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
    dom.order.start.addEventListener('change', () => apply.classList.add('stwid--applyDirty'));
    dom.order.step.addEventListener('change', () => apply.classList.add('stwid--applyDirty'));

    const dir = document.createElement('div'); {
        dir.classList.add('stwid--inputWrap');
        setTooltip(dir, 'Direction used when applying Order values');
        dir.append('Direction: ');
        const directionRadioGroupName = 'stwid--order-direction';
        const wrap = document.createElement('div'); {
            wrap.classList.add('stwid--toggleWrap');
            const up = document.createElement('label'); {
                up.classList.add('stwid--inputWrap');
                setTooltip(up, 'Start from the bottom row');
                const inp = document.createElement('input'); {
                    dom.order.direction.up = inp;
                    inp.type = 'radio';
                    inp.name = directionRadioGroupName;
                    inp.checked = (localStorage.getItem('stwid--order-direction') ?? 'down') == 'up';
                    inp.addEventListener('change', ()=>{
                        if (!inp.checked) return;
                        localStorage.setItem('stwid--order-direction', 'up');
                    });
                    inp.addEventListener('change', () => apply.classList.add('stwid--applyDirty'));
                    up.append(inp);
                }
                up.append('up');
                wrap.append(up);
            }
            const down = document.createElement('label'); {
                down.classList.add('stwid--inputWrap');
                setTooltip(down, 'Start from the top row');
                const inp = document.createElement('input'); {
                    dom.order.direction.down = inp;
                    inp.type = 'radio';
                    inp.name = directionRadioGroupName;
                    inp.checked = (localStorage.getItem('stwid--order-direction') ?? 'down') == 'down';
                    inp.addEventListener('change', ()=>{
                        if (!inp.checked) return;
                        localStorage.setItem('stwid--order-direction', 'down');
                    });
                    inp.addEventListener('change', () => apply.classList.add('stwid--applyDirty'));
                    down.append(inp);
                }
                down.append('down');
                wrap.append(down);
            }
            dir.append(wrap);
        }
        orderContainer.append(dir);
    }
    orderContainer.append(apply);
    row.append(orderContainer);

    // ── Recursion container ────────────────────────────────────────────────
    const recursionContainer = document.createElement('div');
    recursionContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    recursionContainer.dataset.field = 'recursion';

    const recursionLabel = document.createElement('span');
    recursionLabel.classList.add('stwid--bulkEditLabel');
    recursionLabel.textContent = 'Recursion';
    const recursionLabelHint = document.createElement('i');
    recursionLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(recursionLabelHint, 'Set recursion flags on all selected entries. Overwrites the existing values of all three flags.');
    recursionLabel.append(recursionLabelHint);
    recursionContainer.append(recursionLabel);

    /** @type {Map<string, HTMLInputElement>} */
    const recursionCheckboxes = new Map();
    const recursionOptions = document.createElement('div'); {
        recursionOptions.classList.add('stwid--recursionOptions');
        for (const { value, label } of ORDER_HELPER_RECURSION_OPTIONS) {
            const row = document.createElement('label'); {
                row.classList.add('stwid--small-check-row');
                const input = document.createElement('input'); {
                    input.type = 'checkbox';
                    input.classList.add('checkbox');
                    setTooltip(input, label);
                    recursionCheckboxes.set(value, input);
                    row.append(input);
                }
                row.append(label);
                recursionOptions.append(row);
            }
        }
        recursionContainer.append(recursionOptions);
    }

    const applyRecursion = document.createElement('div'); {
        applyRecursion.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
        setTooltip(applyRecursion, 'Apply recursion flags to all selected entries, overwriting their current values');
        const runApplyRecursion = async () => {
            const rows = getSafeTbodyRows();
            if (!rows) return;
            const targets = getBulkTargets(rows);
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
            await saveUpdatedBooks(books);
            applyRecursion.classList.remove('stwid--applyDirty');
        };
        applyRecursion.addEventListener('click', runApplyRecursion);
        applyRegistry.push({ isDirty: () => applyRecursion.classList.contains('stwid--applyDirty'), runApply: runApplyRecursion });
        recursionContainer.append(applyRecursion);
    }
    for (const input of recursionCheckboxes.values()) {
        input.addEventListener('change', () => applyRecursion.classList.add('stwid--applyDirty'));
    }

    row.append(recursionContainer);

    // ── Budget container ───────────────────────────────────────────────────
    const budgetContainer = document.createElement('div');
    budgetContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    budgetContainer.dataset.field = 'budget';

    const budgetLabel = document.createElement('span');
    budgetLabel.classList.add('stwid--bulkEditLabel');
    budgetLabel.textContent = 'Budget';
    const budgetLabelHint = document.createElement('i');
    budgetLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(budgetLabelHint, 'Set the Ignore Budget flag on all selected entries, overwriting existing values. When enabled, an entry bypasses the World Info token budget limit.');
    budgetLabel.append(budgetLabelHint);
    budgetContainer.append(budgetLabel);

    let budgetIgnoreCheckbox;
    const budgetOptions = document.createElement('div'); {
        budgetOptions.classList.add('stwid--recursionOptions');
        const row = document.createElement('label'); {
            row.classList.add('stwid--small-check-row');
            const input = document.createElement('input'); {
                input.type = 'checkbox';
                input.classList.add('checkbox');
                setTooltip(input, 'Ignore World Info budget limit for this entry');
                budgetIgnoreCheckbox = input;
                row.append(input);
            }
            row.append('Ignore budget');
            budgetOptions.append(row);
        }
        budgetContainer.append(budgetOptions);
    }

    const applyBudget = document.createElement('div'); {
        applyBudget.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
        setTooltip(applyBudget, 'Apply Ignore Budget to all selected entries, overwriting their current values');
        const runApplyBudget = async () => {
            const checked = budgetIgnoreCheckbox.checked;
            const rows = getSafeTbodyRows();
            if (!rows) return;
            const targets = getBulkTargets(rows);
            const books = new Set();
            for (const { tr, bookName, entryData } of targets) {
                books.add(bookName);
                entryData.ignoreBudget = checked;
                const domInput = tr.querySelector('[data-col="budget"] .stwid--recursionOptions input[type="checkbox"]');
                if (domInput) domInput.checked = checked;
            }
            await saveUpdatedBooks(books);
            applyBudget.classList.remove('stwid--applyDirty');
        };
        applyBudget.addEventListener('click', runApplyBudget);
        applyRegistry.push({ isDirty: () => applyBudget.classList.contains('stwid--applyDirty'), runApply: runApplyBudget });
        budgetContainer.append(applyBudget);
    }
    budgetIgnoreCheckbox.addEventListener('change', () => applyBudget.classList.add('stwid--applyDirty'));

    row.append(budgetContainer);

    // ── Probability container ──────────────────────────────────────────────
    const probabilityContainer = document.createElement('div');
    probabilityContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    probabilityContainer.dataset.field = 'probability';

    const probabilityLabel = document.createElement('span');
    probabilityLabel.classList.add('stwid--bulkEditLabel');
    probabilityLabel.textContent = 'Probability';
    const probabilityLabelHint = document.createElement('i');
    probabilityLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(probabilityLabelHint, 'Trigger probability (0–100%). Sets how likely the entry fires when its keywords match. Leave blank to skip.');
    probabilityLabel.append(probabilityLabelHint);
    probabilityContainer.append(probabilityLabel);

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

    const applyProbability = document.createElement('div'); {
        applyProbability.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
        setTooltip(applyProbability, 'Apply this probability to all selected entries');
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
            const rows = getSafeTbodyRows();
            if (!rows) return;
            const targets = getBulkTargets(rows);
            const books = new Set();
            for (const { tr, bookName, entryData } of targets) {
                books.add(bookName);
                entryData.selective_probability = parsed;
                const rowInp = tr.querySelector('[name="selective_probability"]');
                if (rowInp) rowInp.value = String(parsed);
            }
            await saveUpdatedBooks(books);
            applyProbability.classList.remove('stwid--applyDirty');
        };
        applyProbability.addEventListener('click', runApplyProbability);
        applyRegistry.push({ isDirty: () => applyProbability.classList.contains('stwid--applyDirty'), runApply: runApplyProbability });
        probabilityContainer.append(applyProbability);
    }
    probabilityInput.addEventListener('change', () => applyProbability.classList.add('stwid--applyDirty'));

    row.append(probabilityContainer);

    // ── Sticky container ───────────────────────────────────────────────────
    const stickyContainer = document.createElement('div');
    stickyContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    stickyContainer.dataset.field = 'sticky';

    const stickyLabel = document.createElement('span');
    stickyLabel.classList.add('stwid--bulkEditLabel');
    stickyLabel.textContent = 'Sticky';
    const stickyLabelHint = document.createElement('i');
    stickyLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(stickyLabelHint, 'Sticky turns — keeps the entry active for N turns after it triggers. Leave blank to skip.');
    stickyLabel.append(stickyLabelHint);
    stickyContainer.append(stickyLabel);

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

    const applySticky = document.createElement('div'); {
        applySticky.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
        setTooltip(applySticky, 'Apply this sticky value to all selected entries');
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
            const rows = getSafeTbodyRows();
            if (!rows) return;
            const targets = getBulkTargets(rows);
            const books = new Set();
            for (const { tr, bookName, entryData } of targets) {
                books.add(bookName);
                entryData.sticky = parsed;
                const rowInp = tr.querySelector('[name="sticky"]');
                if (rowInp) rowInp.value = String(parsed);
            }
            await saveUpdatedBooks(books);
            applySticky.classList.remove('stwid--applyDirty');
        };
        applySticky.addEventListener('click', runApplySticky);
        applyRegistry.push({ isDirty: () => applySticky.classList.contains('stwid--applyDirty'), runApply: runApplySticky });
        stickyContainer.append(applySticky);
    }
    stickyInput.addEventListener('change', () => applySticky.classList.add('stwid--applyDirty'));

    row.append(stickyContainer);

    // ── Cooldown container ─────────────────────────────────────────────────
    const cooldownContainer = document.createElement('div');
    cooldownContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    cooldownContainer.dataset.field = 'cooldown';

    const cooldownLabel = document.createElement('span');
    cooldownLabel.classList.add('stwid--bulkEditLabel');
    cooldownLabel.textContent = 'Cooldown';
    const cooldownLabelHint = document.createElement('i');
    cooldownLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(cooldownLabelHint, 'Cooldown turns — prevents the entry from re-triggering for N turns after activation. Leave blank to skip.');
    cooldownLabel.append(cooldownLabelHint);
    cooldownContainer.append(cooldownLabel);

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

    const applyCooldown = document.createElement('div'); {
        applyCooldown.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
        setTooltip(applyCooldown, 'Apply this cooldown value to all selected entries');
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
            const rows = getSafeTbodyRows();
            if (!rows) return;
            const targets = getBulkTargets(rows);
            const books = new Set();
            for (const { tr, bookName, entryData } of targets) {
                books.add(bookName);
                entryData.cooldown = parsed;
                const rowInp = tr.querySelector('[name="cooldown"]');
                if (rowInp) rowInp.value = String(parsed);
            }
            await saveUpdatedBooks(books);
            applyCooldown.classList.remove('stwid--applyDirty');
        };
        applyCooldown.addEventListener('click', runApplyCooldown);
        applyRegistry.push({ isDirty: () => applyCooldown.classList.contains('stwid--applyDirty'), runApply: runApplyCooldown });
        cooldownContainer.append(applyCooldown);
    }
    cooldownInput.addEventListener('change', () => applyCooldown.classList.add('stwid--applyDirty'));

    row.append(cooldownContainer);

    // ── Delay container ────────────────────────────────────────────────────
    const bulkDelayContainer = document.createElement('div');
    bulkDelayContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    bulkDelayContainer.dataset.field = 'bulkDelay';

    const bulkDelayLabel = document.createElement('span');
    bulkDelayLabel.classList.add('stwid--bulkEditLabel');
    bulkDelayLabel.textContent = 'Delay';
    const bulkDelayLabelHint = document.createElement('i');
    bulkDelayLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(bulkDelayLabelHint, 'Delay turns — the entry will not activate until N messages have passed since the chat started. Leave blank to skip.');
    bulkDelayLabel.append(bulkDelayLabelHint);
    bulkDelayContainer.append(bulkDelayLabel);

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

    const applyBulkDelay = document.createElement('div'); {
        applyBulkDelay.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
        setTooltip(applyBulkDelay, 'Apply this delay value to all selected entries');
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
            const rows = getSafeTbodyRows();
            if (!rows) return;
            const targets = getBulkTargets(rows);
            const books = new Set();
            for (const { tr, bookName, entryData } of targets) {
                books.add(bookName);
                entryData.delay = parsed;
                const rowInp = tr.querySelector('[name="delay"]');
                if (rowInp) rowInp.value = String(parsed);
            }
            await saveUpdatedBooks(books);
            applyBulkDelay.classList.remove('stwid--applyDirty');
        };
        applyBulkDelay.addEventListener('click', runApplyBulkDelay);
        applyRegistry.push({ isDirty: () => applyBulkDelay.classList.contains('stwid--applyDirty'), runApply: runApplyBulkDelay });
        bulkDelayContainer.append(applyBulkDelay);
    }
    bulkDelayInput.addEventListener('change', () => applyBulkDelay.classList.add('stwid--applyDirty'));

    row.append(bulkDelayContainer);

    // ── Apply All Changes container ────────────────────────────────────────
    const applyAllContainer = document.createElement('div');
    applyAllContainer.classList.add('stwid--thinContainer', 'stwid--bulkEditContainer');
    applyAllContainer.dataset.field = 'applyAll';

    const applyAllLabel = document.createElement('span');
    applyAllLabel.classList.add('stwid--bulkEditLabel');
    applyAllLabel.textContent = 'Apply All Changes';
    const applyAllLabelHint = document.createElement('i');
    applyAllLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
    setTooltip(applyAllLabelHint, 'Applies all containers that have unsaved changes. Skips containers that have not been modified.');
    applyAllLabel.append(applyAllLabelHint);
    applyAllContainer.append(applyAllLabel);

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

    // Gather all content after rowTitle into a collapsible wrapper
    const contentWrap = document.createElement('div');
    contentWrap.classList.add('stwid--rowContentWrap');
    while (row.children.length > 1) {
        contentWrap.append(row.children[1]); // row.children[0] is rowTitle
    }
    row.append(contentWrap);

    // Wire collapse toggle
    rowTitle.addEventListener('click', () => {
        const isCollapsed = row.dataset.collapsed === 'true';
        if (isCollapsed) {
            // Expanding
            row.dataset.collapsed = 'false';
            row.classList.remove('stwid--collapsed');
            contentWrap.style.overflow = 'hidden';
            contentWrap.style.maxHeight = '1000px';
            collapseChevron.classList.remove('fa-chevron-right');
            collapseChevron.classList.add('fa-chevron-down');
            contentWrap.addEventListener('transitionend', () => {
                contentWrap.style.overflow = '';
                contentWrap.style.maxHeight = '';
            }, { once: true });
        } else {
            // Collapsing: close open dropdowns, then animate
            closeOpenMultiselectDropdownMenus();
            contentWrap.style.overflow = 'hidden';
            contentWrap.style.maxHeight = contentWrap.scrollHeight + 'px';
            // Force reflow so the browser registers the pinned height before animating
            void contentWrap.offsetHeight;
            contentWrap.style.maxHeight = '0';
            row.dataset.collapsed = 'true';
            row.classList.add('stwid--collapsed');
            collapseChevron.classList.remove('fa-chevron-down');
            collapseChevron.classList.add('fa-chevron-right');
        }
    });

    return { element: row, refreshSelectionCount, cleanup };
}

