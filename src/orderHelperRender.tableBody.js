import { setTooltip, formatCharacterFilter } from './orderHelperRender.utils.js';
import { ORDER_HELPER_RECURSION_OPTIONS } from './constants.js';

/**
 * Builds the Order Helper table body (`<tbody>`) with one row per entry.
 * Also wires jQuery sortable drag reordering and runs all structured filters
 * at the end so the initial view is correctly filtered.
 *
 * @param {{
 *   entries: Array,
 *   orderHelperState: object,
 *   dom: object,
 *   cache: object,
 *   refreshOutletFilterIndicator: function,
 *   refreshAutomationIdFilterIndicator: function,
 *   refreshGroupFilterIndicator: function,
 *   isOutletPosition: function,
 *   saveWorldInfo: function,
 *   buildSavePayload: function,
 *   focusWorldEntry: function,
 *   isOrderHelperRowSelected: function,
 *   setOrderHelperRowSelected: function,
 *   updateOrderHelperSelectAllButton: function,
 *   refreshSelectionCount: function,
 *   setOrderHelperRowFilterState: function,
 *   applyOrderHelperStrategyFilterToRow: function,
 *   applyOrderHelperPositionFilterToRow: function,
 *   applyOrderHelperRecursionFilterToRow: function,
 *   applyOrderHelperStrategyFilters: function,
 *   applyOrderHelperRecursionFilters: function,
 *   applyOrderHelperOutletFilters: function,
 *   applyOrderHelperAutomationIdFilters: function,
 *   applyOrderHelperGroupFilters: function,
 *   syncOrderHelperOutletFilters: function,
 *   syncOrderHelperAutomationIdFilters: function,
 *   syncOrderHelperGroupFilters: function,
 *   getEditorPanelApi: function,
 *   entryState: function,
 *   getOrderHelperRows: function,
 *   setOrderHelperSort: function,
 *   SORT: object,
 *   SORT_DIRECTION: object,
 *   getSortableDelay: function,
 *   $: function,
 * }} ctx
 * @returns {HTMLElement} The `<tbody>` element to insert into the table.
 */
export function buildTableBody({
    entries,
    orderHelperState,
    dom,
    cache,
    refreshOutletFilterIndicator,
    refreshAutomationIdFilterIndicator,
    refreshGroupFilterIndicator,
    isOutletPosition,
    saveWorldInfo,
    buildSavePayload,
    focusWorldEntry,
    isOrderHelperRowSelected,
    setOrderHelperRowSelected,
    updateOrderHelperSelectAllButton,
    refreshSelectionCount,
    setOrderHelperRowFilterState,
    applyOrderHelperStrategyFilterToRow,
    applyOrderHelperPositionFilterToRow,
    applyOrderHelperRecursionFilterToRow,
    applyOrderHelperStrategyFilters,
    applyOrderHelperRecursionFilters,
    applyOrderHelperOutletFilters,
    applyOrderHelperAutomationIdFilters,
    applyOrderHelperGroupFilters,
    syncOrderHelperOutletFilters,
    syncOrderHelperAutomationIdFilters,
    syncOrderHelperGroupFilters,
    getEditorPanelApi,
    entryState,
    getOrderHelperRows,
    setOrderHelperSort,
    SORT,
    SORT_DIRECTION,
    getSortableDelay,
    $,
}) {
    const tbody = document.createElement('tbody');
    dom.order.tbody = tbody;

    // Phase 4 – Invariant: these three template controls must exist in the host DOM
    // (#entry_edit_template) before Order Helper renders. If any is missing, a later
    // cloneNode call would silently produce a broken element; fail fast here instead.
    const entryEditTemplate = document.querySelector('#entry_edit_template');
    const enabledToggleTemplate = entryEditTemplate?.querySelector('[name="entryKillSwitch"]');
    const strategyTemplate = entryEditTemplate?.querySelector('[name="entryStateSelector"]');
    const positionTemplate = entryEditTemplate?.querySelector('[name="position"]');
    if (!enabledToggleTemplate || !strategyTemplate || !positionTemplate) {
        throw new Error('[WorldInfoDrawer] Missing entry edit template controls for Order Helper render.');
    }

    const getVisibleOrderHelperRows = ()=>{
        const rows = getOrderHelperRows();
        return rows.filter((row)=>!row.classList.contains('stwid--isFiltered'));
    };

    const updateCustomOrderFromDom = async()=>{
        setOrderHelperSort(SORT.CUSTOM, SORT_DIRECTION.ASCENDING);
        const rows = [...(dom.order.tbody?.querySelectorAll('tr') ?? [])];
        const booksUpdated = new Set();
        const nextIndexByBook = new Map();
        for (const row of rows) {
            const bookName = row.getAttribute('data-book');
            const uid = row.getAttribute('data-uid');
            const nextIndex = nextIndexByBook.get(bookName) ?? 0;
            const entry = cache[bookName].entries[uid];
            entry.extensions ??= {};
            if (entry.extensions.display_index !== nextIndex) {
                entry.extensions.display_index = nextIndex;
                booksUpdated.add(bookName);
            }
            nextIndexByBook.set(bookName, nextIndex + 1);
        }
        for (const bookName of booksUpdated) {
            await saveWorldInfo(bookName, buildSavePayload(bookName), true);
        }
    };

    $(tbody).sortable({
        delay: getSortableDelay(),
        update: async()=>{
            await updateCustomOrderFromDom();
        },
    });

    // ── Per-entry rows ────────────────────────────────────────────────────────
    for (const e of entries) {
        const tr = document.createElement('tr'); {
            tr.setAttribute('data-book', e.book);
            tr.setAttribute('data-uid', e.data.uid);

            // Phase 4 – Invariant: these dataset keys are the single source of truth
            // for row filter visibility. They must be kept in sync with the filter key
            // names used by orderHelperFilters.js (setOrderHelperRowFilterState).
            // Never rename or remove a key here without updating that module too.
            tr.dataset.stwidFilterStrategy = 'false';
            tr.dataset.stwidFilterPosition = 'false';
            tr.dataset.stwidFilterRecursion = 'false';
            tr.dataset.stwidFilterOutlet = 'false';
            tr.dataset.stwidFilterAutomationId = 'false';
            tr.dataset.stwidFilterGroup = 'false';
            tr.dataset.stwidFilterScript = 'false';

            if (!dom.order.entries[e.book]) {
                dom.order.entries[e.book] = {};
            }
            dom.order.entries[e.book][e.data.uid] = tr;

            // Select cell
            const select = document.createElement('td'); {
                select.setAttribute('data-col', 'select');
                const btn = document.createElement('div'); {
                    btn.classList.add('stwid--orderSelect');
                    btn.classList.add('fa-solid', 'fa-fw');
                    setTooltip(btn, 'Include/exclude this row from Apply Order');
                    const icon = document.createElement('i'); {
                        icon.classList.add('fa-solid', 'fa-fw', 'stwid--icon');
                        btn.append(icon);
                    }
                    btn.addEventListener('click', ()=>{
                        setOrderHelperRowSelected(tr, !isOrderHelperRowSelected(tr));
                        updateOrderHelperSelectAllButton();
                        refreshSelectionCount?.();
                    });
                    select.append(btn);
                }
                tr.append(select);
            }

            // Drag handle + move-up/down buttons
            const handle = document.createElement('td'); {
                handle.setAttribute('data-col', 'drag');
                const controls = document.createElement('div'); {
                    controls.classList.add('stwid--orderMove');
                    const createMoveButton = (direction, iconClass, title, jumpTitle)=>{
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.classList.add('stwid--orderMoveButton');
                        setTooltip(button, `${title}. Double-click to jump to ${jumpTitle}`);
                        const icon = document.createElement('i'); {
                            icon.classList.add('fa-solid', 'fa-fw', iconClass);
                            button.append(icon);
                        }
                        let clickTimer;
                        button.addEventListener('click', (event)=>{
                            event.preventDefault();
                            event.stopPropagation();
                            if (clickTimer) {
                                window.clearTimeout(clickTimer);
                            }
                            clickTimer = window.setTimeout(()=>{
                                const visibleRows = getVisibleOrderHelperRows();
                                if (!visibleRows.length || tr.classList.contains('stwid--isFiltered')) return;
                                const index = visibleRows.indexOf(tr);
                                if (index === -1) return;
                                const targetRow = direction === 'up'
                                    ? visibleRows[index - 1]
                                    : visibleRows[index + 1];
                                if (!targetRow) return;
                                if (direction === 'up') {
                                    dom.order.tbody.insertBefore(tr, targetRow);
                                } else {
                                    targetRow.insertAdjacentElement('afterend', tr);
                                }
                                void updateCustomOrderFromDom();
                            }, 250);
                        });
                        button.addEventListener('dblclick', (event)=>{
                            event.preventDefault();
                            event.stopPropagation();
                            if (clickTimer) {
                                window.clearTimeout(clickTimer);
                                clickTimer = null;
                            }
                            const visibleRows = getVisibleOrderHelperRows();
                            if (!visibleRows.length || tr.classList.contains('stwid--isFiltered')) return;
                            const targetRow = direction === 'up'
                                ? visibleRows[0]
                                : visibleRows[visibleRows.length - 1];
                            if (!targetRow || targetRow === tr) return;
                            if (direction === 'up') {
                                dom.order.tbody.insertBefore(tr, targetRow);
                            } else {
                                targetRow.insertAdjacentElement('afterend', tr);
                            }
                            void updateCustomOrderFromDom();
                        });
                        return button;
                    };
                    const upButton = createMoveButton(
                        'up',
                        'fa-caret-up',
                        'Move up',
                        'the top of the filtered list',
                    );
                    const downButton = createMoveButton(
                        'down',
                        'fa-caret-down',
                        'Move down',
                        'the bottom of the filtered list',
                    );
                    const dragHandle = document.createElement('div'); {
                        dragHandle.classList.add('stwid--sortableHandle', 'fa-solid', 'fa-fw', 'fa-grip-lines');
                        setTooltip(dragHandle, 'Drag to reorder rows');
                        controls.append(upButton, dragHandle, downButton);
                    }
                    handle.append(controls);
                }
                tr.append(handle);
            }

            // Enabled toggle
            const active = document.createElement('td'); {
                active.setAttribute('data-col', 'enabled');
                const isEnabled = /**@type {HTMLSelectElement}*/(enabledToggleTemplate.cloneNode(true)); {
                    isEnabled.classList.add('stwid--enabled');
                    setTooltip(isEnabled, 'Enable/disable this entry');

                    const applyEnabledIcon = (el, disabled)=>{
                        el.classList.toggle('fa-toggle-off', Boolean(disabled));
                        el.classList.toggle('fa-toggle-on', !Boolean(disabled));
                    };

                    applyEnabledIcon(isEnabled, e.data.disable);
                    isEnabled.addEventListener('click', async()=>{
                        // Phase 2: update cache → update e.data → update UI → sync list panel → save
                        const entryData = cache[e.book].entries[e.data.uid];
                        const nextDisabled = !entryData.disable;
                        entryData.disable = nextDisabled;
                        e.data.disable = nextDisabled;
                        applyEnabledIcon(isEnabled, nextDisabled);

                        // Keep list panel row icon in sync too.
                        const listToggle = cache[e.book].dom.entry?.[e.data.uid]?.isEnabled;
                        if (listToggle) {
                            applyEnabledIcon(listToggle, nextDisabled);
                        }

                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                    });
                    active.append(isEnabled);
                }
                tr.append(active);
            }

            // Entry cell (book label, comment link, key text)
            const entry = document.createElement('td'); {
                entry.setAttribute('data-col', 'entry');
                const wrap = document.createElement('div'); {
                    wrap.classList.add('stwid--colwrap');
                    wrap.classList.add('stwid--entry');
                    const bookLabel = document.createElement('div'); {
                        bookLabel.classList.add('stwid--book');
                        const i = document.createElement('i'); {
                            i.classList.add('fa-solid', 'fa-fw', 'fa-book-atlas');
                            bookLabel.append(i);
                        }
                        const txt = document.createElement('span'); {
                            txt.textContent = e.book;
                            bookLabel.append(txt);
                        }
                        wrap.append(bookLabel);
                    }
                    const comment = document.createElement('a'); {
                        comment.classList.add('stwid--comment', 'stwid--commentLink');
                        comment.href = `#world_entry/${encodeURIComponent(e.data.uid)}`;
                        comment.textContent = e.data.comment;
                        comment.addEventListener('click', (evt)=>{
                            evt.preventDefault();
                            focusWorldEntry(e.book, e.data.uid);
                        });
                        wrap.append(comment);
                    }
                    const key = document.createElement('div'); {
                        key.classList.add('stwid--key');
                        key.textContent = e.data.key.join(', ');
                    }
                    wrap.append(key);
                    entry.append(wrap);
                }
                tr.append(entry);
            }

            // Strategy cell
            const strategy = document.createElement('td'); {
                strategy.setAttribute('data-col', 'strategy');
                const strat = /**@type {HTMLSelectElement}*/(strategyTemplate.cloneNode(true)); {
                    strat.classList.add('stwid--strategy');
                    setTooltip(strat, 'Entry strategy');
                    strat.value = entryState(e.data);
                    strat.addEventListener('change', async()=>{
                        // Phase 2: update list panel DOM → update cache → apply filter → save
                        const value = strat.value;
                        cache[e.book].dom.entry[e.data.uid].strategy.value = value;
                        switch (value) {
                            case 'constant': {
                                cache[e.book].entries[e.data.uid].constant = true;
                                cache[e.book].entries[e.data.uid].vectorized = false;
                                break;
                            }
                            case 'normal': {
                                cache[e.book].entries[e.data.uid].constant = false;
                                cache[e.book].entries[e.data.uid].vectorized = false;
                                break;
                            }
                            case 'vectorized': {
                                cache[e.book].entries[e.data.uid].constant = false;
                                cache[e.book].entries[e.data.uid].vectorized = true;
                                break;
                            }
                        }
                        applyOrderHelperStrategyFilterToRow(tr, cache[e.book].entries[e.data.uid]);
                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                    });
                    strategy.append(strat);
                }
                tr.append(strategy);
            }

            // Position cell
            // updateOutlet is declared here and assigned inside the outlet cell below,
            // so the position change handler can call it to refresh outlet visibility.
            let updateOutlet;
            const pos = /**@type {HTMLSelectElement}*/(positionTemplate.cloneNode(true));
            const position = document.createElement('td'); {
                position.setAttribute('data-col', 'position');
                cache[e.book].dom.entry[e.data.uid].position = pos;
                pos.classList.add('stwid--position');
                setTooltip(pos, 'Where this entry is inserted');
                pos.value = e.data.position;
                pos.addEventListener('change', async()=>{
                    // Phase 2: update cache → update e.data → apply filter → refresh outlet → save
                    const value = pos.value;
                    cache[e.book].dom.entry[e.data.uid].position.value = value;
                    cache[e.book].entries[e.data.uid].position = value;
                    e.data.position = value;
                    applyOrderHelperPositionFilterToRow(tr, cache[e.book].entries[e.data.uid]);
                    updateOutlet?.();
                    await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                });
                position.append(pos);
                tr.append(position);
            }

            // Depth cell
            const depth = document.createElement('td'); {
                depth.setAttribute('data-col', 'depth');
                depth.classList.add('stwid--orderTable--NumberColumns');
                const inp = document.createElement('input'); {
                    inp.classList.add('stwid--input');
                    inp.classList.add('text_pole');
                    inp.name = 'depth';
                    setTooltip(inp, 'Entry depth');
                    inp.min = '0';
                    inp.max = '99999';
                    inp.type = 'number';
                    inp.value = e.data.depth ?? '';
                    inp.addEventListener('change', async()=>{
                        const depth = parseInt(inp.value);
                        cache[e.book].entries[e.data.uid].depth = Number.isFinite(depth) ? depth : undefined;
                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                    });
                    depth.append(inp);
                }
                tr.append(depth);
            }

            // Outlet cell
            const outlet = document.createElement('td'); {
                outlet.setAttribute('data-col', 'outlet');
                const wrap = document.createElement('div'); {
                    wrap.classList.add('stwid--colwrap');
                    wrap.classList.add('stwid--outlet');
                    const input = document.createElement('input'); {
                        input.classList.add('stwid--input');
                        input.classList.add('text_pole');
                        input.classList.add('stwid--orderInputTight');
                        input.name = 'outletName';
                        setTooltip(input, 'Outlet name (used for outlet positions)');
                        input.type = 'text';
                        input.value = cache[e.book].entries[e.data.uid].outletName ?? e.data.outletName ?? '';
                        updateOutlet = ()=>{
                            const entryData = cache[e.book].entries[e.data.uid];
                            const currentPosition = entryData.position ?? pos.value;
                            const outletName = entryData.outletName ?? e.data.outletName ?? '';
                            input.value = outletName;
                            wrap.hidden = !isOutletPosition(currentPosition);
                        };
                        updateOutlet();
                        input.addEventListener('change', async()=>{
                            // Phase 2: update cache → update e.data → sync filter options
                            // → refresh header indicator → apply filter → save → refresh visibility
                            const value = input.value;
                            cache[e.book].entries[e.data.uid].outletName = value;
                            e.data.outletName = value;
                            syncOrderHelperOutletFilters();
                            refreshOutletFilterIndicator();
                            applyOrderHelperOutletFilters();
                            await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                            updateOutlet();
                        });
                        wrap.append(input);
                    }
                    outlet.append(wrap);
                }
                tr.append(outlet);
            }

            // Inclusion group cell (group name + prioritize checkbox)
            const group = document.createElement('td'); {
                group.setAttribute('data-col', 'group');
                const wrap = document.createElement('div'); {
                    wrap.classList.add('stwid--colwrap');
                    wrap.classList.add('stwid--outlet');
                    wrap.classList.add('stwid--recursionOptions');
                    const input = document.createElement('input'); {
                        input.classList.add('stwid--input');
                        input.classList.add('text_pole');
                        input.classList.add('stwid--orderInputTight');
                        input.name = 'group';
                        setTooltip(input, 'Inclusion group name');
                        input.type = 'text';
                        input.value = cache[e.book].entries[e.data.uid].group ?? '';
                        input.addEventListener('change', async()=>{
                            // Phase 2: update cache → update e.data → sync filter options
                            // → refresh header indicator → apply filter → save
                            const value = input.value;
                            const entryData = cache[e.book].entries[e.data.uid];
                            entryData.group = value;
                            e.data.group = value;
                            syncOrderHelperGroupFilters();
                            refreshGroupFilterIndicator();
                            applyOrderHelperGroupFilters();
                            await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                        });
                        wrap.append(input);
                    }
                    wrap.append(document.createElement('br'));
                    const row = document.createElement('label'); {
                        row.classList.add('stwid--recursionRow');
                        const input = document.createElement('input'); {
                            input.type = 'checkbox';
                            input.classList.add('checkbox');
                            setTooltip(input, 'Prioritize this entry within its inclusion group');
                            input.checked = Boolean(e.data.groupOverride);
                            input.addEventListener('change', async()=>{
                                const entryData = cache[e.book].entries[e.data.uid];
                                entryData.groupOverride = input.checked;
                                e.data.groupOverride = input.checked;
                                await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                            });
                            row.append(input);
                        }
                        row.append('Prioritize');
                        wrap.append(row);
                    }
                    group.append(wrap);
                }
                tr.append(group);
            }

            // Order cell
            const order = document.createElement('td'); {
                order.setAttribute('data-col', 'order');
                order.classList.add('stwid--orderTable--NumberColumns');
                const inp = document.createElement('input'); {
                    inp.classList.add('stwid--input');
                    inp.classList.add('text_pole');
                    inp.name = 'order';
                    setTooltip(inp, 'Order value');
                    inp.min = '0';
                    inp.max = '99999';
                    inp.type = 'number';
                    inp.value = e.data.order ?? '';
                    inp.addEventListener('change', async()=>{
                        const order = parseInt(inp.value);
                        cache[e.book].entries[e.data.uid].order = Number.isFinite(order) ? order : undefined;
                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                    });
                    order.append(inp);
                }
                tr.append(order);
            }

            // Sticky cell
            const sticky = document.createElement('td'); {
                sticky.setAttribute('data-col', 'sticky');
                sticky.classList.add('stwid--orderTable--NumberColumns');
                const inp = document.createElement('input'); {
                    inp.classList.add('stwid--input');
                    inp.classList.add('text_pole');
                    inp.name = 'sticky';
                    setTooltip(inp, 'Sticky duration');
                    inp.min = '0';
                    inp.max = '99999';
                    inp.type = 'number';
                    inp.value = e.data.sticky ?? '';
                    inp.addEventListener('change', async()=>{
                        const value = parseInt(inp.value);
                        cache[e.book].entries[e.data.uid].sticky = Number.isFinite(value) ? value : undefined;
                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                    });
                    sticky.append(inp);
                }
                tr.append(sticky);
            }

            // Cooldown cell
            const cooldown = document.createElement('td'); {
                cooldown.setAttribute('data-col', 'cooldown');
                cooldown.classList.add('stwid--orderTable--NumberColumns');
                const inp = document.createElement('input'); {
                    inp.classList.add('stwid--input');
                    inp.classList.add('text_pole');
                    inp.name = 'cooldown';
                    setTooltip(inp, 'Cooldown duration');
                    inp.min = '0';
                    inp.max = '99999';
                    inp.type = 'number';
                    inp.value = e.data.cooldown ?? '';
                    inp.addEventListener('change', async()=>{
                        const value = parseInt(inp.value);
                        cache[e.book].entries[e.data.uid].cooldown = Number.isFinite(value) ? value : undefined;
                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                    });
                    cooldown.append(inp);
                }
                tr.append(cooldown);
            }

            // Delay cell
            const delay = document.createElement('td'); {
                delay.setAttribute('data-col', 'delay');
                delay.classList.add('stwid--orderTable--NumberColumns');
                const inp = document.createElement('input'); {
                    inp.classList.add('stwid--input');
                    inp.classList.add('text_pole');
                    inp.name = 'delay';
                    setTooltip(inp, 'Delay before activation');
                    inp.min = '0';
                    inp.max = '99999';
                    inp.type = 'number';
                    inp.value = e.data.delay ?? '';
                    inp.addEventListener('change', async()=>{
                        const value = parseInt(inp.value);
                        cache[e.book].entries[e.data.uid].delay = Number.isFinite(value) ? value : undefined;
                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                    });
                    delay.append(inp);
                }
                tr.append(delay);
            }

            // Automation ID cell
            const automationId = document.createElement('td'); {
                automationId.setAttribute('data-col', 'automationId');
                automationId.classList.add('stwid--orderTable--NumberColumns');
                const inp = document.createElement('input'); {
                    inp.classList.add('stwid--input');
                    inp.classList.add('text_pole');
                    inp.classList.add('stwid--orderInputTight');
                    inp.name = 'automationId';
                    setTooltip(inp, 'Automation ID');
                    inp.type = 'text';
                    inp.value = cache[e.book].entries[e.data.uid].automationId ?? e.data.automationId ?? '';
                    inp.addEventListener('change', async()=>{
                        // Phase 2: update cache → update e.data → sync filter options
                        // → refresh header indicator → apply filter → save
                        const value = inp.value;
                        cache[e.book].entries[e.data.uid].automationId = value;
                        e.data.automationId = value;
                        syncOrderHelperAutomationIdFilters();
                        refreshAutomationIdFilterIndicator();
                        applyOrderHelperAutomationIdFilters();
                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                    });
                    automationId.append(inp);
                }
                tr.append(automationId);
            }

            // Trigger % cell
            const probability = document.createElement('td'); {
                probability.setAttribute('data-col', 'trigger');
                probability.classList.add('stwid--orderTable--NumberColumns');
                const inp = document.createElement('input'); {
                    inp.classList.add('stwid--input');
                    inp.classList.add('text_pole');
                    inp.name = 'selective_probability';
                    setTooltip(inp, 'Trigger chance percentage');
                    inp.min = '0';
                    inp.max = '100';
                    inp.type = 'number';
                    inp.value = e.data.selective_probability ?? '';
                    inp.addEventListener('change', async()=>{
                        const probability = parseInt(inp.value);
                        cache[e.book].entries[e.data.uid].selective_probability = Number.isFinite(probability) ? probability : undefined;
                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                    });
                    probability.append(inp);
                }
                tr.append(probability);
            }

            // Recursion cell (uses ORDER_HELPER_RECURSION_OPTIONS shared with the header filter)
            const recursion = document.createElement('td'); {
                recursion.setAttribute('data-col', 'recursion');
                const wrap = document.createElement('div'); {
                    wrap.classList.add('stwid--recursionOptions');
                    const addCheckbox = (key, label)=> {
                        const row = document.createElement('label'); {
                            row.classList.add('stwid--recursionRow');
                            const input = document.createElement('input'); {
                                input.type = 'checkbox';
                                input.classList.add('checkbox');
                                setTooltip(input, label);
                                input.checked = Boolean(e.data[key]);
                                input.addEventListener('change', async()=> {
                                    const entryData = cache[e.book].entries[e.data.uid];
                                    entryData[key] = input.checked;
                                    e.data[key] = input.checked;
                                    applyOrderHelperRecursionFilterToRow(tr, entryData);
                                    await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                                });
                                row.append(input);
                            }
                            row.append(label);
                            wrap.append(row);
                        }
                    };
                    for (const { value, label } of ORDER_HELPER_RECURSION_OPTIONS) {
                        addCheckbox(value, label);
                    }
                    recursion.append(wrap);
                }
                tr.append(recursion);
            }

            // Budget cell (ignore-budget toggle)
            const budget = document.createElement('td'); {
                budget.setAttribute('data-col', 'budget');
                const wrap = document.createElement('div'); {
                    wrap.classList.add('stwid--recursionOptions');
                    const row = document.createElement('label'); {
                        row.classList.add('stwid--recursionRow');
                        const input = document.createElement('input'); {
                            input.type = 'checkbox';
                            input.classList.add('checkbox');
                            setTooltip(input, 'Ignore World Info budget limit for this entry');
                            input.checked = Boolean(e.data.ignoreBudget);
                            input.addEventListener('change', async()=> {
                                const entryData = cache[e.book].entries[e.data.uid];
                                entryData.ignoreBudget = input.checked;
                                e.data.ignoreBudget = input.checked;
                                await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                            });
                            row.append(input);
                        }
                        row.append('Ignore budget');
                        wrap.append(row);
                    }
                    budget.append(wrap);
                }
                tr.append(budget);
            }

            // Character filter cell (read-only display)
            const characterFilter = document.createElement('td'); {
                characterFilter.setAttribute('data-col', 'characterFilter');
                const wrap = document.createElement('div'); {
                    wrap.classList.add('stwid--colwrap', 'stwid--characterFilterOptions');
                    const lines = formatCharacterFilter(e.data);
                    if (!lines.length) {
                        wrap.textContent = '';
                    } else {
                        for (const line of lines) {
                            const row = document.createElement('div'); {
                                row.classList.add('stwid--characterFilterRow', `stwid--characterFilterRow--${line.mode}`);
                                const icon = document.createElement('i'); {
                                    icon.classList.add('fa-solid', 'fa-fw', line.icon);
                                    row.append(icon);
                                }
                                const text = document.createElement('span'); {
                                    text.textContent = line.label;
                                    row.append(text);
                                }
                                wrap.append(row);
                            }
                        }
                    }
                    characterFilter.append(wrap);
                }
                tr.append(characterFilter);
            }

            setOrderHelperRowSelected(tr, true);
            tbody.append(tr);
        }
    }

    // ── Post-build: apply all structured filters then update select-all state ─
    applyOrderHelperStrategyFilters();
    applyOrderHelperRecursionFilters();
    applyOrderHelperOutletFilters();
    applyOrderHelperAutomationIdFilters();
    applyOrderHelperGroupFilters();
    updateOrderHelperSelectAllButton();

    return tbody;
}
