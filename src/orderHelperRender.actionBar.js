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
 *   isOrderHelperRowSelected: function,
 *   setAllOrderHelperRowSelected: function,
 *   updateOrderHelperSelectAllButton: function,
 *   getOrderHelperRows: function,
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
    isOrderHelperRowSelected,
    setAllOrderHelperRowSelected,
    updateOrderHelperSelectAllButton,
    getOrderHelperRows,
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

    // ── Select-all toggle ─────────────────────────────────────────────────
    const selectAll = document.createElement('div'); {
        dom.order.selectAll = selectAll;
        selectAll.classList.add('menu_button');
        selectAll.classList.add('fa-solid', 'fa-fw', 'fa-square-check', 'stwid--active');
        setTooltip(selectAll, 'Select/unselect all entries for Apply Order');
        selectAll.addEventListener('click', ()=>{
            const rows = getOrderHelperRows();
            const shouldSelect = !rows.length || rows.some(row=>!isOrderHelperRowSelected(row));
            setAllOrderHelperRowSelected(shouldSelect);
            updateOrderHelperSelectAllButton();
        });
        row.append(selectAll);
    }

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

    const countEl = document.createElement('span');
    countEl.classList.add('stwid--visibilityCount');
    countEl.textContent = 'Showing 0 of 0 entries';
    visibilityInfo.append(countEl);

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
        // Count
        const rows = dom.order.tbody ? [...dom.order.tbody.children] : [];
        const total = rows.length;
        const visible = rows.filter((r)=>!r.classList.contains('stwid--isFiltered')).length;
        countEl.textContent = `Showing ${visible} of ${total} entries`;

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
 * Contains one bordered labeled container per bulk-editable field.
 * Currently only the "Order" container (start / spacing / direction / apply).
 *
 * @param {{
 *   dom: object,
 *   orderHelperState: object,
 *   cache: object,
 *   saveWorldInfo: function,
 *   buildSavePayload: function,
 *   isOrderHelperRowSelected: function,
 *   getOrderHelperRows: function,
 * }} ctx
 * @returns {HTMLElement}
 */
export function buildBulkEditRow({
    dom,
    orderHelperState, // eslint-disable-line no-unused-vars
    cache,
    saveWorldInfo,
    buildSavePayload,
    isOrderHelperRowSelected,
    getOrderHelperRows, // eslint-disable-line no-unused-vars
}) {
    const row = document.createElement('div');
    row.classList.add('stwid--bulkEditRow');

    // ── Order container ───────────────────────────────────────────────────
    const orderContainer = document.createElement('div');
    orderContainer.classList.add('stwid--bulkEditContainer');
    orderContainer.dataset.field = 'order';

    const orderLabel = document.createElement('span');
    orderLabel.classList.add('stwid--bulkEditLabel');
    orderLabel.textContent = 'Order';
    orderContainer.append(orderLabel);

    // Apply Order button (created before direction radios because the direction
    // radio listeners reference it to toggle its icon class).
    const apply = document.createElement('div'); {
        apply.classList.add('menu_button');
        apply.classList.add('fa-solid', 'fa-fw');
        if ((localStorage.getItem('stwid--order-direction') ?? 'down') == 'up') {
            apply.classList.add('fa-arrow-up-9-1');
        } else {
            apply.classList.add('fa-arrow-down-1-9');
        }
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
                        apply.classList.remove('fa-arrow-down-1-9');
                        apply.classList.add('fa-arrow-up-9-1');
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
                        apply.classList.add('fa-arrow-down-1-9');
                        apply.classList.remove('fa-arrow-up-9-1');
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

    return row;
}
