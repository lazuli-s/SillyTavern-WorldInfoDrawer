const BOOK_VISIBILITY_MODES = Object.freeze({
    ALL_BOOKS: 'allBooks',
    ALL_ACTIVE: 'allActive',
    CUSTOM: 'custom',
    GLOBAL: 'global',
    CHAT: 'chat',
    PERSONA: 'persona',
    CHARACTER: 'character',
});

const BOOK_VISIBILITY_OPTIONS = Object.freeze([
    { mode:BOOK_VISIBILITY_MODES.ALL_BOOKS, icon:'fa-book-open', label:'All Books' },
    { mode:BOOK_VISIBILITY_MODES.ALL_ACTIVE, icon:'fa-layer-group', label:'All Active' },
    { mode:BOOK_VISIBILITY_MODES.GLOBAL, icon:'fa-globe', label:'Global' },
    { mode:BOOK_VISIBILITY_MODES.CHAT, icon:'fa-comments', label:'Chat' },
    { mode:BOOK_VISIBILITY_MODES.PERSONA, icon:'fa-id-badge', label:'Persona' },
    { mode:BOOK_VISIBILITY_MODES.CHARACTER, icon:'fa-user', label:'Character' },
]);

const BOOK_VISIBILITY_OPTION_TOOLTIPS = Object.freeze({
    [BOOK_VISIBILITY_MODES.ALL_BOOKS]: 'Show all books in the list, including books that are not currently active from any source.',
    [BOOK_VISIBILITY_MODES.ALL_ACTIVE]: 'Show books active from any source (Global, Chat, Persona, or Character). This shows all books currently added to context by these sources.',
    [BOOK_VISIBILITY_MODES.GLOBAL]: 'Include books enabled globally in World Info settings.',
    [BOOK_VISIBILITY_MODES.CHAT]: 'Include books linked to the current chat.',
    [BOOK_VISIBILITY_MODES.PERSONA]: 'Include books linked to the active persona.',
    [BOOK_VISIBILITY_MODES.CHARACTER]: 'Include books linked to the current character (or all group members).',
});

const BOOK_VISIBILITY_MULTISELECT_MODES = Object.freeze([
    BOOK_VISIBILITY_MODES.GLOBAL,
    BOOK_VISIBILITY_MODES.CHAT,
    BOOK_VISIBILITY_MODES.PERSONA,
    BOOK_VISIBILITY_MODES.CHARACTER,
]);

const MULTISELECT_DROPDOWN_CLOSE_HANDLER = 'stwidCloseMultiselectDropdownMenu';

const normalizeBookSourceLinks = (links)=>({
    character: Boolean(links?.character),
    chat: Boolean(links?.chat),
    persona: Boolean(links?.persona),
});

const setMultiselectDropdownOptionCheckboxState = (checkbox, isChecked)=>{
    if (!checkbox) return;
    checkbox.classList.toggle('fa-square-check', Boolean(isChecked));
    checkbox.classList.toggle('fa-square', !isChecked);
};

const closeOpenMultiselectDropdownMenus = (excludeMenu = null)=>{
    for (const menu of document.querySelectorAll('.stwid--multiselectDropdownMenu.stwid--active')) {
        if (menu === excludeMenu) continue;
        const closeMenu = menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
        if (typeof closeMenu === 'function') {
            closeMenu();
            continue;
        }
        menu.classList.remove('stwid--active');
        const trigger = menu.parentElement?.querySelector('.stwid--multiselectDropdownButton');
        trigger?.setAttribute('aria-expanded', 'false');
    }
};

const createFilterBarSlice = ({
    listPanelState,
    runtime,
    updateFolderActiveToggles,
    setApplyActiveFilter,
    onBookVisibilityScopeChange,
})=>{
    const isAllBooksVisibility = ()=>listPanelState.bookVisibilityMode === BOOK_VISIBILITY_MODES.ALL_BOOKS;
    const isAllActiveVisibility = ()=>listPanelState.bookVisibilityMode === BOOK_VISIBILITY_MODES.ALL_ACTIVE;
    const getSelectedWorldInfo = ()=>runtime.getSelectedWorldInfo ? runtime.getSelectedWorldInfo() : runtime.selected_world_info;

    const getBookVisibilityFlags = (name, selectedLookup = null)=>{
        const links = normalizeBookSourceLinks(runtime.getBookSourceLinks?.(name));
        const selected = selectedLookup instanceof Set
            ? selectedLookup
            : new Set(getSelectedWorldInfo());
        const global = selected.has(name);
        return {
            global,
            chat: links.chat,
            persona: links.persona,
            character: links.character,
            allActive: global || links.chat || links.persona || links.character,
        };
    };

    const getBookVisibilityScope = (selectedNames = null)=>{
        const cacheEntries = runtime.cache ? Object.keys(runtime.cache) : [];
        if (!cacheEntries.length) return [];
        if (isAllBooksVisibility()) return cacheEntries;
        const selected = Array.isArray(selectedNames) ? selectedNames : getSelectedWorldInfo();
        const selectedLookup = new Set(selected ?? []);
        const isAllActive = isAllActiveVisibility();
        return cacheEntries.filter((name)=>{
            const flags = getBookVisibilityFlags(name, selectedLookup);
            if (isAllActive) return flags.allActive;
            return BOOK_VISIBILITY_MULTISELECT_MODES.some((mode)=>listPanelState.bookVisibilitySelections.has(mode) && flags[mode]);
        });
    };

    const setupFilter = (list)=>{
        const filter = document.createElement('div'); {
            const searchRow = document.createElement('div');
            searchRow.classList.add('stwid--filterRow', 'stwid--filterRow--search');
            const visibilityRow = document.createElement('div');
            visibilityRow.classList.add('stwid--filterRow', 'stwid--filterRow--visibility');
            const setQueryFiltered = (element, isFiltered)=>{
                if (!element) return;
                if (isFiltered) {
                    if (!element.classList.contains('stwid--filter-query')) {
                        element.classList.add('stwid--filter-query');
                    }
                    return;
                }
                if (element.classList.contains('stwid--filter-query')) {
                    element.classList.remove('stwid--filter-query');
                }
            };

            const buildEntrySearchSignature = (entry)=>{
                const comment = entry?.comment ?? '';
                const keys = Array.isArray(entry?.key) ? entry.key.join(', ') : '';
                return `${String(comment)}\n${String(keys)}`;
            };

            const getEntrySearchText = (bookName, entry)=>{
                if (!entry?.uid) return '';
                const signature = buildEntrySearchSignature(entry);
                listPanelState.ensureEntrySearchCacheBook(bookName);
                const cached = listPanelState.getEntrySearchCacheValue(bookName, entry.uid);
                if (cached?.signature === signature) return cached.text;
                const text = signature.toLowerCase();
                listPanelState.setEntrySearchCacheValue(bookName, entry.uid, { signature, text });
                return text;
            };

            filter.classList.add('stwid--filter');
            const search = document.createElement('input'); {
                search.classList.add('stwid--search');
                search.classList.add('text_pole');
                search.type = 'search';
                search.placeholder = 'Search books';
                search.title = 'Search books by name';
                search.setAttribute('aria-label', 'Search books');
                listPanelState.searchInput = search;
                const entryMatchesQuery = (bookName, entry, normalizedQuery)=>getEntrySearchText(bookName, entry).includes(normalizedQuery);

                const applySearchFilter = ()=>{
                    const query = search.value.toLowerCase();
                    const searchEntries = listPanelState.searchEntriesInput.checked;
                    const shouldScanEntries = searchEntries && query.length >= 2;

                    for (const b of Object.keys(runtime.cache)) {
                        if (query.length) {
                            const bookMatch = b.toLowerCase().includes(query);
                            const entryMatch = shouldScanEntries
                                && Object.values(runtime.cache[b].entries).find((e)=>entryMatchesQuery(b, e, query));
                            setQueryFiltered(runtime.cache[b].dom.root, !(bookMatch || entryMatch));

                            if (shouldScanEntries) {
                                for (const e of Object.values(runtime.cache[b].entries)) {
                                    setQueryFiltered(runtime.cache[b].dom.entry[e.uid].root, !(bookMatch || entryMatchesQuery(b, e, query)));
                                }
                            } else {
                                for (const e of Object.values(runtime.cache[b].entries)) {
                                    setQueryFiltered(runtime.cache[b].dom.entry[e.uid].root, false);
                                }
                            }
                        } else {
                            setQueryFiltered(runtime.cache[b].dom.root, false);
                            for (const e of Object.values(runtime.cache[b].entries)) {
                                setQueryFiltered(runtime.cache[b].dom.entry[e.uid].root, false);
                            }
                        }
                    }
                    updateFolderActiveToggles();
                };

                const applySearchFilterDebounced = runtime.debounce(()=>applySearchFilter(), 125);

                search.addEventListener('input', ()=>{
                    applySearchFilterDebounced();
                });
                searchRow.append(search);
            }
            const searchEntries = document.createElement('label'); {
                searchEntries.classList.add('stwid--searchEntries');
                searchEntries.title = 'Search through entries as well (Title/Memo/Keys)';
                const inp = document.createElement('input'); {
                    listPanelState.searchEntriesInput = inp;
                    inp.type = 'checkbox';
                    inp.addEventListener('click', ()=>{
                        search.dispatchEvent(new Event('input'));
                    });
                    searchEntries.append(inp);
                }
                searchEntries.append('Entries');
                searchRow.append(searchEntries);
            }
            const getBookVisibilityOption = (mode)=>
                BOOK_VISIBILITY_OPTIONS.find((option)=>option.mode === mode) ?? BOOK_VISIBILITY_OPTIONS[0];

            const setAllBooksVisibility = ()=>{
                listPanelState.bookVisibilityMode = BOOK_VISIBILITY_MODES.ALL_BOOKS;
                listPanelState.bookVisibilitySelections.clear();
            };

            const setAllActiveVisibility = ()=>{
                listPanelState.bookVisibilityMode = BOOK_VISIBILITY_MODES.ALL_ACTIVE;
                listPanelState.bookVisibilitySelections.clear();
            };

            const toggleVisibilitySelection = (mode)=>{
                if (!BOOK_VISIBILITY_MULTISELECT_MODES.includes(mode)) return;
                if (isAllBooksVisibility() || isAllActiveVisibility()) {
                    listPanelState.bookVisibilityMode = BOOK_VISIBILITY_MODES.CUSTOM;
                    listPanelState.bookVisibilitySelections.clear();
                    listPanelState.bookVisibilitySelections.add(mode);
                    return;
                }
                if (listPanelState.bookVisibilitySelections.has(mode)) {
                    listPanelState.bookVisibilitySelections.delete(mode);
                } else {
                    listPanelState.bookVisibilitySelections.add(mode);
                }
                if (listPanelState.bookVisibilitySelections.size === 0) {
                    setAllBooksVisibility();
                }
            };

            const createBookVisibilityIcon = (option, extraClass = '')=>{
                const icon = document.createElement('i');
                icon.classList.add('fa-solid', 'fa-fw', option.icon);
                if (extraClass) {
                    icon.classList.add(extraClass);
                }
                return icon;
            };

            const renderVisibilityChips = ()=>{
                if (!listPanelState.bookVisibilityChips) return;
                listPanelState.bookVisibilityChips.innerHTML = '';
                if (isAllBooksVisibility()) {
                    const visibilityOption = getBookVisibilityOption(BOOK_VISIBILITY_MODES.ALL_BOOKS);
                    const visibilityChip = document.createElement('span');
                    visibilityChip.classList.add('stwid--visibilityChip');
                    visibilityChip.append(createBookVisibilityIcon(visibilityOption, 'stwid--icon'));
                    const visibilityLabel = document.createElement('span');
                    visibilityLabel.textContent = visibilityOption.label;
                    visibilityChip.append(visibilityLabel);
                    visibilityChip.title = `Active filter: ${visibilityOption.label}.`;
                    visibilityChip.setAttribute('aria-label', `Active filter: ${visibilityOption.label}.`);
                    listPanelState.bookVisibilityChips.append(visibilityChip);
                } else if (isAllActiveVisibility()) {
                    const visibilityOption = getBookVisibilityOption(BOOK_VISIBILITY_MODES.ALL_ACTIVE);
                    const visibilityChip = document.createElement('span');
                    visibilityChip.classList.add('stwid--visibilityChip');
                    visibilityChip.append(createBookVisibilityIcon(visibilityOption, 'stwid--icon'));
                    const visibilityLabel = document.createElement('span');
                    visibilityLabel.textContent = visibilityOption.label;
                    visibilityChip.append(visibilityLabel);
                    visibilityChip.title = `Active filter: ${visibilityOption.label}.`;
                    visibilityChip.setAttribute('aria-label', `Active filter: ${visibilityOption.label}.`);
                    listPanelState.bookVisibilityChips.append(visibilityChip);
                } else {
                    for (const mode of BOOK_VISIBILITY_MULTISELECT_MODES) {
                        if (!listPanelState.bookVisibilitySelections.has(mode)) continue;
                        const option = getBookVisibilityOption(mode);
                        const chip = document.createElement('span');
                        chip.classList.add('stwid--visibilityChip');
                        chip.append(createBookVisibilityIcon(option, 'stwid--icon'));
                        const chipLabel = document.createElement('span');
                        chipLabel.textContent = option.label;
                        chip.append(chipLabel);
                        chip.title = `Active filter: ${option.label}.`;
                        chip.setAttribute('aria-label', `Active filter: ${option.label}.`);
                        listPanelState.bookVisibilityChips.append(chip);
                    }
                }
            };

            const closeBookVisibilityMenu = ()=>{
                if (!listPanelState.bookVisibilityMenu) return;
                listPanelState.bookVisibilityMenu.classList.remove('stwid--active');
                const trigger = listPanelState.bookVisibilityMenu.parentElement?.querySelector('.stwid--multiselectDropdownButton');
                trigger?.setAttribute('aria-expanded', 'false');
            };

            const applyActiveFilter = ()=>{
                const visibleBookNames = getBookVisibilityScope(getSelectedWorldInfo());
                const visibleBookLookup = new Set(visibleBookNames);
                const isAllBooks = isAllBooksVisibility();
                const isAllActive = isAllActiveVisibility();
                for (const b of Object.keys(runtime.cache)) {
                    const hideByVisibilityFilter = !visibleBookLookup.has(b);
                    runtime.cache[b].dom.root.classList.toggle('stwid--filter-visibility', hideByVisibilityFilter);
                }
                if (listPanelState.bookVisibilityMenu) {
                    for (const option of listPanelState.bookVisibilityMenu.querySelectorAll('.stwid--multiselectDropdownOption')) {
                        const optionMode = option.getAttribute('data-mode');
                        let isActive = false;
                        if (optionMode === BOOK_VISIBILITY_MODES.ALL_BOOKS) {
                            isActive = isAllBooks;
                        } else if (optionMode === BOOK_VISIBILITY_MODES.ALL_ACTIVE) {
                            isActive = isAllActive;
                        } else {
                            isActive = listPanelState.bookVisibilitySelections.has(optionMode);
                        }
                        option.classList.toggle('stwid--active', isActive);
                        option.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                        const optionCheckbox = option.querySelector('.stwid--multiselectDropdownOptionCheckbox');
                        if (optionCheckbox) {
                            setMultiselectDropdownOptionCheckboxState(optionCheckbox, isActive);
                        }
                    }
                }
                renderVisibilityChips();
                onBookVisibilityScopeChange?.(visibleBookNames);
                updateFolderActiveToggles();
            };
            setApplyActiveFilter(applyActiveFilter);
            const bookVisibility = document.createElement('div'); {
                bookVisibility.classList.add('stwid--bookVisibility');

                const menuWrap = document.createElement('div');
                menuWrap.classList.add('stwid--multiselectDropdownWrap');

                const trigger = document.createElement('button');
                trigger.type = 'button';
                trigger.classList.add('menu_button', 'stwid--multiselectDropdownButton');
                trigger.title = 'Select which book sources are visible in the list.';
                trigger.setAttribute('aria-label', 'Book visibility mode');
                trigger.setAttribute('aria-expanded', 'false');
                trigger.setAttribute('aria-haspopup', 'true');
                const triggerIcon = document.createElement('i');
                triggerIcon.classList.add('fa-solid', 'fa-fw', 'fa-filter');
                trigger.append(triggerIcon);
                const triggerLabel = document.createElement('span');
                triggerLabel.classList.add('stwid--bookVisibilityButtonLabel');
                triggerLabel.textContent = 'Book Visibility';
                trigger.append(triggerLabel);
                menuWrap.append(trigger);
                const helper = document.createElement('i');
                helper.classList.add('fa-solid', 'fa-circle-question', 'stwid--bookVisibilityHelp');
                helper.title = 'This only affects which books are shown in the list panel. It does not change which books are added to the prompt/context.';
                helper.setAttribute('aria-label', helper.title);
                helper.tabIndex = 0;
                menuWrap.append(helper);

                const menu = document.createElement('div');
                menu.classList.add('stwid--multiselectDropdownMenu', 'stwid--bookVisibilityMenu');
                listPanelState.bookVisibilityMenu = menu;

                for (const option of BOOK_VISIBILITY_OPTIONS) {
                    const optionTooltip = BOOK_VISIBILITY_OPTION_TOOLTIPS[option.mode] ?? option.label;
                    const optionButton = document.createElement('button');
                    optionButton.type = 'button';
                    optionButton.classList.add('stwid--multiselectDropdownOption');
                    optionButton.setAttribute('data-mode', option.mode);
                    optionButton.setAttribute('aria-pressed', 'false');
                    optionButton.title = optionTooltip;
                    optionButton.setAttribute('aria-label', optionTooltip);
                    if (option.mode !== BOOK_VISIBILITY_MODES.ALL_BOOKS && option.mode !== BOOK_VISIBILITY_MODES.ALL_ACTIVE) {
                        const optionCheckbox = document.createElement('i');
                        optionCheckbox.classList.add(
                            'fa-solid',
                            'fa-fw',
                            'stwid--multiselectDropdownOptionCheckbox',
                        );
                        optionCheckbox.setAttribute('aria-hidden', 'true');
                        setMultiselectDropdownOptionCheckboxState(optionCheckbox, false);
                        optionButton.append(optionCheckbox);
                    }
                    optionButton.append(createBookVisibilityIcon(option, 'stwid--multiselectDropdownOptionIcon'));
                    const optionLabel = document.createElement('span');
                    optionLabel.textContent = option.label;
                    optionButton.append(optionLabel);
                    optionButton.addEventListener('click', ()=>{
                        if (option.mode === BOOK_VISIBILITY_MODES.ALL_BOOKS) {
                            setAllBooksVisibility();
                        } else if (option.mode === BOOK_VISIBILITY_MODES.ALL_ACTIVE) {
                            setAllActiveVisibility();
                        } else {
                            toggleVisibilitySelection(option.mode);
                        }
                        applyActiveFilter();
                    });
                    menu.append(optionButton);
                }
                menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER] = closeBookVisibilityMenu;
                menuWrap.append(menu);

                trigger.addEventListener('click', (evt)=>{
                    evt.preventDefault();
                    evt.stopPropagation();
                    const shouldOpen = !menu.classList.contains('stwid--active');
                    closeBookVisibilityMenu();
                    if (shouldOpen) {
                        closeOpenMultiselectDropdownMenus(menu);
                        menu.classList.add('stwid--active');
                        trigger.setAttribute('aria-expanded', 'true');
                    }
                });
                visibilityRow.append(bookVisibility);

                const chips = document.createElement('div');
                chips.classList.add('stwid--visibilityChips');
                listPanelState.bookVisibilityChips = chips;
                bookVisibility.append(menuWrap);
                bookVisibility.append(chips);

                document.addEventListener('click', (evt)=>{
                    if (!menu.classList.contains('stwid--active')) return;
                    const target = evt.target instanceof HTMLElement ? evt.target : null;
                    if (target?.closest('.stwid--bookVisibility')) return;
                    closeBookVisibilityMenu();
                });
            }
            filter.append(searchRow, visibilityRow);
            applyActiveFilter();
            list.append(filter);
        }
    };

    return {
        getBookVisibilityScope,
        setupFilter,
    };
};

export {
    BOOK_VISIBILITY_MODES,
    createFilterBarSlice,
};
