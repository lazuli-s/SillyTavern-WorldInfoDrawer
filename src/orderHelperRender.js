const createOrderHelperRenderer = ({
    dom,
    cache,
    orderHelperState,
    ORDER_HELPER_COLUMNS_STORAGE_KEY,
    ORDER_HELPER_DEFAULT_COLUMNS,
    ORDER_HELPER_HIDE_KEYS_STORAGE_KEY,
    SORT,
    SORT_DIRECTION,
    appendSortOptions,
    ensureCustomDisplayIndex,
    saveWorldInfo,
    buildSavePayload,
    getOrderHelperEntries,
    applyOrderHelperSortToDom,
    updateOrderHelperPreview,
    clearOrderHelperScriptFilters,
    applyOrderHelperColumnVisibility,
    setOrderHelperSort,
    isOrderHelperRowSelected,
    setOrderHelperRowSelected,
    setAllOrderHelperRowSelected,
    updateOrderHelperSelectAllButton,
    applyOrderHelperStrategyFilters,
    applyOrderHelperStrategyFilterToRow,
    applyOrderHelperPositionFilterToRow,
    applyOrderHelperPositionFilters,
    applyOrderHelperRecursionFilterToRow,
    applyOrderHelperRecursionFilters,
    applyOrderHelperOutletFilters,
    applyOrderHelperAutomationIdFilters,
    applyOrderHelperGroupFilters,
    setOrderHelperRowFilterState,
    syncOrderHelperStrategyFilters,
    syncOrderHelperPositionFilters,
    syncOrderHelperOutletFilters,
    syncOrderHelperAutomationIdFilters,
    syncOrderHelperGroupFilters,
    focusWorldEntry,
    entryState,
    isOutletPosition,
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
    normalizeStrategyFilters,
    normalizePositionFilters,
    normalizeOutletFilters,
    normalizeAutomationIdFilters,
    normalizeGroupFilters,
    getOrderHelperRows,
    SlashCommandParser,
    debounce,
    hljs,
    getSortableDelay,
    isTrueBoolean,
    $,
    getEditorPanelApi,
}) => {
    const setTooltip = (element, text, { ariaLabel = null } = {})=>{
        if (!element || !text) return;
        element.title = text;
        const label = ariaLabel ?? text.replace(/\s*---\s*/g, ' ').replace(/\s+/g, ' ').trim();
        if (label) {
            element.setAttribute('aria-label', label);
        }
    };

    const formatCharacterFilter = (entry)=>{
        const filter = entry?.characterFilter;
        if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return [];
        const lines = [];
        if (Array.isArray(filter.names) && filter.names.length > 0) {
            lines.push(...filter.names.map((name)=>({
                icon: filter.isExclude ? 'fa-user-slash' : 'fa-user-plus',
                mode: filter.isExclude ? 'exclude' : 'include',
                label: name,
            })));
        }
        if (Array.isArray(filter.tags) && filter.tags.length > 0) {
            const tags = globalThis.SillyTavern?.getContext?.().tags ?? [];
            const tagNames = tags.length
                ? tags.filter((tag)=>filter.tags.includes(tag.id)).map((tag)=>tag.name)
                : filter.tags.map((tag)=>String(tag));
            if (tagNames.length > 0) {
                lines.push(...tagNames.map((tag)=>({
                    icon: 'fa-tag',
                    mode: filter.isExclude ? 'exclude' : 'include',
                    label: tag,
                })));
            }
        }
        if (!lines.length) {
            return [];
        }
        return lines;
    };

    const renderOrderHelper = (book = null)=>{
        orderHelperState.book = book;
        syncOrderHelperStrategyFilters();
        syncOrderHelperPositionFilters();
        syncOrderHelperOutletFilters();
        syncOrderHelperAutomationIdFilters();
        syncOrderHelperGroupFilters();
        const editorPanelApi = getEditorPanelApi();
        editorPanelApi.resetEditorState();
        dom.order.entries = {};
        dom.order.filter.root = undefined;
        dom.order.filter.preview = undefined;
        dom.order.tbody = undefined;

        if (orderHelperState.sort === SORT.CUSTOM) {
            const updatedBooks = ensureCustomDisplayIndex(book);
            for (const bookName of updatedBooks) {
                void saveWorldInfo(bookName, buildSavePayload(bookName), true);
            }
        }
        const entries = getOrderHelperEntries(book);
        const body = document.createElement('div'); {
            body.classList.add('stwid--orderHelper');
            body.classList.toggle('stwid--hideKeys', orderHelperState.hideKeys);
            applyOrderHelperColumnVisibility(body);
            const actions = document.createElement('div'); {
                actions.classList.add('stwid--actions');
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
                    actions.append(selectAll);
                }
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
                        orderHelperState.hideKeys = !orderHelperState.hideKeys;
                        localStorage.setItem(ORDER_HELPER_HIDE_KEYS_STORAGE_KEY, orderHelperState.hideKeys);
                        body.classList.toggle('stwid--hideKeys', orderHelperState.hideKeys);
                        applyKeyToggleStyle();
                    });
                    actions.append(keyToggle);
                }
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
                        menuWrap.classList.add('stwid--columnMenuWrap');
                        const menuButton = document.createElement('div'); {
                            menuButton.classList.add('menu_button', 'stwid--columnMenuButton');
                            menuButton.textContent = 'Select';
                            setTooltip(menuButton, 'Choose which columns are visible');
                            const caret = document.createElement('i'); {
                                caret.classList.add('fa-solid', 'fa-fw', 'fa-caret-down');
                                menuButton.append(caret);
                            }
                            menuWrap.append(menuButton);
                        }
                        const menu = document.createElement('div'); {
                            menu.classList.add('stwid--columnMenu');
                            const closeMenu = ()=>{
                                if (!menu.classList.contains('stwid--active')) return;
                                menu.classList.remove('stwid--active');
                                document.removeEventListener('click', handleOutsideClick);
                            };
                            const openMenu = ()=>{
                                if (menu.classList.contains('stwid--active')) return;
                                menu.classList.add('stwid--active');
                                document.addEventListener('click', handleOutsideClick);
                            };
                            const handleOutsideClick = (event)=>{
                                if (menuWrap.contains(event.target)) return;
                                closeMenu();
                            };
                            const columns = [
                                { key:'strategy', label:'Strategy' },
                                { key:'position', label:'Position' },
                                { key:'depth', label:'Depth' },
                                { key:'outlet', label:'Outlet' },
                                { key:'group', label:'Inclusion Group' },
                                { key:'order', label:'Order' },
                                { key:'sticky', label:'Sticky' },
                                { key:'cooldown', label:'Cooldown' },
                                { key:'delay', label:'Delay' },
                                { key:'automationId', label:'Automation ID' },
                                { key:'trigger', label:'Trigger %' },
                                { key:'recursion', label:'Recursion' },
                                { key:'budget', label:'Budget' },
                                { key:'characterFilter', label:'Character Filter' },
                            ];
                            const columnInputs = new Map();
                            const mainColumnDefaults = Object.fromEntries(
                                Object.entries(ORDER_HELPER_DEFAULT_COLUMNS)
                                    .map(([key, value])=>[key, Boolean(value)]),
                            );
                            const setColumnVisibility = (overrides)=>{
                                for (const column of columns) {
                                    const nextValue = Boolean(overrides[column.key]);
                                    orderHelperState.columns[column.key] = nextValue;
                                    const input = columnInputs.get(column.key);
                                    if (input) input.checked = nextValue;
                                }
                                localStorage.setItem(
                                    ORDER_HELPER_COLUMNS_STORAGE_KEY,
                                    JSON.stringify(orderHelperState.columns),
                                );
                                applyOrderHelperColumnVisibility(body);
                                closeMenu();
                            };
                            const addColumnAction = ({ label, icon, onClick })=>{
                                const action = document.createElement('div'); {
                                    action.classList.add('stwid--columnOption');
                                    action.style.fontWeight = 'bold';
                                    const iconEl = document.createElement('i'); {
                                        iconEl.classList.add('fa-solid', 'fa-fw', icon, 'stwid--columnOptionIcon');
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
                                    Object.fromEntries(columns.map((column)=>[column.key, true])),
                                ),
                            });
                            addColumnAction({
                                label: 'MAIN COLUMNS',
                                icon: 'fa-table-columns',
                                onClick: ()=>setColumnVisibility(mainColumnDefaults),
                            });
                            for (const column of columns) {
                                const option = document.createElement('label'); {
                                    option.classList.add('stwid--columnOption');
                                    const input = document.createElement('input'); {
                                        input.type = 'checkbox';
                                        input.checked = Boolean(orderHelperState.columns[column.key]);
                                        columnInputs.set(column.key, input);
                                        input.addEventListener('change', ()=>{
                                            orderHelperState.columns[column.key] = input.checked;
                                            localStorage.setItem(
                                                ORDER_HELPER_COLUMNS_STORAGE_KEY,
                                                JSON.stringify(orderHelperState.columns),
                                            );
                                            applyOrderHelperColumnVisibility(body);
                                        });
                                        option.append(input);
                                    }
                                    option.append(column.label);
                                    menu.append(option);
                                }
                            }
                            menu.addEventListener('click', (event)=>event.stopPropagation());
                            menuButton.addEventListener('click', (event)=>{
                                event.stopPropagation();
                                if (menu.classList.contains('stwid--active')) {
                                    closeMenu();
                                } else {
                                    openMenu();
                                }
                            });
                            menuWrap.append(menu);
                        }
                        columnVisibilityWrap.append(menuWrap);
                    }
                    actions.append(columnVisibilityWrap);
                }
                const addDivider = ()=>{
                    const divider = document.createElement('div');
                    divider.classList.add('stwid--actionsDivider');
                    actions.append(divider);
                };
                addDivider();
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
                    actions.append(sortWrap);
                }
                addDivider();
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
                    actions.append(filterToggle);
                }
                const rightGroup = document.createElement('div'); {
                    rightGroup.classList.add('stwid--actionsRight');
                    const divider = document.createElement('div');
                    divider.classList.add('stwid--actionsDivider');
                    rightGroup.append(divider);
                }
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
                        const start = parseInt(dom.order.start.value);
                        const step = parseInt(dom.order.step.value);
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
                    rightGroup.append(startLbl);
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
                    rightGroup.append(stepLbl);
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
                    rightGroup.append(dir);
                }
                rightGroup.append(apply);
                actions.append(rightGroup);
                body.append(actions);
            }
            const filter = document.createElement('div'); {
                dom.order.filter.root = filter;
                filter.classList.add('stwid--filter');
                const main = document.createElement('div'); {
                    main.classList.add('stwid--main');
                    const hint = document.createElement('div'); {
                        hint.classList.add('stwid--hint');
                        const bookContextHint = book ? `<br>Book context: <code>${book}</code> (entries are scoped to this book).` : '';
                        hint.innerHTML = `
                            Script will be called for each entry in all active books.
                            Every entry for which the script returns <code>true</code> will be kept.
                            Other entries will be filtered out.
                            <br>
                            Use <code>{{var::entry}}</code> to access the entry and its properties (look
                            right for available fields).
                            ${bookContextHint}
                        `;
                        main.append(hint);
                    }
                    const script = document.createElement('div'); {
                        script.classList.add('stwid--script');
                        const syntax = document.createElement('pre'); {
                            syntax.classList.add('stwid--syntax');
                            script.append(syntax);
                        }
                        const overlay = document.createElement('div'); {
                            overlay.classList.add('stwid--overlay');
                            script.append(overlay);
                        }
                        const inp = document.createElement('textarea'); {
                            const defaultFilter = '{{var::entry}}';
                            inp.classList.add('stwid--input');
                            inp.classList.add('text_pole');
                            inp.name = 'filter';
                            inp.value = localStorage.getItem('stwid--order-filter') ?? defaultFilter;
                            let filterStack = [];
                            const updateScroll = ()=>{
                                const scrollTop = inp.scrollTop;
                                syntax.scrollTop = scrollTop;
                            };
                            const updateScrollDebounced = debounce(()=>updateScroll(), 150);

                            // Show filter compile/runtime errors inline (non-toastr) to avoid spam.
                            const errorEl = document.createElement('div');
                            errorEl.classList.add('stwid--orderFilterError');
                            errorEl.hidden = true;
                            main.append(errorEl);

                            const showFilterError = (message)=>{
                                if (!message) {
                                    errorEl.hidden = true;
                                    errorEl.textContent = '';
                                    return;
                                }
                                errorEl.hidden = false;
                                errorEl.textContent = message;
                            };

                            const updateList = async()=>{
                                if (!dom.order.filter.root.classList.contains('stwid--active')) return;

                                const closure = new (await SlashCommandParser.getScope())();
                                filterStack.push(closure);

                                const clone = inp.value;
                                const script = `return async function orderHelperFilter(data) {${clone}}();`;

                                try {
                                    await closure.compile(script);

                                    const entries = getOrderHelperEntries(orderHelperState.book, true);

                                    // Start optimistic: mark all rows as "kept" by the script, then flip to filtered
                                    // when the script result is not truthy.
                                    for (const e of entries) {
                                        const row = dom.order.entries[e.book][e.data.uid];
                                        setOrderHelperRowFilterState(row, 'stwidFilterScript', true);
                                    }

                                    for (const e of entries) {
                                        closure.scope.setVariable('entry', JSON.stringify(Object.assign({ book:e.book }, e.data)));
                                        const result = (await closure.execute()).pipe;

                                        // If a newer closure was queued, abort without touching UI further.
                                        if (filterStack.at(-1) !== closure) {
                                            return;
                                        }

                                        const row = dom.order.entries[e.book][e.data.uid];
                                        setOrderHelperRowFilterState(row, 'stwidFilterScript', !isTrueBoolean(result));
                                    }

                                    showFilterError(null);
                                } catch (error) {
                                    // Keep previous filter results (avoid "everything" flipping due to transient errors)
                                    // and surface the error to the user.
                                    const msg = error instanceof Error ? error.message : String(error);
                                    showFilterError(`Filter error: ${msg}`);
                                } finally {
                                    const idx = filterStack.indexOf(closure);
                                    if (idx !== -1) filterStack.splice(idx, 1);
                                }
                            };
                            const updateListDebounced = debounce(()=>updateList(), 1000);
                            inp.addEventListener('input', () => {
                                syntax.innerHTML = hljs.highlight(`${inp.value}${inp.value.slice(-1) == '\n' ? ' ' : ''}`, { language:'stscript', ignoreIllegals:true })?.value;
                                updateScrollDebounced();
                                updateListDebounced();
                            });
                            inp.addEventListener('scroll', ()=>{
                                updateScrollDebounced();
                            });
                            inp.style.color = 'transparent';
                            inp.style.background = 'transparent';
                            inp.style.setProperty('text-shadow', 'none', 'important');
                            syntax.innerHTML = hljs.highlight(`${inp.value}${inp.value.slice(-1) == '\n' ? ' ' : ''}`, { language:'stscript', ignoreIllegals:true })?.value;
                            script.append(inp);
                        }
                        main.append(script);
                    }
                    filter.append(main);
                }
                const preview = document.createElement('div'); {
                    dom.order.filter.preview = preview;
                    preview.classList.add('stwid--preview');
                    filter.append(preview);
                }
                body.append(filter);
            }
            const wrap = document.createElement('div'); {
                wrap.classList.add('stwid--orderTableWrap');
                const tbl = document.createElement('table'); {
                    tbl.classList.add('stwid--orderTable');
                    const thead = document.createElement('thead'); {
                        const tr = document.createElement('tr'); {
                            const columns = [
                                { label:'', key:'select' },
                                { label:'', key:'drag' },
                                { label:'', key:'enabled' },
                                { label:'Entry', key:'entry' },
                                { label:'Strategy', key:'strategy' },
                                { label:'Position', key:'position' },
                                { label:'Depth', key:'depth' },
                                { label:'Outlet', key:'outlet' },
                                { label:'Inclusion Group', key:'group' },
                                { label:'Order', key:'order' },
                                { label:'Sticky', key:'sticky' },
                                { label:'Cooldown', key:'cooldown' },
                                { label:'Delay', key:'delay' },
                                { label:'Automation ID', key:'automationId' },
                                { label:'Trigger %', key:'trigger' },
                                { label:'Recursion', key:'recursion' },
                                { label:'Budget', key:'budget' },
                                { label:'Character Filter', key:'characterFilter' },
                            ];
                            const numberColumnKeys = new Set([
                                'depth',
                                'order',
                                'sticky',
                                'cooldown',
                                'delay',
                                'automationId',
                                'trigger',
                            ]);
                            for (const col of columns) {
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
                                                    menuWrap.classList.add('stwid--columnMenuWrap');
                                                    const menuButton = document.createElement('div'); {
                                                        menuButton.classList.add(
                                                            'menu_button',
                                                            'fa-solid',
                                                            'fa-fw',
                                                            'fa-filter',
                                                            'stwid--orderFilterButton',
                                                            'stwid--columnMenuButton',
                                                        );
                                                        menuWrap.append(menuButton);
                                                    }
                                                    const menu = document.createElement('div'); {
                                                        menu.classList.add('stwid--columnMenu');
                                                        const closeMenu = ()=>{
                                                            if (!menu.classList.contains('stwid--active')) return;
                                                            menu.classList.remove('stwid--active');
                                                            document.removeEventListener('click', handleOutsideClick);
                                                        };
                                                        const openMenu = ()=>{
                                                            if (menu.classList.contains('stwid--active')) return;
                                                            menu.classList.add('stwid--active');
                                                            document.addEventListener('click', handleOutsideClick);
                                                        };
                                                        const handleOutsideClick = (event)=>{
                                                            if (menuWrap.contains(event.target)) return;
                                                            closeMenu();
                                                        };
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
                                                                option.classList.add('stwid--columnOption');
                                                                const input = document.createElement('input'); {
                                                                    input.type = 'checkbox';
                                                                    input.checked = orderHelperState.filters.strategy.includes(optionData.value);
                                                                    input.addEventListener('change', ()=>{
                                                                        if (input.checked) {
                                                                            if (!orderHelperState.filters.strategy.includes(optionData.value)) {
                                                                                orderHelperState.filters.strategy.push(optionData.value);
                                                                            }
                                                                        } else {
                                                                            orderHelperState.filters.strategy = orderHelperState.filters.strategy
                                                                                .filter((item)=>item !== optionData.value);
                                                                        }
                                                                        updateStrategyFilters();
                                                                    });
                                                                    option.append(input);
                                                                }
                                                                option.append(optionData.label);
                                                                menu.append(option);
                                                            }
                                                        }
                                                        updateFilterIndicator();
                                                        menu.addEventListener('click', (event)=>event.stopPropagation());
                                                        menuButton.addEventListener('click', (event)=>{
                                                            event.stopPropagation();
                                                            if (menu.classList.contains('stwid--active')) {
                                                                closeMenu();
                                                            } else {
                                                                openMenu();
                                                            }
                                                        });
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
                                                    menuWrap.classList.add('stwid--columnMenuWrap');
                                                    const menuButton = document.createElement('div'); {
                                                        menuButton.classList.add(
                                                            'menu_button',
                                                            'fa-solid',
                                                            'fa-fw',
                                                            'fa-filter',
                                                            'stwid--orderFilterButton',
                                                            'stwid--columnMenuButton',
                                                        );
                                                        menuWrap.append(menuButton);
                                                    }
                                                    const menu = document.createElement('div'); {
                                                        menu.classList.add('stwid--columnMenu');
                                                        const closeMenu = ()=>{
                                                            if (!menu.classList.contains('stwid--active')) return;
                                                            menu.classList.remove('stwid--active');
                                                            document.removeEventListener('click', handleOutsideClick);
                                                        };
                                                        const openMenu = ()=>{
                                                            if (menu.classList.contains('stwid--active')) return;
                                                            menu.classList.add('stwid--active');
                                                            document.addEventListener('click', handleOutsideClick);
                                                        };
                                                        const handleOutsideClick = (event)=>{
                                                            if (menuWrap.contains(event.target)) return;
                                                            closeMenu();
                                                        };
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
                                                                option.classList.add('stwid--columnOption');
                                                                const input = document.createElement('input'); {
                                                                    input.type = 'checkbox';
                                                                    input.checked = orderHelperState.filters.position.includes(optionData.value);
                                                                    input.addEventListener('change', ()=>{
                                                                        if (input.checked) {
                                                                            if (!orderHelperState.filters.position.includes(optionData.value)) {
                                                                                orderHelperState.filters.position.push(optionData.value);
                                                                            }
                                                                        } else {
                                                                            orderHelperState.filters.position = orderHelperState.filters.position
                                                                                .filter((item)=>item !== optionData.value);
                                                                        }
                                                                        updatePositionFilters();
                                                                    });
                                                                    option.append(input);
                                                                }
                                                                option.append(optionData.label);
                                                                menu.append(option);
                                                            }
                                                        }
                                                        updateFilterIndicator();
                                                        menu.addEventListener('click', (event)=>event.stopPropagation());
                                                        menuButton.addEventListener('click', (event)=>{
                                                            event.stopPropagation();
                                                            if (menu.classList.contains('stwid--active')) {
                                                                closeMenu();
                                                            } else {
                                                                openMenu();
                                                            }
                                                        });
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
                                                    menuWrap.classList.add('stwid--columnMenuWrap');
                                                    const menuButton = document.createElement('div'); {
                                                        menuButton.classList.add(
                                                            'menu_button',
                                                            'fa-solid',
                                                            'fa-fw',
                                                            'fa-filter',
                                                            'stwid--orderFilterButton',
                                                            'stwid--columnMenuButton',
                                                        );
                                                        menuWrap.append(menuButton);
                                                    }
                                                    const menu = document.createElement('div'); {
                                                        menu.classList.add('stwid--columnMenu');
                                                        const closeMenu = ()=>{
                                                            if (!menu.classList.contains('stwid--active')) return;
                                                            menu.classList.remove('stwid--active');
                                                            document.removeEventListener('click', handleOutsideClick);
                                                        };
                                                        const openMenu = ()=>{
                                                            if (menu.classList.contains('stwid--active')) return;
                                                            menu.classList.add('stwid--active');
                                                            document.addEventListener('click', handleOutsideClick);
                                                        };
                                                        const handleOutsideClick = (event)=>{
                                                            if (menuWrap.contains(event.target)) return;
                                                            closeMenu();
                                                        };
                                                        const getRecursionOptions = ()=>[
                                                            { value:'excludeRecursion', label:'Non-recursable' },
                                                            { value:'preventRecursion', label:'Prevent further recursion' },
                                                            { value:'delayUntilRecursion', label:'Delay until recursion' },
                                                        ];
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
                                                            const allValues = orderHelperState.recursionValues ?? [];
                                                            if (!orderHelperState.filters.recursion.length) {
                                                                orderHelperState.filters.recursion = [...allValues];
                                                            }
                                                            updateFilterIndicator();
                                                            applyOrderHelperRecursionFilters();
                                                        };
                                                        for (const optionData of getRecursionOptions()) {
                                                            const option = document.createElement('label'); {
                                                                option.classList.add('stwid--columnOption');
                                                                const input = document.createElement('input'); {
                                                                    input.type = 'checkbox';
                                                                    input.checked = orderHelperState.filters.recursion.includes(optionData.value);
                                                                    input.addEventListener('change', ()=>{
                                                                        if (input.checked) {
                                                                            if (!orderHelperState.filters.recursion.includes(optionData.value)) {
                                                                                orderHelperState.filters.recursion.push(optionData.value);
                                                                            }
                                                                        } else {
                                                                            orderHelperState.filters.recursion = orderHelperState.filters.recursion
                                                                                .filter((item)=>item !== optionData.value);
                                                                        }
                                                                        updateRecursionFilters();
                                                                    });
                                                                    option.append(input);
                                                                }
                                                                option.append(optionData.label);
                                                                menu.append(option);
                                                            }
                                                        }
                                                        updateFilterIndicator();
                                                        menu.addEventListener('click', (event)=>event.stopPropagation());
                                                        menuButton.addEventListener('click', (event)=>{
                                                            event.stopPropagation();
                                                            if (menu.classList.contains('stwid--active')) {
                                                                closeMenu();
                                                            } else {
                                                                openMenu();
                                                            }
                                                        });
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
                                                        menuWrap.classList.add('stwid--columnMenuWrap');
                                                        const menuButton = document.createElement('div'); {
                                                            menuButton.classList.add(
                                                                'menu_button',
                                                                'fa-solid',
                                                                'fa-fw',
                                                                'fa-filter',
                                                                'stwid--orderFilterButton',
                                                                'stwid--columnMenuButton',
                                                            );
                                                            menuWrap.append(menuButton);
                                                        }
                                                        const menu = document.createElement('div'); {
                                                            menu.classList.add('stwid--columnMenu');
                                                            const closeMenu = ()=>{
                                                                if (!menu.classList.contains('stwid--active')) return;
                                                                menu.classList.remove('stwid--active');
                                                                document.removeEventListener('click', handleOutsideClick);
                                                            };
                                                            const openMenu = ()=>{
                                                                if (menu.classList.contains('stwid--active')) return;
                                                                menu.classList.add('stwid--active');
                                                                document.addEventListener('click', handleOutsideClick);
                                                            };
                                                            const handleOutsideClick = (event)=>{
                                                                if (menuWrap.contains(event.target)) return;
                                                                closeMenu();
                                                            };
                                                            const updateFilterIndicator = ()=>{
                                                                const allValues = orderHelperState.outletValues.length
                                                                    ? orderHelperState.outletValues
                                                                    : getOutletValues();
                                                                const filters = normalizeOutletFilters(orderHelperState.filters.outlet);
                                                                orderHelperState.filters.outlet = filters.length ? filters : [...allValues];
                                                                const isActive = orderHelperState.filters.outlet.length !== allValues.length;
                                                                menuButton.classList.toggle('stwid--active', isActive);
                                                            };
                                                            const updateOutletFilters = ()=>{
                                                                orderHelperState.filters.outlet = normalizeOutletFilters(orderHelperState.filters.outlet);
                                                                updateFilterIndicator();
                                                                applyOrderHelperOutletFilters();
                                                            };
                                                            const outletOptions = getOutletOptions();
                                                            for (const optionData of outletOptions) {
                                                                const option = document.createElement('label'); {
                                                                    option.classList.add('stwid--columnOption');
                                                                    const input = document.createElement('input'); {
                                                                        input.type = 'checkbox';
                                                                        input.checked = orderHelperState.filters.outlet.includes(optionData.value);
                                                                        input.addEventListener('change', ()=>{
                                                                            if (input.checked) {
                                                                                if (!orderHelperState.filters.outlet.includes(optionData.value)) {
                                                                                    orderHelperState.filters.outlet.push(optionData.value);
                                                                                }
                                                                            } else {
                                                                                orderHelperState.filters.outlet = orderHelperState.filters.outlet
                                                                                    .filter((item)=>item !== optionData.value);
                                                                            }
                                                                            updateOutletFilters();
                                                                        });
                                                                        option.append(input);
                                                                    }
                                                                    option.append(optionData.label);
                                                                    menu.append(option);
                                                                }
                                                            }
                                                            updateFilterIndicator();
                                                            menu.addEventListener('click', (event)=>event.stopPropagation());
                                                            menuButton.addEventListener('click', (event)=>{
                                                                event.stopPropagation();
                                                                if (menu.classList.contains('stwid--active')) {
                                                                    closeMenu();
                                                                } else {
                                                                    openMenu();
                                                                }
                                                            });
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
                                                        menuWrap.classList.add('stwid--columnMenuWrap');
                                                        const menuButton = document.createElement('div'); {
                                                            menuButton.classList.add(
                                                                'menu_button',
                                                                'fa-solid',
                                                                'fa-fw',
                                                                'fa-filter',
                                                                'stwid--orderFilterButton',
                                                                'stwid--columnMenuButton',
                                                            );
                                                            menuWrap.append(menuButton);
                                                        }
                                                        const menu = document.createElement('div'); {
                                                            menu.classList.add('stwid--columnMenu');
                                                            const closeMenu = ()=>{
                                                                if (!menu.classList.contains('stwid--active')) return;
                                                                menu.classList.remove('stwid--active');
                                                                document.removeEventListener('click', handleOutsideClick);
                                                            };
                                                            const openMenu = ()=>{
                                                                if (menu.classList.contains('stwid--active')) return;
                                                                menu.classList.add('stwid--active');
                                                                document.addEventListener('click', handleOutsideClick);
                                                            };
                                                            const handleOutsideClick = (event)=>{
                                                                if (menuWrap.contains(event.target)) return;
                                                                closeMenu();
                                                            };
                                                            const updateFilterIndicator = ()=>{
                                                                const allValues = orderHelperState.automationIdValues.length
                                                                    ? orderHelperState.automationIdValues
                                                                    : getAutomationIdValues();
                                                                const filters = normalizeAutomationIdFilters(orderHelperState.filters.automationId);
                                                                orderHelperState.filters.automationId = filters.length ? filters : [...allValues];
                                                                const isActive = orderHelperState.filters.automationId.length !== allValues.length;
                                                                menuButton.classList.toggle('stwid--active', isActive);
                                                            };
                                                            const updateAutomationIdFilters = ()=>{
                                                                orderHelperState.filters.automationId = normalizeAutomationIdFilters(orderHelperState.filters.automationId);
                                                                updateFilterIndicator();
                                                                applyOrderHelperAutomationIdFilters();
                                                            };
                                                            const automationIdOptions = getAutomationIdOptions();
                                                            for (const optionData of automationIdOptions) {
                                                                const option = document.createElement('label'); {
                                                                    option.classList.add('stwid--columnOption');
                                                                    const input = document.createElement('input'); {
                                                                        input.type = 'checkbox';
                                                                        input.checked = orderHelperState.filters.automationId.includes(optionData.value);
                                                                        input.addEventListener('change', ()=>{
                                                                            if (input.checked) {
                                                                                if (!orderHelperState.filters.automationId.includes(optionData.value)) {
                                                                                    orderHelperState.filters.automationId.push(optionData.value);
                                                                                }
                                                                            } else {
                                                                                orderHelperState.filters.automationId = orderHelperState.filters.automationId
                                                                                    .filter((item)=>item !== optionData.value);
                                                                            }
                                                                            updateAutomationIdFilters();
                                                                        });
                                                                        option.append(input);
                                                                    }
                                                                    option.append(optionData.label);
                                                                    menu.append(option);
                                                                }
                                                            }
                                                            updateFilterIndicator();
                                                            menu.addEventListener('click', (event)=>event.stopPropagation());
                                                            menuButton.addEventListener('click', (event)=>{
                                                                event.stopPropagation();
                                                                if (menu.classList.contains('stwid--active')) {
                                                                    closeMenu();
                                                                } else {
                                                                    openMenu();
                                                                }
                                                            });
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
                                                        menuWrap.classList.add('stwid--columnMenuWrap');
                                                        const menuButton = document.createElement('div'); {
                                                            menuButton.classList.add(
                                                                'menu_button',
                                                                'fa-solid',
                                                                'fa-fw',
                                                                'fa-filter',
                                                                'stwid--orderFilterButton',
                                                                'stwid--columnMenuButton',
                                                            );
                                                            menuWrap.append(menuButton);
                                                        }
                                                        const menu = document.createElement('div'); {
                                                            menu.classList.add('stwid--columnMenu');
                                                            const closeMenu = ()=>{
                                                                if (!menu.classList.contains('stwid--active')) return;
                                                                menu.classList.remove('stwid--active');
                                                                document.removeEventListener('click', handleOutsideClick);
                                                            };
                                                            const openMenu = ()=>{
                                                                if (menu.classList.contains('stwid--active')) return;
                                                                menu.classList.add('stwid--active');
                                                                document.addEventListener('click', handleOutsideClick);
                                                            };
                                                            const handleOutsideClick = (event)=>{
                                                                if (menuWrap.contains(event.target)) return;
                                                                closeMenu();
                                                            };
                                                            const updateFilterIndicator = ()=>{
                                                                const allValues = orderHelperState.groupValues.length
                                                                    ? orderHelperState.groupValues
                                                                    : getGroupValues();
                                                                const filters = normalizeGroupFilters(orderHelperState.filters.group);
                                                                orderHelperState.filters.group = filters.length ? filters : [...allValues];
                                                                const isActive = orderHelperState.filters.group.length !== allValues.length;
                                                                menuButton.classList.toggle('stwid--active', isActive);
                                                            };
                                                            const updateGroupFilters = ()=>{
                                                                orderHelperState.filters.group = normalizeGroupFilters(orderHelperState.filters.group);
                                                                updateFilterIndicator();
                                                                applyOrderHelperGroupFilters();
                                                            };
                                                            const groupOptions = getGroupOptions();
                                                            for (const optionData of groupOptions) {
                                                                const option = document.createElement('label'); {
                                                                    option.classList.add('stwid--columnOption');
                                                                    const input = document.createElement('input'); {
                                                                        input.type = 'checkbox';
                                                                        input.checked = orderHelperState.filters.group.includes(optionData.value);
                                                                        input.addEventListener('change', ()=>{
                                                                            if (input.checked) {
                                                                                if (!orderHelperState.filters.group.includes(optionData.value)) {
                                                                                    orderHelperState.filters.group.push(optionData.value);
                                                                                }
                                                                            } else {
                                                                                orderHelperState.filters.group = orderHelperState.filters.group
                                                                                    .filter((item)=>item !== optionData.value);
                                                                            }
                                                                            updateGroupFilters();
                                                                        });
                                                                        option.append(input);
                                                                    }
                                                                    option.append(optionData.label);
                                                                    menu.append(option);
                                                                }
                                                            }
                                                            updateFilterIndicator();
                                                            menu.addEventListener('click', (event)=>event.stopPropagation());
                                                            menuButton.addEventListener('click', (event)=>{
                                                                event.stopPropagation();
                                                                if (menu.classList.contains('stwid--active')) {
                                                                    closeMenu();
                                                                } else {
                                                                    openMenu();
                                                                }
                                                            });
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
                                        if (numberColumnKeys.has(col.key)) {
                                            th.classList.add('stwid--orderTable--NumberColumns');
                                        }
                                    }
                                    tr.append(th);
                                }
                            }
                            thead.append(tr);
                        }
                        tbl.append(thead);
                    }
                    const tbody = document.createElement('tbody'); {
                        dom.order.tbody = tbody;
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
                                            setOrderHelperRowSelected(tr, !isOrderHelperRowSelected(tr));
                                            updateOrderHelperSelectAllButton();
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
                                            dragHandle.classList.add('stwid--sortableHandle');
                                            dragHandle.textContent = '☰';
                                            setTooltip(dragHandle, 'Drag to reorder rows');
                                            controls.append(upButton, dragHandle, downButton);
                                        }
                                        handle.append(controls);
                                    }
                                    tr.append(handle);
                                }
                                const active = document.createElement('td'); {
                                    active.setAttribute('data-col', 'enabled');
                                    const isEnabled = /**@type {HTMLSelectElement}*/(document.querySelector('#entry_edit_template [name="entryKillSwitch"]').cloneNode(true)); {
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
                                const strategy = document.createElement('td'); {
                                    strategy.setAttribute('data-col', 'strategy');
                                    const strat = /**@type {HTMLSelectElement}*/(document.querySelector('#entry_edit_template [name="entryStateSelector"]').cloneNode(true)); {
                                        strat.classList.add('stwid--strategy');
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
                                            applyOrderHelperStrategyFilterToRow(tr, cache[e.book].entries[e.data.uid]);
                                            await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                                        });
                                        strategy.append(strat);
                                    }
                                    tr.append(strategy);
                                }
                                let updateOutlet;
                                const pos = /**@type {HTMLSelectElement}*/(document.querySelector('#entry_edit_template [name="position"]').cloneNode(true));
                                const position = document.createElement('td'); {
                                    position.setAttribute('data-col', 'position');
                                    cache[e.book].dom.entry[e.data.uid].position = pos;
                                    pos.classList.add('stwid--position');
                                    setTooltip(pos, 'Where this entry is inserted');
                                    pos.value = e.data.position;
                                    pos.addEventListener('change', async()=>{
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
                                                await saveWorldInfo(e.book, buildSavePayload(e.book), true);
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
                                            await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                                        });
                                        automationId.append(inp);
                                    }
                                    tr.append(automationId);
                                }
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
                                        addCheckbox('excludeRecursion', 'Non-recursable');
                                        addCheckbox('preventRecursion', 'Prevent further recursion');
                                        addCheckbox('delayUntilRecursion', 'Delay until recursion');
                                        recursion.append(wrap);
                                    }
                                    tr.append(recursion);
                                }
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
                        applyOrderHelperStrategyFilters();
                        applyOrderHelperRecursionFilters();
                        applyOrderHelperOutletFilters();
                        applyOrderHelperAutomationIdFilters();
                        applyOrderHelperGroupFilters();
                        updateOrderHelperSelectAllButton();
                        tbl.append(tbody);
                    }
                    wrap.append(tbl);
                }
                body.append(wrap);
            }
        }
        dom.editor.append(body);
    };

    return { renderOrderHelper };
};

export { createOrderHelperRenderer };
