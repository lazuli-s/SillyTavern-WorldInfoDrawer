import { setTooltip, formatCharacterFilter } from '../utils.js';
import { ENTRY_MANAGER_RECURSION_OPTIONS } from '../../shared/constants.js';


function createBookSaveSerializer(saveWorldInfo, buildSavePayload) {
    
    const inFlightByBook = new Map();
    
    const pendingByBook = new Set();

    async function runSave(bookName) {
        do {
            pendingByBook.delete(bookName);
            try {
                await saveWorldInfo(bookName, buildSavePayload(bookName), true);
            } catch (err) {
                console.error('[WorldInfoDrawer] Entry Manager save failed for book:', bookName, err);
            }
        } while (pendingByBook.has(bookName));
        inFlightByBook.delete(bookName);
    }

    
    return async function enqueueSave(bookName) {
        if (inFlightByBook.has(bookName)) {
            pendingByBook.add(bookName);
            await inFlightByBook.get(bookName);
        } else {
            const p = runSave(bookName);
            inFlightByBook.set(bookName, p);
            await p;
        }
    };
}


function buildNumberInputCell({ col, name, tooltip, max = '99999', getValue, onSave }) {
    const td = document.createElement('td');
    td.setAttribute('data-col', col);
    td.classList.add('stwid--orderTable--NumberColumns');
    const inp = document.createElement('input');
    inp.classList.add('stwid--input', 'text_pole');
    inp.name = name;
    setTooltip(inp, tooltip);
    inp.min = '0';
    inp.max = max;
    inp.type = 'number';
    inp.value = getValue() ?? '';
    inp.addEventListener('change', async()=>{
        const value = parseInt(inp.value);
        await onSave(Number.isFinite(value) ? value : undefined);
    });
    td.append(inp);
    return td;
}


export function buildTableBody({
    entries,
    dom,
    cache,
    refreshOutletFilterIndicator,
    refreshAutomationIdFilterIndicator,
    refreshGroupFilterIndicator,
    isOutletPosition,
    saveWorldInfo,
    buildSavePayload,
    focusWorldEntry,
    isEntryManagerRowSelected,
    setEntryManagerRowSelected,
    updateEntryManagerSelectAllButton,
    refreshSelectionCount,
    applyEntryManagerStrategyFilterToRow,
    applyEntryManagerPositionFilterToRow,
    applyEntryManagerRecursionFilterToRow,
    applyEntryManagerStrategyFilters,
    applyEntryManagerRecursionFilters,
    applyEntryManagerOutletFilters,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilters,
    syncEntryManagerOutletFilters,
    syncEntryManagerAutomationIdFilters,
    syncEntryManagerGroupFilters,
    entryState,
    getEntryManagerRows,
    setEntryManagerSort,
    SORT,
    SORT_DIRECTION,
    getSortableDelay,
    $,
}) {
    const tbody = document.createElement('tbody');
    dom.order.tbody = tbody;

    
    
    const enqueueSave = createBookSaveSerializer(saveWorldInfo, buildSavePayload);

    
    
    
    const entryEditTemplate = document.querySelector('#entry_edit_template');
    const enabledToggleTemplate = entryEditTemplate?.querySelector('[name="entryKillSwitch"]');
    const strategyTemplate = entryEditTemplate?.querySelector('[name="entryStateSelector"]');
    const positionTemplate = entryEditTemplate?.querySelector('[name="position"]');
    if (!enabledToggleTemplate || !strategyTemplate || !positionTemplate) {
        throw new Error('[WorldInfoDrawer] Missing entry edit template controls for Entry Manager render.');
    }

    const getVisibleEntryManagerRows = ()=>{
        const rows = getEntryManagerRows();
        return rows.filter((row)=>!row.classList.contains('stwid--state-filtered'));
    };

    const updateCustomOrderFromDom = async()=>{
        
        if (!dom.order.tbody) return;
        setEntryManagerSort(SORT.CUSTOM, SORT_DIRECTION.ASCENDING);
        const rows = [...dom.order.tbody.querySelectorAll('tr')];
        const booksUpdated = new Set();
        const nextIndexByBook = new Map();
        for (const row of rows) {
            const bookName = row.getAttribute('data-book');
            const uid = row.getAttribute('data-uid');
            
            if (!bookName || !uid) continue;
            
            
            if (!cache[bookName]?.entries) continue;
            const entry = cache[bookName].entries[uid];
            if (!entry) continue;
            const nextIndex = nextIndexByBook.get(bookName) ?? 0;
            entry.extensions ??= {};
            if (entry.extensions.display_index !== nextIndex) {
                entry.extensions.display_index = nextIndex;
                booksUpdated.add(bookName);
            }
            nextIndexByBook.set(bookName, nextIndex + 1);
        }
        for (const bookName of booksUpdated) {
            await enqueueSave(bookName);
        }
    };

    $(tbody).sortable({
        delay: getSortableDelay(),
        update: async()=>{
            await updateCustomOrderFromDom();
        },
    });

    
    for (const e of entries) {
        const tr = document.createElement('tr'); {
            tr.setAttribute('data-book', e.book);
            tr.setAttribute('data-uid', e.data.uid);

            
            
            
            
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
                        setEntryManagerRowSelected(tr, !isEntryManagerRowSelected(tr));
                        updateEntryManagerSelectAllButton();
                        refreshSelectionCount?.();
                    });
                    select.append(btn);
                }
                tr.append(select);
            }

            
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
                                const visibleRows = getVisibleEntryManagerRows();
                                if (!visibleRows.length || tr.classList.contains('stwid--state-filtered')) return;
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
                            const visibleRows = getVisibleEntryManagerRows();
                            if (!visibleRows.length || tr.classList.contains('stwid--state-filtered')) return;
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

            
            const active = document.createElement('td'); {
                active.setAttribute('data-col', 'enabled');
                const isEnabled = (enabledToggleTemplate.cloneNode(true)); {
                    isEnabled.classList.add('stwid--enabled');
                    setTooltip(isEnabled, 'Enable/disable this entry');

                    const applyEnabledIcon = (el, disabled)=>{
                        el.classList.toggle('fa-toggle-off', Boolean(disabled));
                        el.classList.toggle('fa-toggle-on', !Boolean(disabled));
                    };

                    applyEnabledIcon(isEnabled, e.data.disable);
                    isEnabled.addEventListener('click', async()=>{
                        
                        const entryData = cache[e.book].entries[e.data.uid];
                        const nextDisabled = !entryData.disable;
                        entryData.disable = nextDisabled;
                        e.data.disable = nextDisabled;
                        applyEnabledIcon(isEnabled, nextDisabled);

                        
                        const listToggle = cache[e.book].dom.entry?.[e.data.uid]?.isEnabled;
                        if (listToggle) {
                            applyEnabledIcon(listToggle, nextDisabled);
                        }

                        await enqueueSave(e.book);
                    });
                    active.append(isEnabled);
                }
                tr.append(active);
            }

            
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
                        
                        
                        comment.textContent = e.data.comment ?? '';
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

            
            const strategy = document.createElement('td'); {
                strategy.setAttribute('data-col', 'strategy');
                const strat = (strategyTemplate.cloneNode(true)); {
                    strat.classList.add('stwid--strategy', 'stwid--smallSelectTextPole');
                    setTooltip(strat, 'Entry strategy');
                    strat.value = entryState(e.data);
                    strat.addEventListener('change', async()=>{
                        
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
                        applyEntryManagerStrategyFilterToRow(tr, cache[e.book].entries[e.data.uid]);
                        await enqueueSave(e.book);
                    });
                    strategy.append(strat);
                }
                tr.append(strategy);
            }

            
            
            
            let updateOutlet;
            const pos = (positionTemplate.cloneNode(true));
            const position = document.createElement('td'); {
                position.setAttribute('data-col', 'position');
                cache[e.book].dom.entry[e.data.uid].position = pos;
                pos.classList.add('stwid--position', 'stwid--smallSelectTextPole');
                setTooltip(pos, 'Where this entry is inserted');
                pos.value = e.data.position;
                pos.addEventListener('change', async()=>{
                    
                    const value = pos.value;
                    cache[e.book].dom.entry[e.data.uid].position.value = value;
                    cache[e.book].entries[e.data.uid].position = value;
                    e.data.position = value;
                    applyEntryManagerPositionFilterToRow(tr, cache[e.book].entries[e.data.uid]);
                    updateOutlet?.();
                    await enqueueSave(e.book);
                });
                position.append(pos);
                tr.append(position);
            }

            
            tr.append(buildNumberInputCell({
                col: 'depth', name: 'depth', tooltip: 'Entry depth',
                getValue: ()=>e.data.depth,
                onSave: async (value)=>{ cache[e.book].entries[e.data.uid].depth = value; await enqueueSave(e.book); },
            }));

            
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
                            
                            
                            const value = input.value;
                            cache[e.book].entries[e.data.uid].outletName = value;
                            e.data.outletName = value;
                            syncEntryManagerOutletFilters();
                            refreshOutletFilterIndicator();
                            applyEntryManagerOutletFilters();
                            await enqueueSave(e.book);
                            updateOutlet();
                        });
                        wrap.append(input);
                    }
                    outlet.append(wrap);
                }
                tr.append(outlet);
            }

            
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
                            
                            
                            const value = input.value;
                            const entryData = cache[e.book].entries[e.data.uid];
                            entryData.group = value;
                            e.data.group = value;
                            syncEntryManagerGroupFilters();
                            refreshGroupFilterIndicator();
                            applyEntryManagerGroupFilters();
                            await enqueueSave(e.book);
                        });
                        wrap.append(input);
                    }
                    wrap.append(document.createElement('br'));
                    const row = document.createElement('label'); {
                        row.classList.add('stwid--small-check-row');
                        const input = document.createElement('input'); {
                            input.type = 'checkbox';
                            input.classList.add('checkbox');
                            setTooltip(input, 'Prioritize this entry within its inclusion group');
                            input.checked = Boolean(e.data.groupOverride);
                            input.addEventListener('change', async()=>{
                                const entryData = cache[e.book].entries[e.data.uid];
                                entryData.groupOverride = input.checked;
                                e.data.groupOverride = input.checked;
                                await enqueueSave(e.book);
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

            
            tr.append(buildNumberInputCell({
                col: 'order', name: 'order', tooltip: 'Order value',
                getValue: ()=>e.data.order,
                onSave: async (value)=>{ cache[e.book].entries[e.data.uid].order = value; await enqueueSave(e.book); },
            }));

            
            tr.append(buildNumberInputCell({
                col: 'sticky', name: 'sticky', tooltip: 'Sticky duration',
                getValue: ()=>e.data.sticky,
                onSave: async (value)=>{ cache[e.book].entries[e.data.uid].sticky = value; await enqueueSave(e.book); },
            }));

            
            tr.append(buildNumberInputCell({
                col: 'cooldown', name: 'cooldown', tooltip: 'Cooldown duration',
                getValue: ()=>e.data.cooldown,
                onSave: async (value)=>{ cache[e.book].entries[e.data.uid].cooldown = value; await enqueueSave(e.book); },
            }));

            
            tr.append(buildNumberInputCell({
                col: 'delay', name: 'delay', tooltip: 'Delay before activation',
                getValue: ()=>e.data.delay,
                onSave: async (value)=>{ cache[e.book].entries[e.data.uid].delay = value; await enqueueSave(e.book); },
            }));

            
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
                        
                        
                        const value = inp.value;
                        cache[e.book].entries[e.data.uid].automationId = value;
                        e.data.automationId = value;
                        syncEntryManagerAutomationIdFilters();
                        refreshAutomationIdFilterIndicator();
                        applyEntryManagerAutomationIdFilters();
                        await enqueueSave(e.book);
                    });
                    automationId.append(inp);
                }
                tr.append(automationId);
            }

            
            tr.append(buildNumberInputCell({
                col: 'trigger', name: 'selective_probability', tooltip: 'Trigger chance percentage', max: '100',
                getValue: ()=>e.data.selective_probability,
                onSave: async (value)=>{ cache[e.book].entries[e.data.uid].selective_probability = value; await enqueueSave(e.book); },
            }));

            
            const recursion = document.createElement('td'); {
                recursion.setAttribute('data-col', 'recursion');
                const wrap = document.createElement('div'); {
                    wrap.classList.add('stwid--recursionOptions');
                    const addCheckbox = (key, label)=> {
                        const row = document.createElement('label'); {
                            row.classList.add('stwid--small-check-row');
                            const input = document.createElement('input'); {
                                input.type = 'checkbox';
                                input.classList.add('checkbox');
                                setTooltip(input, label);
                                input.checked = Boolean(e.data[key]);
                                input.addEventListener('change', async()=> {
                                    const entryData = cache[e.book].entries[e.data.uid];
                                    entryData[key] = input.checked;
                                    e.data[key] = input.checked;
                                    applyEntryManagerRecursionFilterToRow(tr, entryData);
                                    await enqueueSave(e.book);
                                });
                                row.append(input);
                            }
                            row.append(label);
                            wrap.append(row);
                        }
                    };
                    for (const { value, label } of ENTRY_MANAGER_RECURSION_OPTIONS) {
                        addCheckbox(value, label);
                    }
                    recursion.append(wrap);
                }
                tr.append(recursion);
            }

            
            const budget = document.createElement('td'); {
                budget.setAttribute('data-col', 'budget');
                const wrap = document.createElement('div'); {
                    wrap.classList.add('stwid--recursionOptions');
                    const row = document.createElement('label'); {
                        row.classList.add('stwid--small-check-row');
                        const input = document.createElement('input'); {
                            input.type = 'checkbox';
                            input.classList.add('checkbox');
                            setTooltip(input, 'Ignore World Info budget limit for this entry');
                            input.checked = Boolean(e.data.ignoreBudget);
                            input.addEventListener('change', async()=> {
                                const entryData = cache[e.book].entries[e.data.uid];
                                entryData.ignoreBudget = input.checked;
                                e.data.ignoreBudget = input.checked;
                                await enqueueSave(e.book);
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

            setEntryManagerRowSelected(tr, true);
            tbody.append(tr);
        }
    }

    
    applyEntryManagerStrategyFilters();
    applyEntryManagerRecursionFilters();
    applyEntryManagerOutletFilters();
    applyEntryManagerAutomationIdFilters();
    applyEntryManagerGroupFilters();
    updateEntryManagerSelectAllButton();

    return tbody;
}

