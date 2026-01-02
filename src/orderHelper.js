export const initOrderHelper = ({
    dom,
    cache,
    SORT,
    SORT_DIRECTION,
    sortEntries,
    appendSortOptions,
    saveWorldInfo,
    buildSavePayload,
    getSelectedWorldInfo,
    getListPanelApi,
    getEditorPanelApi,
    debounce,
    isTrueBoolean,
    SlashCommandParser,
    getSortableDelay,
    entryState,
    isOutletPosition,
    hljs,
    $,
}) => {
    const ORDER_HELPER_SORT_STORAGE_KEY = 'stwid--order-helper-sort';
    const ORDER_HELPER_HIDE_KEYS_STORAGE_KEY = 'stwid--order-helper-hide-keys';
    const ORDER_HELPER_COLUMNS_STORAGE_KEY = 'stwid--order-helper-columns';
    const getStrategyOptions = ()=>{
        const select = document.querySelector('#entry_edit_template [name="entryStateSelector"]');
        if (!select) return [];
        return [...select.querySelectorAll('option')]
            .map((option)=>({
                value: option.value,
                label: option.textContent?.trim() ?? option.value,
            }))
            .filter((option)=>option.value);
    };
    const getStrategyValues = ()=>getStrategyOptions().map((option)=>option.value);
    const ORDER_HELPER_DEFAULT_COLUMNS = {
        strategy: true,
        position: true,
        depth: true,
        outlet: true,
        group: false,
        order: true,
        sticky: false,
        cooldown: false,
        delay: false,
        automationId: false,
        trigger: true,
        recursion: false,
        budget: false,
    };
    const orderHelperState = (()=>{
        const state = {
            sort:SORT.TITLE,
            direction:SORT_DIRECTION.ASCENDING,
            book:null,
            hideKeys:false,
            columns: { ...ORDER_HELPER_DEFAULT_COLUMNS },
            filters: {
                strategy: getStrategyValues(),
            },
            strategyValues: getStrategyValues(),
        };
        try {
            const stored = JSON.parse(localStorage.getItem(ORDER_HELPER_SORT_STORAGE_KEY));
            if (Object.values(SORT).includes(stored?.sort) && Object.values(SORT_DIRECTION).includes(stored?.direction)) {
                state.sort = stored.sort;
                state.direction = stored.direction;
            }
        } catch { /* empty */ }
        try {
            state.hideKeys = localStorage.getItem(ORDER_HELPER_HIDE_KEYS_STORAGE_KEY) === 'true';
        } catch { /* empty */ }
        try {
            const storedColumns = JSON.parse(localStorage.getItem(ORDER_HELPER_COLUMNS_STORAGE_KEY));
            if (storedColumns && typeof storedColumns === 'object') {
                for (const [key, value] of Object.entries(ORDER_HELPER_DEFAULT_COLUMNS)) {
                    if (typeof storedColumns[key] === 'boolean') {
                        state.columns[key] = storedColumns[key];
                    } else {
                        state.columns[key] = value;
                    }
                }
            }
        } catch { /* empty */ }
        return state;
    })();

    const normalizeStrategyFilters = (filters)=>{
        const allowed = new Set(getStrategyValues());
        return filters.filter((value)=>allowed.has(value));
    };

    const getEntryDisplayIndex = (entry)=>{
        const displayIndex = Number(entry?.extensions?.display_index);
        return Number.isFinite(displayIndex) ? displayIndex : null;
    };

    const compareEntryUid = (a, b)=>{
        const auid = Number(a.uid);
        const buid = Number(b.uid);
        if (Number.isFinite(auid) && Number.isFinite(buid) && auid !== buid) return auid - buid;
        return String(a.uid).localeCompare(String(b.uid));
    };

    const getOrderHelperSourceEntries = (book = orderHelperState.book)=>Object.entries(cache)
        .filter(([name])=>getSelectedWorldInfo().includes(name))
        .map(([name,data])=>Object.values(data.entries).map(it=>({ book:name, data:it })))
        .flat()
        .filter((entry)=>!book || entry.book === book);

    const ensureCustomDisplayIndex = (book = orderHelperState.book)=>{
        const source = getOrderHelperSourceEntries(book);
        const entriesByBook = new Map();
        for (const entry of source) {
            if (!entriesByBook.has(entry.book)) {
                entriesByBook.set(entry.book, []);
            }
            entriesByBook.get(entry.book).push(entry.data);
        }
        const updatedBooks = new Set();
        for (const [bookName, entries] of entriesByBook.entries()) {
            let maxIndex = -1;
            for (const entry of entries) {
                const displayIndex = getEntryDisplayIndex(entry);
                if (Number.isFinite(displayIndex)) {
                    maxIndex = Math.max(maxIndex, displayIndex);
                }
            }
            let nextIndex = maxIndex + 1;
            const missing = entries
                .filter((entry)=>!Number.isFinite(getEntryDisplayIndex(entry)))
                .sort(compareEntryUid);
            for (const entry of missing) {
                entry.extensions ??= {};
                entry.extensions.display_index = nextIndex;
                nextIndex += 1;
                updatedBooks.add(bookName);
            }
        }
        return [...updatedBooks];
    };

    const getOrderHelperEntries = (book = orderHelperState.book, includeDom = false)=>{
        const source = includeDom && dom.order.entries && dom.order.tbody
            ? Object.entries(dom.order.entries)
                .map(([entryBook, entries])=>Object.values(entries).map(tr=>({
                    book: entryBook,
                    dom: tr,
                    data: cache[entryBook].entries[tr.getAttribute('data-uid')],
                })))
                .flat()
            : getOrderHelperSourceEntries(book);
        return sortEntries(source, orderHelperState.sort, orderHelperState.direction)
            .filter((entry)=>!book || entry.book === book);
    };

    const updateOrderHelperPreview = (entries)=>{
        if (!dom.order.filter.preview) return;
        const previewEntry = entries[0];
        if (!previewEntry) {
            dom.order.filter.preview.textContent = '';
            return;
        }
        dom.order.filter.preview.textContent = JSON.stringify(Object.assign({ book:previewEntry.book }, previewEntry.data), null, 2);
    };

    const getOrderHelperRows = ()=>[...(dom.order.tbody?.querySelectorAll('tr') ?? [])];

    const isOrderHelperRowSelected = (row)=>row?.classList.contains('stwid--applySelected');

    const setOrderHelperRowSelected = (row, selected)=>{
        if (!row) return;
        row.classList.toggle('stwid--applySelected', selected);
        row.setAttribute('aria-selected', selected ? 'true' : 'false');
        const icon = row.querySelector('.stwid--orderSelect .stwid--icon');
        if (icon) {
            icon.classList.toggle('fa-square', !selected);
            icon.classList.toggle('fa-square-check', selected);
        }
    };

    const setAllOrderHelperRowSelected = (selected)=>{
        for (const row of getOrderHelperRows()) {
            setOrderHelperRowSelected(row, selected);
        }
    };

    const updateOrderHelperSelectAllButton = ()=>{
        if (!dom.order.selectAll) return;
        const rows = getOrderHelperRows();
        const allSelected = rows.length > 0 && rows.every(isOrderHelperRowSelected);
        dom.order.selectAll.classList.toggle('stwid--active', allSelected);
        dom.order.selectAll.classList.toggle('fa-square-check', allSelected);
        dom.order.selectAll.classList.toggle('fa-square', !allSelected);
    };

    const applyOrderHelperSortToDom = ()=>{
        if (!dom.order.tbody) return;
        const entries = getOrderHelperEntries(orderHelperState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            if (row) {
                dom.order.tbody.append(row);
            }
        }
        updateOrderHelperPreview(entries);
    };

    const setOrderHelperSort = (sort, direction)=>{
        orderHelperState.sort = sort;
        orderHelperState.direction = direction;
        const value = JSON.stringify({ sort, direction });
        localStorage.setItem(ORDER_HELPER_SORT_STORAGE_KEY, value);
        if (dom.order.sortSelect) {
            dom.order.sortSelect.value = value;
        }
    };

    const applyOrderHelperColumnVisibility = (root)=>{
        if (!root) return;
        for (const [key, visible] of Object.entries(orderHelperState.columns)) {
            root.classList.toggle(`stwid--hide-col-${key}`, !visible);
        }
    };

    const updateOrderHelperRowFilterClass = (row)=>{
        if (!row) return;
        const strategyFiltered = row.dataset.stwidFilterStrategy === 'true';
        const scriptFiltered = row.dataset.stwidFilterScript === 'true';
        row.classList.toggle('stwid--isFiltered', strategyFiltered || scriptFiltered);
    };

    const setOrderHelperRowFilterState = (row, key, filtered)=>{
        if (!row) return;
        row.dataset[key] = filtered ? 'true' : 'false';
        updateOrderHelperRowFilterClass(row);
    };

    const applyOrderHelperStrategyFilterToRow = (row, entryData)=>{
        const strategyValues = orderHelperState.strategyValues.length
            ? orderHelperState.strategyValues
            : getStrategyValues();
        if (!strategyValues.length) {
            setOrderHelperRowFilterState(row, 'stwidFilterStrategy', false);
            return;
        }
        if (!orderHelperState.filters.strategy.length) {
            orderHelperState.filters.strategy = [...strategyValues];
        }
        const allowed = new Set(orderHelperState.filters.strategy);
        const strategy = entryState(entryData);
        setOrderHelperRowFilterState(row, 'stwidFilterStrategy', !allowed.has(strategy));
    };

    const applyOrderHelperStrategyFilters = ()=>{
        const entries = getOrderHelperEntries(orderHelperState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyOrderHelperStrategyFilterToRow(row, entry.data);
        }
    };

    const clearOrderHelperScriptFilters = ()=>{
        const entries = getOrderHelperEntries(orderHelperState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            setOrderHelperRowFilterState(row, 'stwidFilterScript', false);
        }
    };

    const syncOrderHelperStrategyFilters = ()=>{
        const nextValues = getStrategyValues();
        const hadAllSelected = orderHelperState.filters.strategy.length === orderHelperState.strategyValues.length;
        orderHelperState.strategyValues = nextValues;
        if (!nextValues.length) {
            orderHelperState.filters.strategy = [];
            return;
        }
        if (hadAllSelected || !orderHelperState.filters.strategy.length) {
            orderHelperState.filters.strategy = [...nextValues];
        } else {
            orderHelperState.filters.strategy = normalizeStrategyFilters(orderHelperState.filters.strategy);
        }
    };

    const focusWorldEntry = (book, uid)=>{
        const entryDom = cache?.[book]?.dom?.entry?.[uid]?.root;
        if (!entryDom) return;
        const listPanelApi = getListPanelApi();
        listPanelApi.setBookCollapsed(book, false);
        entryDom.scrollIntoView({ behavior:'smooth', block:'center' });
        entryDom.click();
    };

    const renderOrderHelper = (book = null)=>{
        orderHelperState.book = book;
        syncOrderHelperStrategyFilters();
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
                    selectAll.title = 'Select/unselect all entries for applying Order values';
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
                    keyToggle.title = 'Toggle keyword visibility';
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
                            ];
                            for (const column of columns) {
                                const option = document.createElement('label'); {
                                    option.classList.add('stwid--columnOption');
                                    const input = document.createElement('input'); {
                                        input.type = 'checkbox';
                                        input.checked = Boolean(orderHelperState.columns[column.key]);
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
                    sortWrap.append('Sort: ');
                    const sortSel = document.createElement('select'); {
                        sortSel.classList.add('text_pole');
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
                    filterToggle.title = 'Filter entries\n---\nOrder will only be applied to unfiltered entries';
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
                    apply.title = 'Apply current sorting as Order';
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
                    startLbl.title = 'Starting Order (topmost entry in list)';
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
                    dir.append('Direction: ');
                    const wrap = document.createElement('div'); {
                        wrap.classList.add('stwid--toggleWrap');
                        const up = document.createElement('label'); {
                            up.classList.add('stwid--inputWrap');
                            up.title = 'Start at the bottom of the list';
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
                            down.title = 'Start at the top of the list';
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
                            const updateList = async()=>{
                                if (!dom.order.filter.root.classList.contains('stwid--active')) return;
                                const closure = new (await SlashCommandParser.getScope())();
                                filterStack.push(closure);
                                const clone = inp.value;
                                const script = `return async function orderHelperFilter(data) {${clone}}();`;
                                try {
                                    await closure.compile(script);
                                    const entries = getOrderHelperEntries(orderHelperState.book, true);
                                    for (const e of entries) {
                                        const row = dom.order.entries[e.book][e.data.uid];
                                        setOrderHelperRowFilterState(row, 'stwidFilterScript', true);
                                    }
                                    for (const e of entries) {
                                        closure.scope.setVariable('entry', JSON.stringify(Object.assign({ book:e.book }, e.data)));
                                        const result = (await closure.execute()).pipe;
                                        if (filterStack.at(-1) != closure) {
                                            filterStack.splice(filterStack.indexOf(closure), 1);
                                            return;
                                        }
                                        const row = dom.order.entries[e.book][e.data.uid];
                                        setOrderHelperRowFilterState(row, 'stwidFilterScript', !isTrueBoolean(result));
                                    }
                                    filterStack.splice(filterStack.indexOf(closure), 1);
                                } catch { /* empty */ }
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
                            ];
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
                                    } else {
                                        th.textContent = col.label;
                                    }
                                    if (col.key) {
                                        th.setAttribute('data-col', col.key);
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
                        $(tbody).sortable({
                            delay: getSortableDelay(),
                            update: async()=>{
                                setOrderHelperSort(SORT.CUSTOM, SORT_DIRECTION.ASCENDING);
                                const rows = getOrderHelperRows();
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
                            },
                        });
                        for (const e of entries) {
                            const tr = document.createElement('tr'); {
                                tr.setAttribute('data-book', e.book);
                                tr.setAttribute('data-uid', e.data.uid);
                                tr.dataset.stwidFilterStrategy = 'false';
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
                                        btn.title = 'Toggle selection for applying Order values';
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
                                    const i = document.createElement('div'); {
                                        i.classList.add('stwid--sortableHandle');
                                        i.textContent = '☰';
                                        handle.append(i);
                                    }
                                    tr.append(handle);
                                }
                                const active = document.createElement('td'); {
                                    active.setAttribute('data-col', 'enabled');
                                    const isEnabled = /**@type {HTMLSelectElement}*/(document.querySelector('#entry_edit_template [name="entryKillSwitch"]').cloneNode(true)); {
                                        isEnabled.classList.add('stwid--enabled');
                                        if (e.data.disable) {
                                            isEnabled.classList.toggle('fa-toggle-off');
                                            isEnabled.classList.toggle('fa-toggle-on');
                                        }
                                        isEnabled.addEventListener('click', async()=>{
                                            const dis = isEnabled.classList.toggle('fa-toggle-off');
                                            isEnabled.classList.toggle('fa-toggle-on');
                                            cache[e.book].dom.entry[e.data.uid].isEnabled.classList.toggle('fa-toggle-off');
                                            cache[e.book].dom.entry[e.data.uid].isEnabled.classList.toggle('fa-toggle-on');
                                            cache[e.book].entries[e.data.uid].disable = dis;
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
                                    pos.value = e.data.position;
                                    pos.addEventListener('change', async()=>{
                                        const value = pos.value;
                                        cache[e.book].dom.entry[e.data.uid].position.value = value;
                                        cache[e.book].entries[e.data.uid].position = value;
                                        e.data.position = value;
                                        updateOutlet?.();
                                        await saveWorldInfo(e.book, buildSavePayload(e.book), true);
                                    });
                                    position.append(pos);
                                    tr.append(position);
                                }
                                const depth = document.createElement('td'); {
                                    depth.setAttribute('data-col', 'depth');
                                    const inp = document.createElement('input'); {
                                        inp.classList.add('stwid--input');
                                        inp.classList.add('text_pole');
                                        inp.name = 'depth';
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
                                    const inp = document.createElement('input'); {
                                        inp.classList.add('stwid--input');
                                        inp.classList.add('text_pole');
                                        inp.name = 'order';
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
                                    const inp = document.createElement('input'); {
                                        inp.classList.add('stwid--input');
                                        inp.classList.add('text_pole');
                                        inp.name = 'sticky';
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
                                    const inp = document.createElement('input'); {
                                        inp.classList.add('stwid--input');
                                        inp.classList.add('text_pole');
                                        inp.name = 'cooldown';
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
                                    const inp = document.createElement('input'); {
                                        inp.classList.add('stwid--input');
                                        inp.classList.add('text_pole');
                                        inp.name = 'delay';
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
                                    const inp = document.createElement('input'); {
                                        inp.classList.add('stwid--input');
                                        inp.classList.add('text_pole');
                                        inp.classList.add('stwid--orderInputTight');
                                        inp.name = 'automationId';
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
                                    const inp = document.createElement('input'); {
                                        inp.classList.add('stwid--input');
                                        inp.classList.add('text_pole');
                                        inp.name = 'selective_probability';
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
                                                    input.checked = Boolean(e.data[key]);
                                                    input.addEventListener('change', async()=> {
                                                        const entryData = cache[e.book].entries[e.data.uid];
                                                        entryData[key] = input.checked;
                                                        e.data[key] = input.checked;
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
                                setOrderHelperRowSelected(tr, true);
                                tbody.append(tr);
                            }
                        }
                        applyOrderHelperStrategyFilters();
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

    const openOrderHelper = (book = null)=>{
        if (!dom.order.toggle) return;
        dom.order.toggle.classList.add('stwid--active');
        renderOrderHelper(book);
    };

    return { openOrderHelper };
};
