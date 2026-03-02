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
    for (const menu of document.querySelectorAll('.stwid--multiselectDropdownMenu.stwid--state-active')) {
        if (menu === excludeMenu) continue;
        const closeMenu = menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
        if (typeof closeMenu === 'function') {
            closeMenu();
            continue;
        }
        menu.classList.remove('stwid--state-active');
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

    let docClickHandler = null;
    const setupFilter = (list)=>{
        const controlsRowEl = runtime?.dom?.controlsRow instanceof HTMLElement
            ? runtime.dom.controlsRow
            : null;
        const isMobile = window.innerWidth <= 1000;
        const filter = document.createElement('div'); {
            const searchRow = document.createElement('div');
            searchRow.classList.add('stwid--searchRow');
            const visibilityRow = document.createElement('div');
            visibilityRow.classList.add('stwid--visibilityRow');
            const sortingRow = runtime?.dom?.sortingRow instanceof HTMLElement
                ? runtime.dom.sortingRow
                : document.createElement('div');
            if (!sortingRow.classList.contains('stwid--sortingRow')) {
                sortingRow.classList.add('stwid--sortingRow');
            }
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
                    // Prune stale book keys from entry search cache (deleted/renamed books).
                    listPanelState.pruneEntrySearchCacheStaleBooks(Object.keys(runtime.cache));

                    const query = search.value.toLowerCase();
                    const searchEntries = listPanelState.searchEntriesInput.checked;
                    const shouldScanEntries = searchEntries && query.length >= 2;

                    for (const b of Object.keys(runtime.cache)) {
                        if (query.length) {
                            const bookMatch = b.toLowerCase().includes(query);
                            if (shouldScanEntries) {
                                if (bookMatch) {
                                    // Book name matches — no per-entry query needed; clear all entry filters.
                                    setQueryFiltered(runtime.cache[b].dom.root, false);
                                    for (const e of Object.values(runtime.cache[b].entries)) {
                                        setQueryFiltered(runtime.cache[b].dom.entry[e.uid]?.root, false);
                                    }
                                } else {
                                    // No book match — single-pass entry scan (eliminates .find() + full loop).
                                    let anyEntryMatch = false;
                                    for (const e of Object.values(runtime.cache[b].entries)) {
                                        const entryMatch = entryMatchesQuery(b, e, query);
                                        if (entryMatch) anyEntryMatch = true;
                                        setQueryFiltered(runtime.cache[b].dom.entry[e.uid]?.root, !entryMatch);
                                    }
                                    setQueryFiltered(runtime.cache[b].dom.root, !anyEntryMatch);
                                }
                            } else {
                                // Not scanning entries — book-level filter only; clear stale entry filters.
                                setQueryFiltered(runtime.cache[b].dom.root, !bookMatch);
                                for (const e of Object.values(runtime.cache[b].entries)) {
                                    setQueryFiltered(runtime.cache[b].dom.entry[e.uid]?.root, false);
                                }
                            }
                        } else {
                            setQueryFiltered(runtime.cache[b].dom.root, false);
                            for (const e of Object.values(runtime.cache[b].entries)) {
                                setQueryFiltered(runtime.cache[b].dom.entry[e.uid]?.root, false);
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
            const iconTab = document.createElement('div'); {
                iconTab.classList.add('stwid--iconTab');
                const iconTabBar = document.createElement('div');
                iconTabBar.classList.add('stwid--iconTabBar');
                iconTabBar.setAttribute('role', 'tablist');
                iconTabBar.setAttribute('aria-label', 'List panel tabs');
                const panelTabs = [
                    { id:'visibility', icon:'fa-eye', label:'Visibility' },
                    { id:'sorting', icon:'fa-arrow-down-wide-short', label:'Sorting' },
                    { id:'search', icon:'fa-magnifying-glass', label:'Search' },
                ];
                if (isMobile && controlsRowEl) {
                    panelTabs.unshift({ id:'controls', icon:'fa-sliders', label:'Controls' });
                }
                const tabButtons = [];
                const tabContents = [];
                const tabContentsById = new Map();
                const setActivePlaceholderTab = (tabId)=>{
                    for (const button of tabButtons) {
                        const isActive = button.dataset.tabId === tabId;
                        button.classList.toggle('active', isActive);
                        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
                    }
                    for (const content of tabContents) {
                        const isActive = content.dataset.tabId === tabId;
                        content.classList.toggle('active', isActive);
                    }
                };
                for (const tab of panelTabs) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.classList.add('stwid--iconTabButton');
                    button.dataset.tabId = tab.id;
                    button.setAttribute('role', 'tab');
                    button.setAttribute('aria-selected', 'false');
                    button.title = `${tab.label} tab`;
                    const icon = document.createElement('i');
                    icon.classList.add('fa-solid', 'fa-fw', tab.icon);
                    button.append(icon);
                    const text = document.createElement('span');
                    text.textContent = tab.label;
                    button.append(text);
                    tabButtons.push(button);
                    iconTabBar.append(button);

                    const content = document.createElement('div');
                    content.classList.add('stwid--iconTabContent');
                    content.dataset.tabId = tab.id;
                    content.setAttribute('role', 'tabpanel');
                    tabContents.push(content);
                    tabContentsById.set(tab.id, content);
                    iconTab.append(content);

                    button.addEventListener('click', ()=>setActivePlaceholderTab(tab.id));
                }
                if (isMobile && controlsRowEl) {
                    const controlsTabContent = tabContentsById.get('controls');
                    if (controlsTabContent) {
                        const originalParent = controlsRowEl.parentElement;
                        controlsTabContent.append(controlsRowEl);
                        if (originalParent) {
                            originalParent.style.display = 'none';
                        }
                    }
                }
                const visibilityTabContent = tabContentsById.get('visibility');
                if (visibilityTabContent) {
                    visibilityTabContent.append(visibilityRow);
                }
                const sortingTabContent = tabContentsById.get('sorting');
                if (sortingTabContent) {
                    sortingTabContent.append(sortingRow);
                }
                const searchTabContent = tabContentsById.get('search');
                if (searchTabContent) {
                    searchTabContent.append(searchRow);
                }
                iconTab.prepend(iconTabBar);
                const defaultTabId = (isMobile && controlsRowEl) ? 'controls' : (panelTabs[0]?.id ?? 'visibility');
                setActivePlaceholderTab(defaultTabId);
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
                listPanelState.bookVisibilityMenu.classList.remove('stwid--state-active');
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
                        option.classList.toggle('stwid--state-active', isActive);
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
            {
                const helperContainer = document.createElement('div');
                helperContainer.classList.add('stwid--thinContainer', 'stwid--visibilityHelper');
                const helperContainerLabel = document.createElement('span');
                helperContainerLabel.classList.add('stwid--thinContainerLabel');
                helperContainerLabel.textContent = 'Helper';
                const helperContainerHint = document.createElement('i');
                helperContainerHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
                helperContainerHint.title = 'Open Entry Manager for the books currently shown by Visibility filters.';
                helperContainerLabel.append(helperContainerHint);
                helperContainer.append(helperContainerLabel);

                const visibilityContainer = document.createElement('div');
                visibilityContainer.classList.add('stwid--thinContainer', 'stwid--visibilityFilters');
                const visibilityContainerLabel = document.createElement('span');
                visibilityContainerLabel.classList.add('stwid--thinContainerLabel');
                visibilityContainerLabel.textContent = 'Visibility';
                const visibilityContainerHint = document.createElement('i');
                visibilityContainerHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
                visibilityContainerHint.title = 'Pick which sources are visible and review the active filter chips.';
                visibilityContainerLabel.append(visibilityContainerHint);
                visibilityContainer.append(visibilityContainerLabel);

                const menuWrap = document.createElement('div');
                menuWrap.classList.add('stwid--multiselectDropdownWrap');

                const trigger = document.createElement('button');
                trigger.type = 'button';
                trigger.classList.add('menu_button', 'stwid--multiselectDropdownButton');
                trigger.title = 'Select which book sources are visible in the list and Entry Manager.';
                trigger.setAttribute('aria-label', 'Visibility filters');
                trigger.setAttribute('aria-expanded', 'false');
                trigger.setAttribute('aria-haspopup', 'true');
                const triggerIcon = document.createElement('i');
                triggerIcon.classList.add('fa-solid', 'fa-fw', 'fa-eye');
                trigger.append(triggerIcon);
                menuWrap.append(trigger);

                const menu = document.createElement('div');
                menu.classList.add('stwid--multiselectDropdownMenu', 'stwid--bookVisibilityMenu', 'stwid--small-multiselect', 'stwid--menu');
                listPanelState.bookVisibilityMenu = menu;

                for (const option of BOOK_VISIBILITY_OPTIONS) {
                    const optionTooltip = BOOK_VISIBILITY_OPTION_TOOLTIPS[option.mode] ?? option.label;
                    const optionButton = document.createElement('button');
                    optionButton.type = 'button';
                    optionButton.classList.add('stwid--multiselectDropdownOption', 'stwid--menuItem');
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
                    const shouldOpen = !menu.classList.contains('stwid--state-active');
                    closeBookVisibilityMenu();
                    if (shouldOpen) {
                        closeOpenMultiselectDropdownMenus(menu);
                        menu.classList.add('stwid--state-active');
                        trigger.setAttribute('aria-expanded', 'true');
                    }
                });
                const chips = document.createElement('div');
                chips.classList.add('stwid--visibilityChips');
                listPanelState.bookVisibilityChips = chips;
                const orderHelperToggle = runtime?.dom?.order?.toggle;
                if (orderHelperToggle instanceof HTMLElement) {
                    helperContainer.append(orderHelperToggle);
                }
                visibilityContainer.append(menuWrap, chips);
                visibilityRow.append(helperContainer, visibilityContainer);

                const onDocClickCloseMenu = (evt)=>{
                    if (!menu.classList.contains('stwid--state-active')) return;
                    const target = evt.target instanceof HTMLElement ? evt.target : null;
                    if (target?.closest('.stwid--visibilityRow')) return;
                    closeBookVisibilityMenu();
                };
                docClickHandler = onDocClickCloseMenu;
                document.addEventListener('click', onDocClickCloseMenu);
            }
            filter.append(iconTab);
            applyActiveFilter();
            list.append(filter);
        }
    };

    return {
        cleanup: ()=>{
            if (docClickHandler) {
                document.removeEventListener('click', docClickHandler);
                docClickHandler = null;
            }
        },
        getBookVisibilityScope,
        setupFilter,
    };
};

export {
    BOOK_VISIBILITY_MODES,
    createFilterBarSlice,
};
