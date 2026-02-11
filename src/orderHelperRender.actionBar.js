import {
    MULTISELECT_DROPDOWN_CLOSE_HANDLER,
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
    row.classList.add('stwid--visibilityRow');

    // ── Key column visibility toggle ──────────────────────────────────────
    const keyToggle = document.createElement('div'); {
        keyToggle.classList.add('menu_button');
        keyToggle.classList.add('fa-solid', 'fa-fw');
        setTooltip(keyToggle, 'Show/hide keyword column text');
        const applyKeyToggleStyle = ()=>{
            keyToggle.classList.toggle('fa-eye', !orderHelperState.hideKeys);
            keyToggle.classList.toggle('fa-eye-slash', orderHelperState.hideKeys);
            keyToggle.classList.toggle('stwid--active', orderHelperState.hideKeys);
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
                menu.classList.add('stwid--multiselectDropdownMenu');
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
                        action.classList.add('stwid--multiselectDropdownOption');
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
                        option.classList.add('stwid--multiselectDropdownOption');
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
            const is = dom.order.filter.root.classList.toggle('stwid--active');
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
 * }} ctx
 * @returns {{ element: HTMLElement, refreshSelectionCount: function }}
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
}) {
    const row = document.createElement('div');
    row.classList.add('stwid--bulkEditRow');

    // ── Select container ──────────────────────────────────────────────────
    const selectContainer = document.createElement('div');
    selectContainer.classList.add('stwid--bulkEditContainer');
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
        selectAll.classList.add('fa-solid', 'fa-fw', 'fa-square-check', 'stwid--active');
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
        const total = rows.length;
        const selected = rows.filter((r)=>isOrderHelperRowSelected(r)).length;
        selectionCountEl.textContent = `Selected ${selected} out of ${total} entries`;
    };

    // ── Toggle Active State container ─────────────────────────────────────
    const activeStateContainer = document.createElement('div');
    activeStateContainer.classList.add('stwid--bulkEditContainer');
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
        applyActiveState.addEventListener('click', async()=>{
            const willDisable = activeToggle.classList.contains('fa-toggle-off');
            const rows = [...dom.order.tbody.children];
            const books = [];
            for (const tr of rows) {
                if (tr.classList.contains('stwid--isFiltered')) continue;
                if (!isOrderHelperRowSelected(tr)) continue;
                const bookName = tr.getAttribute('data-book');
                const uid = tr.getAttribute('data-uid');
                if (!books.includes(bookName)) books.push(bookName);
                cache[bookName].entries[uid].disable = willDisable;
                const rowToggle = tr.querySelector('[name="entryKillSwitch"]');
                if (rowToggle) {
                    rowToggle.classList.toggle('fa-toggle-off', willDisable);
                    rowToggle.classList.toggle('fa-toggle-on', !willDisable);
                }
                const listToggle = cache[bookName].dom.entry?.[uid]?.isEnabled;
                if (listToggle) {
                    listToggle.classList.toggle('fa-toggle-off', willDisable);
                    listToggle.classList.toggle('fa-toggle-on', !willDisable);
                }
            }
            for (const bookName of books) {
                await saveWorldInfo(bookName, buildSavePayload(bookName), true);
            }
        });
        activeStateContainer.append(applyActiveState);
    }

    row.append(activeStateContainer);

    // ── Strategy container ────────────────────────────────────────────────
    const strategyContainer = document.createElement('div');
    strategyContainer.classList.add('stwid--bulkEditContainer');
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
        applyStrategy.addEventListener('click', async()=>{
            const value = strategySelect.value;
            if (!value) {
                toastr.warning('No strategy selected.');
                return;
            }
            const rows = [...dom.order.tbody.children];
            const books = [];
            for (const tr of rows) {
                if (tr.classList.contains('stwid--isFiltered')) continue;
                if (!isOrderHelperRowSelected(tr)) continue;
                const bookName = tr.getAttribute('data-book');
                const uid = tr.getAttribute('data-uid');
                if (!books.includes(bookName)) books.push(bookName);
                cache[bookName].entries[uid].constant   = value === 'constant';
                cache[bookName].entries[uid].vectorized = value === 'vectorized';
                const rowStrat = /**@type {HTMLSelectElement}*/(tr.querySelector('[name="entryStateSelector"]'));
                if (rowStrat) rowStrat.value = value;
                const domStrat = cache[bookName].dom?.entry?.[uid]?.strategy;
                if (domStrat) domStrat.value = value;
                applyOrderHelperStrategyFilterToRow(tr, cache[bookName].entries[uid]);
            }
            for (const bookName of books) {
                await saveWorldInfo(bookName, buildSavePayload(bookName), true);
            }
        });
        strategyContainer.append(applyStrategy);
    }

    row.append(strategyContainer);

    // ── Position container ────────────────────────────────────────────────
    const positionContainer = document.createElement('div');
    positionContainer.classList.add('stwid--bulkEditContainer');
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
        applyPosition.addEventListener('click', async()=>{
            const value = positionSelect.value;
            if (!value) {
                toastr.warning('No position selected.');
                return;
            }
            const rows = [...dom.order.tbody.children];
            const books = [];
            for (const tr of rows) {
                if (tr.classList.contains('stwid--isFiltered')) continue;
                if (!isOrderHelperRowSelected(tr)) continue;
                const bookName = tr.getAttribute('data-book');
                const uid = tr.getAttribute('data-uid');
                if (!books.includes(bookName)) books.push(bookName);
                cache[bookName].entries[uid].position = value;
                const domPos = cache[bookName].dom?.entry?.[uid]?.position;
                if (domPos) domPos.value = value;
                applyOrderHelperPositionFilterToRow(tr, cache[bookName].entries[uid]);
            }
            for (const bookName of books) {
                await saveWorldInfo(bookName, buildSavePayload(bookName), true);
            }
        });
        positionContainer.append(applyPosition);
    }

    row.append(positionContainer);

    // ── Order container ───────────────────────────────────────────────────
    const orderContainer = document.createElement('div');
    orderContainer.classList.add('stwid--bulkEditContainer');
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
        apply.addEventListener('click', async()=>{
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
            const up = dom.order.direction.up.checked;
            let order = start;
            let rows = [...dom.order.tbody.children];
            const books = [];
            if (up) rows.reverse();
            for (const tr of rows) {
                if (tr.classList.contains('stwid--isFiltered')) continue;
                if (!isOrderHelperRowSelected(tr)) continue;
                const bookName = tr.getAttribute('data-book');
                const uid = tr.getAttribute('data-uid');
                if (!books.includes(bookName)) books.push(bookName);
                cache[bookName].entries[uid].order = order;
                /**@type {HTMLInputElement}*/(tr.querySelector('[name="order"]')).value = order.toString();
                order += step;
            }
            for (const bookName of books) {
                await saveWorldInfo(bookName, buildSavePayload(bookName), true);
            }
        });
    }

    const startLbl = document.createElement('label'); {
        startLbl.classList.add('stwid--inputWrap');
        setTooltip(startLbl, 'Starting Order value');
        startLbl.append('Start: ');
        const start = document.createElement('input'); {
            dom.order.start = start;
            start.classList.add('stwid--input');
            start.classList.add('text_pole');
            start.type = 'number';
            start.min = '1';
            start.max = '10000';
            start.value = localStorage.getItem('stwid--order-start') ?? '100';
            start.addEventListener('change', ()=>{
                localStorage.setItem('stwid--order-start', start.value);
            });
            startLbl.append(start);
        }
        orderContainer.append(startLbl);
    }

    const stepLbl = document.createElement('label'); {
        stepLbl.classList.add('stwid--inputWrap');
        setTooltip(stepLbl, 'Spacing between Order values');
        stepLbl.append('Spacing: ');
        const step = document.createElement('input'); {
            dom.order.step = step;
            step.classList.add('stwid--input');
            step.classList.add('text_pole');
            step.type = 'number';
            step.min = '1';
            step.max = '10000';
            step.value = localStorage.getItem('stwid--order-step') ?? '10';
            step.addEventListener('change', ()=>{
                localStorage.setItem('stwid--order-step', step.value);
            });
            stepLbl.append(step);
        }
        orderContainer.append(stepLbl);
    }

    const dir = document.createElement('div'); {
        dir.classList.add('stwid--inputWrap');
        setTooltip(dir, 'Direction used when applying Order values');
        dir.append('Direction: ');
        const wrap = document.createElement('div'); {
            wrap.classList.add('stwid--toggleWrap');
            const up = document.createElement('label'); {
                up.classList.add('stwid--inputWrap');
                setTooltip(up, 'Start from the bottom row');
                const inp = document.createElement('input'); {
                    dom.order.direction.up = inp;
                    inp.type = 'radio';
                    inp.checked = (localStorage.getItem('stwid--order-direction') ?? 'down') == 'up';
                    inp.addEventListener('click', ()=>{
                        inp.checked = true;
                        dom.order.direction.down.checked = false;
                        localStorage.setItem('stwid--order-direction', 'up');
                    });
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
                    inp.checked = (localStorage.getItem('stwid--order-direction') ?? 'down') == 'down';
                    inp.addEventListener('click', ()=>{
                        inp.checked = true;
                        dom.order.direction.up.checked = false;
                        localStorage.setItem('stwid--order-direction', 'down');
                    });
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

    return { element: row, refreshSelectionCount };
}
