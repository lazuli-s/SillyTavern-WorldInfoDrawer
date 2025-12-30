import { morphdom } from '../lib.js';
import { cloneMetadata } from './sortHelpers.js';

let state = {};

let searchInput;
let searchEntriesInput;
let loadListDebounced;

const collapseStates = {};

/** Last clicked/selected DOM (WI entry) @type {HTMLElement} */
let selectLast = null;
/** Name of the book to select WI entries from @type {string} */
let selectFrom = null;
/**@type {'ctrl'|'shift'} */
let selectMode = null;
/** List of selected entries (WI data) @type {{}[]} */
let selectList = null;
/** toastr reference showing selection help @type {JQuery<HTMLElement>} */
let selectToast = null;

const setCollapseState = (name, isCollapsed)=>{
    collapseStates[name] = Boolean(isCollapsed);
};

const hasExpandedBooks = ()=>Object.values(state.cache).some((book)=>{
    const entryList = book?.dom?.entryList;
    return entryList && !entryList.classList.contains('stwid--isCollapsed');
});

const updateCollapseAllToggle = ()=>{
    const hasExpanded = hasExpandedBooks();
    const btn = state.dom.collapseAllToggle;
    if (!btn) return;
    const icon = btn.querySelector('i');
    icon?.classList.toggle('fa-compress', hasExpanded);
    icon?.classList.toggle('fa-expand', !hasExpanded);
    const label = hasExpanded ? 'Collapse All Books' : 'Expand All Books';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-pressed', hasExpanded ? 'true' : 'false');
};

const applyCollapseState = (name)=>{
    const isCollapsed = collapseStates[name];
    const world = state.cache[name];
    if (isCollapsed === undefined || !world?.dom?.entryList || !world?.dom?.collapseToggle) return;
    world.dom.entryList.classList.toggle('stwid--isCollapsed', isCollapsed);
    if (isCollapsed) {
        world.dom.collapseToggle.classList.remove('fa-chevron-up');
        world.dom.collapseToggle.classList.add('fa-chevron-down');
    } else {
        world.dom.collapseToggle.classList.add('fa-chevron-up');
        world.dom.collapseToggle.classList.remove('fa-chevron-down');
    }
};

const setBookCollapsed = (name, isCollapsed)=>{
    setCollapseState(name, isCollapsed);
    applyCollapseState(name);
    updateCollapseAllToggle();
};

const getBookSortChoice = (name)=>{
    const bookSort = state.Settings.instance.useBookSorts ? state.cache[name]?.sort : null;
    return {
        sort: bookSort?.sort ?? state.Settings.instance.sortLogic,
        direction: bookSort?.direction ?? state.Settings.instance.sortDirection,
    };
};

const sortEntriesIfNeeded = (name)=>{
    const { sort, direction } = getBookSortChoice(name);
    const sorted = state.sortEntries(Object.values(state.cache[name].entries), sort, direction);
    let needsSort = false;
    let i = 0;
    for (const e of sorted) {
        if (state.cache[name].dom.entryList.children[i] != state.cache[name].dom.entry[e.uid].root) {
            needsSort = true;
            break;
        }
        i++;
    }
    if (needsSort) {
        for (const e of sorted) {
            state.cache[name].dom.entryList.append(state.cache[name].dom.entry[e.uid].root);
        }
    }
};

const setCacheMetadata = (name, metadata = {})=>{
    state.cache[name].metadata = cloneMetadata(metadata);
    state.cache[name].sort = state.getSortFromMetadata(state.cache[name].metadata);
};

const setBookSortPreference = async(name, sort = null, direction = null)=>{
    const hasSort = Boolean(sort && direction);
    state.cache[name].metadata ??= {};
    state.cache[name].metadata[state.METADATA_NAMESPACE] ??= {};
    if (hasSort) {
        state.cache[name].metadata[state.METADATA_NAMESPACE][state.METADATA_SORT_KEY] = { sort, direction };
        state.cache[name].sort = { sort, direction };
    } else {
        delete state.cache[name].metadata[state.METADATA_NAMESPACE][state.METADATA_SORT_KEY];
        if (Object.keys(state.cache[name].metadata[state.METADATA_NAMESPACE]).length === 0) {
            delete state.cache[name].metadata[state.METADATA_NAMESPACE];
        }
        if (Object.keys(state.cache[name].metadata).length === 0) {
            state.cache[name].metadata = {};
        }
        state.cache[name].sort = null;
    }
    await state.saveWorldInfo(name, state.buildSavePayload(name), true);
    sortEntriesIfNeeded(name);
};

const clearBookSortPreferences = async()=>{
    for (const [name, data] of Object.entries(state.cache)) {
        const hasSortPreference = Boolean(data.metadata?.[state.METADATA_NAMESPACE]?.[state.METADATA_SORT_KEY]);
        if (!hasSortPreference) continue;
        await setBookSortPreference(name, null, null);
    }
};

const selectEnd = ()=>{
    selectFrom = null;
    selectMode = null;
    selectList = null;
    selectLast = null;
    if (selectToast) {
        toastr.clear(selectToast);
    }
    state.dom.books.classList.remove('stwid--isDragging');
    [...state.dom.books.querySelectorAll('.stwid--entry.stwid--isSelected')]
        .forEach(it=>{
            it.classList.remove('stwid--isSelected');
            it.removeAttribute('draggable');
            const icon = it.querySelector('.stwid--selector > .stwid--icon');
            icon.classList.add('fa-square');
            icon.classList.remove('fa-square-check');
        })
    ;
    [...state.dom.books.querySelectorAll('.stwid--book.stwid--isTarget')]
        .forEach(it=>{
            it.classList.remove('stwid--isTarget');
        })
    ;
};

/**
 *
 * @param {HTMLElement} entry
 */
const selectAdd = (entry)=>{
    entry.classList.add('stwid--isSelected');
    entry.setAttribute('draggable', 'true');
    const icon = entry.querySelector('.stwid--selector > .stwid--icon');
    icon.classList.remove('fa-square');
    icon.classList.add('fa-square-check');
};

const selectRemove = (entry)=>{
    entry.classList.remove('stwid--isSelected');
    entry.setAttribute('draggable', 'false');
    const icon = entry.querySelector('.stwid--selector > .stwid--icon');
    icon.classList.add('fa-square');
    icon.classList.remove('fa-square-check');
};

const renderBook = async(name, before = null, bookData = null, target = state.dom.books)=>{
    const data = bookData ?? await state.loadWorldInfo(name);
    const world = { entries:{}, metadata: cloneMetadata(data.metadata), sort:state.getSortFromMetadata(data.metadata) };
    for (const [k,v] of Object.entries(data.entries)) {
        world.entries[k] = structuredClone(v);
    }
    world.dom = {
        /**@type {HTMLElement} */
        root: undefined,
        /**@type {HTMLElement} */
        name: undefined,
        /**@type {HTMLElement} */
        active: undefined,
        /**@type {HTMLElement} */
        entryList: undefined,
        /**@type {{ [uid:string]:{root:HTMLElement, comment:HTMLElement, key:HTMLElement}}} */
        entry: {},
    };
    state.cache[name] = world;
    const book = document.createElement('div'); {
        world.dom.root = book;
        book.classList.add('stwid--book');
        book.addEventListener('dragover', (evt)=>{
            if (selectFrom === null) return;
            evt.preventDefault();
            book.classList.add('stwid--isTarget');
        });
        book.addEventListener('dragleave', (evt)=>{
            if (selectFrom === null) return;
            book.classList.remove('stwid--isTarget');
        });
        book.addEventListener('drop', async(evt)=>{
            if (selectFrom === null) return;
            evt.preventDefault();
            const isCopy = evt.ctrlKey;
            if (selectFrom != name || isCopy) {
                const srcBook = await state.loadWorldInfo(selectFrom);
                const dstBook = await state.loadWorldInfo(name);
                for (const srcEntry of selectList) {
                    const uid = srcEntry.uid;
                    const oData = Object.assign({}, srcEntry);
                    delete oData.uid;
                    const dstEntry = state.createWorldInfoEntry(null, dstBook);
                    Object.assign(dstEntry, oData);
                    await state.saveWorldInfo(name, dstBook, true);
                    if (!isCopy) {
                        const deleted = await state.deleteWorldInfoEntry(srcBook, uid, { silent:true });
                        if (deleted) {
                            state.deleteWIOriginalDataValue(srcBook, uid);
                        }
                    }
                }
                if (selectFrom != name) {
                    await state.saveWorldInfo(selectFrom, srcBook, true);
                    state.updateWIChange(selectFrom, srcBook);
                }
                state.updateWIChange(name, dstBook);
            }
            selectEnd();
        });
        const head = document.createElement('div'); {
            head.classList.add('stwid--head');
            let collapseToggle;
            const title = document.createElement('div'); {
                world.dom.name = title;
                title.classList.add('stwid--title');
                title.textContent = name;
                title.addEventListener('click', ()=>{
                    const isCollapsed = !entryList.classList.contains('stwid--isCollapsed');
                    setBookCollapsed(name, isCollapsed);
                });
                head.append(title);
            }
            const actions = document.createElement('div'); {
                actions.classList.add('stwid--actions');
                const active = document.createElement('input'); {
                    world.dom.active = active;
                    active.title = 'Globally active';
                    active.type = 'checkbox';
                    active.checked = state.selected_world_info.includes(name);
                    active.addEventListener('click', async()=>{
                        active.disabled = true;
                        const select = /**@type {HTMLSelectElement}*/(document.querySelector('#world_info'));
                        const option = select ? [...select.options].find((opt)=>opt.textContent === name) : null;
                        if (option && select) {
                            option.selected = active.checked;
                            state.onWorldInfoChange('__notSlashCommand__');
                        }
                        active.disabled = false;
                    });
                    actions.append(active);
                }
                const add = document.createElement('div'); {
                    add.classList.add('stwid--action');
                    add.classList.add('stwid--add');
                    add.classList.add('fa-solid', 'fa-fw', 'fa-plus');
                    add.title = 'New Entry';
                    add.addEventListener('click', async()=>{
                        const data = state.buildSavePayload(name);
                        const newEntry = state.createWorldInfoEntry(name, data);
                        state.cache[name].entries[newEntry.uid] = structuredClone(newEntry);
                        await state.renderEntry(newEntry, name);
                        state.cache[name].dom.entry[newEntry.uid].root.click();
                        await state.saveWorldInfo(name, data, true);
                    });
                    actions.append(add);
                }
                const menuTrigger = document.createElement('div'); {
                    menuTrigger.classList.add('stwid--action');
                    menuTrigger.classList.add('stwid--menuTrigger');
                    menuTrigger.classList.add('fa-solid', 'fa-fw', 'fa-ellipsis-vertical');
                    menuTrigger.addEventListener('click', ()=>{
                        menuTrigger.style.anchorName = '--stwid--ctxAnchor';
                        const blocker = document.createElement('div'); {
                            blocker.classList.add('stwid--blocker');
                            blocker.addEventListener('mousedown', (evt)=>{
                                evt.stopPropagation();
                            });
                            blocker.addEventListener('pointerdown', (evt)=>{
                                evt.stopPropagation();
                            });
                            blocker.addEventListener('touchstart', (evt)=>{
                                evt.stopPropagation();
                            });
                            blocker.addEventListener('click', (evt)=>{
                                evt.stopPropagation();
                                blocker.remove();
                                menuTrigger.style.anchorName = '';
                            });
                            const menu = document.createElement('div'); {
                                menu.classList.add('stwid--menu');
                                const rename = document.createElement('div'); {
                                    rename.classList.add('stwid--item');
                                    rename.classList.add('stwid--rename');
                                    rename.addEventListener('click', async(evt)=>{
                                        //TODO cheeky monkey
                                        const sel = /**@type {HTMLSelectElement}*/(document.querySelector('#world_editor_select'));
                                        sel.value = /**@type {HTMLOptionElement[]}*/([...sel.children]).find(it=>it.textContent == name).value;
                                        sel.dispatchEvent(new Event('change', { bubbles:true }));
                                        await state.delay(500);
                                        document.querySelector('#world_popup_name_button').click();
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-pencil');
                                        rename.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Rename Book';
                                        rename.append(txt);
                                    }
                                    menu.append(rename);
                                }
                                if (state.extensionNames.includes('third-party/SillyTavern-WorldInfoBulkEdit')) {
                                    const bulk = document.createElement('div'); {
                                        bulk.classList.add('stwid--item');
                                        bulk.classList.add('stwid--bulkEdit');
                                        bulk.addEventListener('click', async(evt)=>{
                                            //TODO cheeky monkey
                                            const sel = /**@type {HTMLSelectElement}*/(document.querySelector('#world_editor_select'));
                                            sel.value = /**@type {HTMLOptionElement[]}*/([...sel.children]).find(it=>it.textContent == name).value;
                                            sel.dispatchEvent(new Event('change', { bubbles:true }));
                                            await state.delay(500);
                                            document.querySelector('.stwibe--trigger').click();
                                        });
                                        const i = document.createElement('i'); {
                                            i.classList.add('stwid--icon');
                                            i.classList.add('fa-solid', 'fa-fw', 'fa-list-check');
                                            bulk.append(i);
                                        }
                                        const txt = document.createElement('span'); {
                                            txt.classList.add('stwid--label');
                                            txt.textContent = 'Bulk Edit';
                                            bulk.append(txt);
                                        }
                                        menu.append(bulk);
                                    }
                                }
                                if (state.extensionNames.includes('third-party/SillyTavern-WorldInfoExternalEditor')) {
                                    const editor = document.createElement('div'); {
                                        editor.classList.add('stwid--item');
                                        editor.classList.add('stwid--externalEditor');
                                        editor.addEventListener('click', async(evt)=>{
                                            fetch('/api/plugins/wiee/editor', {
                                                method: 'POST',
                                                headers: state.getRequestHeaders(),
                                                body: JSON.stringify({
                                                    book: name,
                                                    command: 'code',
                                                    commandArguments: ['.'],
                                                }),
                                            });
                                        });
                                        const i = document.createElement('i'); {
                                            i.classList.add('stwid--icon');
                                            i.classList.add('fa-solid', 'fa-fw', 'fa-laptop-code');
                                            editor.append(i);
                                        }
                                        const txt = document.createElement('span'); {
                                            txt.classList.add('stwid--label');
                                            txt.textContent = 'External Editor';
                                            editor.append(txt);
                                        }
                                        menu.append(editor);
                                    }
                                }
                                const fillTitles = document.createElement('div'); {
                                    fillTitles.classList.add('stwid--item');
                                    fillTitles.classList.add('stwid--fillTitles');
                                    fillTitles.addEventListener('click', async()=>{
                                        await state.fillEmptyTitlesWithKeywords(name);
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-wand-magic-sparkles');
                                        fillTitles.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Fill Empty Titles';
                                        fillTitles.append(txt);
                                    }
                                    menu.append(fillTitles);
                                }
                                const bookSort = document.createElement('div'); {
                                    bookSort.classList.add('stwid--item');
                                    bookSort.classList.add('stwid--bookSort');
                                    bookSort.addEventListener('click', (evt)=>evt.stopPropagation());
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-list-ol');
                                        bookSort.append(i);
                                    }
                                    const label = document.createElement('span'); {
                                        label.classList.add('stwid--label');
                                        label.textContent = 'Book Sort';
                                        bookSort.append(label);
                                    }
                                    const sortSelect = document.createElement('select'); {
                                        sortSelect.classList.add('text_pole');
                                        sortSelect.addEventListener('click', (evt)=>evt.stopPropagation());
                                        const hasCustomSort = Boolean(state.cache[name].sort);
                                        const globalLabel = state.getSortLabel(state.Settings.instance.sortLogic, state.Settings.instance.sortDirection) ?? 'Global default';
                                        const globalOpt = document.createElement('option'); {
                                            globalOpt.value = 'null';
                                            globalOpt.textContent = `Use global (${globalLabel})`;
                                            globalOpt.selected = !hasCustomSort;
                                            sortSelect.append(globalOpt);
                                        }
                                        state.appendSortOptions(sortSelect, state.cache[name].sort?.sort, state.cache[name].sort?.direction);
                                        sortSelect.addEventListener('change', async()=>{
                                            const value = sortSelect.value === 'null' ? null : JSON.parse(sortSelect.value);
                                            if (value) {
                                                await setBookSortPreference(name, value.sort, value.direction);
                                            } else {
                                                await setBookSortPreference(name, null, null);
                                            }
                                            blocker.remove();
                                            menuTrigger.style.anchorName = '';
                                        });
                                    }
                                    bookSort.append(sortSelect);
                                    menu.append(bookSort);
                                }
                                const orderHelper = document.createElement('div'); {
                                    orderHelper.classList.add('stwid--item');
                                    orderHelper.classList.add('stwid--orderHelper');
                                    orderHelper.addEventListener('click', ()=>{
                                        state.openOrderHelper(name);
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-arrow-down-wide-short');
                                        orderHelper.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Order Helper';
                                        orderHelper.append(txt);
                                    }
                                    menu.append(orderHelper);
                                }
                                const stloButton = document.createElement('div'); {
                                    stloButton.id = 'lorebook_ordering_button';
                                    stloButton.classList.add('stwid--item');
                                    stloButton.classList.add('stwid--stlo');
                                    stloButton.dataset.i18n = '[title]stlo.button.configure; [aria-label]stlo.button.configure';
                                    stloButton.title = 'Configure STLO Priority & Budget';
                                    stloButton.setAttribute('aria-label', 'Configure STLO Priority & Budget');
                                    stloButton.tabIndex = 0;
                                    stloButton.setAttribute('role', 'button');
                                    stloButton.addEventListener('click', async(evt)=>{
                                        evt.stopPropagation();
                                        const escapedName = name.replaceAll('"', '\\"');
                                        await state.executeSlashCommand(`/stlo "${escapedName}"`);
                                        blocker.remove();
                                        menuTrigger.style.anchorName = '';
                                    });
                                    stloButton.addEventListener('keydown', (evt)=>{
                                        if (evt.key === 'Enter' || evt.key === ' ') {
                                            evt.preventDefault();
                                            stloButton.click();
                                        }
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-bars-staggered');
                                        stloButton.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Configure STLO';
                                        stloButton.append(txt);
                                    }
                                    menu.append(stloButton);
                                }
                                const exp = document.createElement('div'); {
                                    exp.classList.add('stwid--item');
                                    exp.classList.add('stwid--export');
                                    exp.addEventListener('click', async(evt)=>{
                                        state.download(JSON.stringify({ entries:state.cache[name].entries }), name, 'application/json');
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-file-export');
                                        exp.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Export Book';
                                        exp.append(txt);
                                    }
                                    menu.append(exp);
                                }
                                const dup = document.createElement('div'); {
                                    dup.classList.add('stwid--item');
                                    dup.classList.add('stwid--duplicate');
                                    dup.addEventListener('click', async(evt)=>{
                                        //TODO cheeky monkey
                                        const sel = /**@type {HTMLSelectElement}*/(document.querySelector('#world_editor_select'));
                                        sel.value = /**@type {HTMLOptionElement[]}*/([...sel.children]).find(it=>it.textContent == name).value;
                                        sel.dispatchEvent(new Event('change', { bubbles:true }));
                                        await state.delay(500);
                                        document.querySelector('#world_duplicate').click();
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-paste');
                                        dup.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Duplicate Book';
                                        dup.append(txt);
                                    }
                                    menu.append(dup);
                                }
                                const del = document.createElement('div'); {
                                    del.classList.add('stwid--item');
                                    del.classList.add('stwid--delete');
                                    del.addEventListener('click', async(evt)=>{
                                        //TODO cheeky monkey
                                        const sel = /**@type {HTMLSelectElement}*/(document.querySelector('#world_editor_select'));
                                        sel.value = /**@type {HTMLOptionElement[]}*/([...sel.children]).find(it=>it.textContent == name).value;
                                        sel.dispatchEvent(new Event('change', { bubbles:true }));
                                        await state.delay(500);
                                        document.querySelector('#world_popup_delete').click();
                                    });
                                    const i = document.createElement('i'); {
                                        i.classList.add('stwid--icon');
                                        i.classList.add('fa-solid', 'fa-fw', 'fa-trash-can');
                                        del.append(i);
                                    }
                                    const txt = document.createElement('span'); {
                                        txt.classList.add('stwid--label');
                                        txt.textContent = 'Delete Book';
                                        del.append(txt);
                                    }
                                    menu.append(del);
                                }
                                blocker.append(menu);
                            }
                            document.body.append(blocker);
                        }
                    });
                    actions.append(menuTrigger);
                }
                collapseToggle = document.createElement('div'); {
                    state.cache[name].dom.collapseToggle = collapseToggle;
                    collapseToggle.classList.add('stwid--action');
                    collapseToggle.classList.add('stwid--collapseToggle');
                    collapseToggle.classList.add('fa-solid', 'fa-fw', 'fa-chevron-down');
                    collapseToggle.addEventListener('click', ()=>{
                        const isCollapsed = !entryList.classList.contains('stwid--isCollapsed');
                        setBookCollapsed(name, isCollapsed);
                    });
                    actions.append(collapseToggle);
                }
                head.append(actions);
            }
            book.append(head);
        }
        const entryList = document.createElement('div'); {
            world.dom.entryList = entryList;
            entryList.classList.add('stwid--entryList');
            entryList.classList.add('stwid--isCollapsed');
            const { sort, direction } = getBookSortChoice(name);
            for (const e of state.sortEntries(Object.values(world.entries), sort, direction)) {
                await state.renderEntry(e, name);
            }
            const initialCollapsed = collapseStates[name] ?? entryList.classList.contains('stwid--isCollapsed');
            setBookCollapsed(name, initialCollapsed);
            book.append(entryList);
        }
        if (before) before.insertAdjacentElement('beforebegin', book);
        else target.append(book);
    }
    return book;
};

const loadList = async()=>{
    state.dom.books.innerHTML = '';
    const nextBooks = state.dom.books.cloneNode(false);
    const books = await Promise.all(state.safeToSorted(state.world_names, (a,b)=>a.toLowerCase().localeCompare(b.toLowerCase())).map(async(name)=>({ name, data:await state.loadWorldInfo(name) })));
    for (const book of books) {
        await renderBook(book.name, null, book.data, nextBooks);
    }
    if (typeof morphdom === 'function') {
        morphdom(state.dom.books, nextBooks, { childrenOnly: true });
    } else {
        state.dom.books.replaceChildren(...nextBooks.children);
    }
};

const refreshList = async()=>{
    state.dom.drawer.body.classList.add('stwid--isLoading');
    state.resetEditor?.();
    for (const [bookName, bookData] of Object.entries(state.cache)) {
        const isCollapsed = bookData?.dom?.entryList?.classList.contains('stwid--isCollapsed');
        if (isCollapsed !== undefined) setCollapseState(bookName, isCollapsed);
        delete state.cache[bookName];
    }
    try {
        await loadListDebounced();
        searchInput?.dispatchEvent(new Event('input'));
    } finally {
        state.dom.drawer.body.classList.remove('stwid--isLoading');
    }
};

const setupFilter = (list)=>{
    const filter = document.createElement('div'); {
        filter.classList.add('stwid--filter');
        const search = document.createElement('input'); {
            search.classList.add('stwid--search');
            search.classList.add('text_pole');
            search.type = 'search';
            search.placeholder = 'Search books';
            searchInput = search;
            const entryMatchesQuery = (entry, query)=>{
                const title = entry.comment ?? '';
                const memo = entry.title ?? '';
                const keys = Array.isArray(entry.key) ? entry.key.join(', ') : '';
                const normalizedQuery = query.toLowerCase();
                return [title, memo, keys].some(value=>String(value ?? '').toLowerCase().includes(normalizedQuery));
            };

            search.addEventListener('input', ()=>{
                const query = search.value.toLowerCase();
                for (const b of Object.keys(state.cache)) {
                    if (query.length) {
                        const bookMatch = b.toLowerCase().includes(query);
                        const entryMatch = searchEntriesInput.checked && Object.values(state.cache[b].entries).find(e=>entryMatchesQuery(e, query));
                        if (bookMatch || entryMatch) {
                            state.cache[b].dom.root.classList.remove('stwid--filter-query');
                            if (searchEntriesInput.checked) {
                                for (const e of Object.values(state.cache[b].entries)) {
                                    if (bookMatch || entryMatchesQuery(e, query)) {
                                        state.cache[b].dom.entry[e.uid].root.classList.remove('stwid--filter-query');
                                    } else {
                                        state.cache[b].dom.entry[e.uid].root.classList.add('stwid--filter-query');
                                    }
                                }
                            }
                        } else {
                            state.cache[b].dom.root.classList.add('stwid--filter-query');
                        }
                    } else {
                        state.cache[b].dom.root.classList.remove('stwid--filter-query');
                        for (const e of Object.values(state.cache[b].entries)) {
                            state.cache[b].dom.entry[e.uid].root.classList.remove('stwid--filter-query');
                        }
                    }
                }
            });
            filter.append(search);
        }
        const searchEntries = document.createElement('label'); {
            searchEntries.classList.add('stwid--searchEntries');
            searchEntries.title = 'Search through entries as well (Title/Memo/Keys)';
            const inp = document.createElement('input'); {
                searchEntriesInput = inp;
                inp.type = 'checkbox';
                inp.addEventListener('click', ()=>{
                    search.dispatchEvent(new Event('input'));
                });
                searchEntries.append(inp);
            }
            searchEntries.append('Entries');
            filter.append(searchEntries);
        }
        const filterActive = document.createElement('label'); {
            filterActive.classList.add('stwid--filterActive');
            filterActive.title = 'Only show globally active books';
            const inp = document.createElement('input'); {
                inp.type = 'checkbox';
                inp.addEventListener('click', ()=>{
                    for (const b of Object.keys(state.cache)) {
                        if (inp.checked) {
                            if (state.selected_world_info.includes(b)) {
                                state.cache[b].dom.root.classList.remove('stwid--filter-active');
                            } else {
                                state.cache[b].dom.root.classList.add('stwid--filter-active');
                            }
                        } else {
                            state.cache[b].dom.root.classList.remove('stwid--filter-active');
                        }
                    }
                });
                filterActive.append(inp);
            }
            filterActive.append('Active');
            filter.append(filterActive);
        }
        list.append(filter);
    }
};

const setupBooks = (list)=>{
    const books = document.createElement('div'); {
        state.dom.books = books;
        books.classList.add('stwid--books');
        list.append(books);
    }
};

const setupListPanel = (list)=>{
    setupFilter(list);
    setupBooks(list);
};

const getSelectionState = ()=>({
    get selectFrom() {
        return selectFrom;
    },
    set selectFrom(value) {
        selectFrom = value;
    },
    get selectLast() {
        return selectLast;
    },
    set selectLast(value) {
        selectLast = value;
    },
    get selectList() {
        return selectList;
    },
    set selectList(value) {
        selectList = value;
    },
    get selectMode() {
        return selectMode;
    },
    set selectMode(value) {
        selectMode = value;
    },
    get selectToast() {
        return selectToast;
    },
    set selectToast(value) {
        selectToast = value;
    },
});

const initListPanel = (options)=>{
    state = options;
    loadListDebounced = state.debounceAsync(()=>loadList());
    setupListPanel(state.list);
    return {
        clearBookSortPreferences,
        getSelectionState,
        hasExpandedBooks,
        refreshList,
        renderBook,
        selectAdd,
        selectEnd,
        selectRemove,
        setBookCollapsed,
        setCacheMetadata,
        setCollapseState,
        setBookSortPreference,
        sortEntriesIfNeeded,
        updateCollapseAllToggle,
    };
};

export { initListPanel, refreshList };
