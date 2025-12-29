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
    const ORDER_HELPER_DEFAULT_COLUMNS = {
        strategy: true,
        position: true,
        depth: true,
        outlet: true,
        order: true,
        trigger: true,
    };
    const orderHelperState = (()=>{
        const state = {
            sort:SORT.TITLE,
            direction:SORT_DIRECTION.ASCENDING,
            book:null,
            hideKeys:false,
            columns: { ...ORDER_HELPER_DEFAULT_COLUMNS },
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

    const getOrderHelperEntries = (book = orderHelperState.book, includeDom = false)=>{
        const source = includeDom && dom.order.entries && dom.order.tbody
            ? Object.entries(dom.order.entries)
                .map(([entryBook, entries])=>Object.values(entries).map(tr=>({
                    book: entryBook,
                    dom: tr,
                    data: cache[entryBook].entries[tr.getAttribute('data-uid')],
                })))
                .flat()
            : Object.entries(cache)
                .filter(([name])=>getSelectedWorldInfo().includes(name))
                .map(([name,data])=>Object.values(data.entries).map(it=>({ book:name, data:it })))
                .flat();
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

    const applyOrderHelperColumnVisibility = (root)=>{
        if (!root) return;
        for (const [key, visible] of Object.entries(orderHelperState.columns)) {
            root.classList.toggle(`stwid--hide-col-${key}`, !visible);
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
        const editorPanelApi = getEditorPanelApi();
        editorPanelApi.resetEditorState();
        dom.order.entries = {};
        dom.order.filter.root = undefined;
        dom.order.filter.preview = undefined;
        dom.order.tbody = undefined;

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
                            menu.classList.add('stwid--columnMenu', 'stwid--menu');
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
                                { key:'order', label:'Order' },
                                { key:'trigger', label:'Trigger %' },
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
                        appendSortOptions(sortSel, orderHelperState.sort, orderHelperState.direction);
                        sortSel.addEventListener('change', ()=>{
                            const value = JSON.parse(sortSel.value);
                            orderHelperState.sort = value.sort;
                            orderHelperState.direction = value.direction;
                            localStorage.setItem(ORDER_HELPER_SORT_STORAGE_KEY, JSON.stringify(value));
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
                                        dom.order.entries[e.book][e.data.uid].classList.remove('stwid--isFiltered');
                                        dom.order.entries[e.book][e.data.uid].classList.add('stwid--isFiltered');
                                    }
                                    for (const e of entries) {
                                        closure.scope.setVariable('entry', JSON.stringify(Object.assign({ book:e.book }, e.data)));
                                        const result = (await closure.execute()).pipe;
                                        if (filterStack.at(-1) != closure) {
                                            filterStack.splice(filterStack.indexOf(closure), 1);
                                            return;
                                        }
                                        if (isTrueBoolean(result)) {
                                            dom.order.entries[e.book][e.data.uid].classList.remove('stwid--isFiltered');
                                        } else {
                                            dom.order.entries[e.book][e.data.uid].classList.add('stwid--isFiltered');
                                        }
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
                                { label:'Order', key:'order' },
                                { label:'Trigger %', key:'trigger' },
                            ];
                            for (const col of columns) {
                                const th = document.createElement('th'); {
                                    th.textContent = col.label;
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
                        });
                        for (const e of entries) {
                            const tr = document.createElement('tr'); {
                                tr.setAttribute('data-book', e.book);
                                tr.setAttribute('data-uid', e.data.uid);
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
                                setOrderHelperRowSelected(tr, true);
                                tbody.append(tr);
                            }
                        }
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
