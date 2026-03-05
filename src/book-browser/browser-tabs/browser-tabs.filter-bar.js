import { mountVisibilityTabContent } from './browser-tabs.visibility-tab.js';
import { mountSortingTabContent } from './browser-tabs.sorting-tab.js';
import { mountSearchTabContent } from './browser-tabs.search-tab.js';

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
const CSS_STATE_ACTIVE = 'stwid--state-active';
const CSS_MULTISELECT_DROPDOWN_BUTTON = 'stwid--multiselectDropdownButton';
const CSS_VISIBILITY_CHIP = 'stwid--visibilityChip';

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
    for (const menu of document.querySelectorAll(`.stwid--multiselectDropdownMenu.${CSS_STATE_ACTIVE}`)) {
        if (menu === excludeMenu) continue;
        const closeMenu = menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
        if (typeof closeMenu === 'function') {
            closeMenu();
            continue;
        }
        menu.classList.remove(CSS_STATE_ACTIVE);
        const trigger = menu.parentElement?.querySelector(`.${CSS_MULTISELECT_DROPDOWN_BUTTON}`);
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
    let orderHelperToggleVisible = true;
    const isAllBooksVisibility = ()=>listPanelState.bookVisibilityMode === BOOK_VISIBILITY_MODES.ALL_BOOKS;
    const isAllActiveVisibility = ()=>listPanelState.bookVisibilityMode === BOOK_VISIBILITY_MODES.ALL_ACTIVE;
    const getSelectedWorldInfo = ()=>runtime.getSelectedWorldInfo ? runtime.getSelectedWorldInfo() : runtime.selected_world_info;
    const applyOrderHelperToggleVisibility = ()=>{
        const orderHelperToggle = runtime?.dom?.order?.toggle;
        if (!(orderHelperToggle instanceof HTMLElement)) return;
        orderHelperToggle.hidden = !orderHelperToggleVisible;
    };

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

    const buildSearchRow = (searchRow, listPanelState, runtime, updateFolderActiveToggles)=>{
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

        const clearAllBookEntryFilters = (bookName)=>{
            for (const entry of Object.values(runtime.cache[bookName].entries)) {
                setQueryFiltered(runtime.cache[bookName].dom.entry[entry.uid]?.root, false);
            }
        };

        const search = document.createElement('input');
        search.classList.add('stwid--search');
        search.classList.add('text_pole');
        search.type = 'search';
        search.placeholder = 'Search books';
        search.title = 'Search books by name';
        search.setAttribute('aria-label', 'Search books');
        listPanelState.searchInput = search;

        const entryMatchesQuery = (bookName, entry, normalizedQuery)=>getEntrySearchText(bookName, entry).includes(normalizedQuery);

        const applyEntrySearchToBook = (bookName, query, bookMatch)=>{
            if (bookMatch) {
                setQueryFiltered(runtime.cache[bookName].dom.root, false);
                clearAllBookEntryFilters(bookName);
                return;
            }

            let anyEntryMatch = false;
            for (const entry of Object.values(runtime.cache[bookName].entries)) {
                const entryMatch = entryMatchesQuery(bookName, entry, query);
                if (entryMatch) anyEntryMatch = true;
                setQueryFiltered(runtime.cache[bookName].dom.entry[entry.uid]?.root, !entryMatch);
            }
            setQueryFiltered(runtime.cache[bookName].dom.root, !anyEntryMatch);
        };

        const applySearchFilter = ()=>{
            listPanelState.pruneEntrySearchCacheStaleBooks(Object.keys(runtime.cache));

            const query = search.value.toLowerCase();
            const searchEntries = listPanelState.searchEntriesInput.checked;
            const shouldScanEntries = searchEntries && query.length >= 2;

            for (const bookName of Object.keys(runtime.cache)) {
                if (!query.length) {
                    setQueryFiltered(runtime.cache[bookName].dom.root, false);
                    clearAllBookEntryFilters(bookName);
                    continue;
                }

                const bookMatch = bookName.toLowerCase().includes(query);
                if (shouldScanEntries) {
                    applyEntrySearchToBook(bookName, query, bookMatch);
                    continue;
                }

                setQueryFiltered(runtime.cache[bookName].dom.root, !bookMatch);
                clearAllBookEntryFilters(bookName);
            }
            updateFolderActiveToggles();
        };

        const applySearchFilterDebounced = runtime.debounce(()=>applySearchFilter(), 125);

        search.addEventListener('input', ()=>{
            applySearchFilterDebounced();
        });
        searchRow.append(search);

        const searchEntriesLabel = document.createElement('label');
        searchEntriesLabel.classList.add('stwid--searchEntries');
        searchEntriesLabel.title = 'Search through entries as well (Title/Memo/Keys)';
        const searchEntriesCheckbox = document.createElement('input');
        listPanelState.searchEntriesInput = searchEntriesCheckbox;
        searchEntriesCheckbox.type = 'checkbox';
        searchEntriesCheckbox.addEventListener('click', ()=>{
            search.dispatchEvent(new Event('input'));
        });
        searchEntriesLabel.append(searchEntriesCheckbox);
        searchEntriesLabel.append('Entries');
        searchRow.append(searchEntriesLabel);

        return { search, searchEntriesCheckbox };
    };

    const buildIconTabBar = (runtime, visibilityRow, sortingRow, searchRow)=>{
        const iconTab = document.createElement('div');
        iconTab.classList.add('stwid--iconTab');
        const iconTabBar = document.createElement('div');
        iconTabBar.classList.add('stwid--iconTabBar');
        iconTabBar.setAttribute('role', 'tablist');
        iconTabBar.setAttribute('aria-label', 'List panel tabs');
        const panelTabs = [
            { id:'settings', icon:'fa-cog', label:'Settings' },
            { id:'lorebooks', icon:'fa-book', label:'Lorebooks' },
            { id:'folders', icon:'fa-folder', label:'Folders' },
            { id:'visibility', icon:'fa-eye', label:'Visibility' },
            { id:'sorting', icon:'fa-arrow-down-wide-short', label:'Sorting' },
            { id:'search', icon:'fa-magnifying-glass', label:'Search' },
        ];
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
        const lorebooksTabContent = tabContentsById.get('lorebooks');
        if (lorebooksTabContent && runtime?.dom?.lorebooksTabContent instanceof HTMLElement) {
            lorebooksTabContent.append(runtime.dom.lorebooksTabContent);
        }
        const foldersTabContent = tabContentsById.get('folders');
        if (foldersTabContent && runtime?.dom?.foldersTabContent instanceof HTMLElement) {
            foldersTabContent.append(runtime.dom.foldersTabContent);
        }
        const settingsTabContent = tabContentsById.get('settings');
        if (settingsTabContent && runtime?.dom?.settingsTabContent instanceof HTMLElement) {
            settingsTabContent.append(runtime.dom.settingsTabContent);
        }
        mountVisibilityTabContent({ tabContentsById, visibilityRow });
        mountSortingTabContent({ tabContentsById, sortingRow });
        mountSearchTabContent({ tabContentsById, searchRow });
        iconTab.prepend(iconTabBar);
        const defaultTabId = panelTabs[0]?.id ?? 'settings';
        setActivePlaceholderTab(defaultTabId);
        return iconTab;
    };

    const buildVisibilityDropdownSection = ({
        listPanelState,
        applyActiveFilter,
        closeBookVisibilityMenu,
        createBookVisibilityIcon,
        setAllBooksVisibility,
        setAllActiveVisibility,
        toggleVisibilitySelection,
    })=>{
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

        const visibilityDropdownContainer = document.createElement('div');
        visibilityDropdownContainer.classList.add('stwid--multiselectDropdownWrap');

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.classList.add('menu_button', CSS_MULTISELECT_DROPDOWN_BUTTON);
        trigger.title = 'Select which book sources are visible in the list and Entry Manager.';
        trigger.setAttribute('aria-label', 'Visibility filters');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-haspopup', 'true');
        const triggerIcon = document.createElement('i');
        triggerIcon.classList.add('fa-solid', 'fa-fw', 'fa-eye');
        trigger.append(triggerIcon);
        visibilityDropdownContainer.append(trigger);

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
        visibilityDropdownContainer.append(menu);

        trigger.addEventListener('click', (evt)=>{
            evt.preventDefault();
            evt.stopPropagation();
            const shouldOpen = !menu.classList.contains(CSS_STATE_ACTIVE);
            closeBookVisibilityMenu();
            if (shouldOpen) {
                closeOpenMultiselectDropdownMenus(menu);
                menu.classList.add(CSS_STATE_ACTIVE);
                trigger.setAttribute('aria-expanded', 'true');
            }
        });
        const chips = document.createElement('div');
        chips.classList.add('stwid--visibilityChips');
        listPanelState.bookVisibilityChips = chips;
        visibilityContainer.append(visibilityDropdownContainer, chips);

        const onDocClickCloseMenu = (evt)=>{
            if (!menu.classList.contains(CSS_STATE_ACTIVE)) return;
            const target = evt.target instanceof HTMLElement ? evt.target : null;
            if (target?.closest('.stwid--visibilityRow')) return;
            closeBookVisibilityMenu();
        };

        return { visibilityContainer, onDocClickCloseMenu };
    };

    let docClickHandler = null;
    const setupFilter = (bookListContainer)=>{
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
            filter.classList.add('stwid--filter');
            buildSearchRow(searchRow, listPanelState, runtime, updateFolderActiveToggles);
            const iconTab = buildIconTabBar(runtime, visibilityRow, sortingRow, searchRow);
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
                const appendVisibilityChip = (option)=>{
                    const visibilityChip = document.createElement('span');
                    visibilityChip.classList.add(CSS_VISIBILITY_CHIP);
                    visibilityChip.append(createBookVisibilityIcon(option, 'stwid--icon'));
                    const visibilityLabel = document.createElement('span');
                    visibilityLabel.textContent = option.label;
                    visibilityChip.append(visibilityLabel);
                    visibilityChip.title = `Active filter: ${option.label}.`;
                    visibilityChip.setAttribute('aria-label', `Active filter: ${option.label}.`);
                    listPanelState.bookVisibilityChips.append(visibilityChip);
                };
                if (isAllBooksVisibility()) {
                    appendVisibilityChip(getBookVisibilityOption(BOOK_VISIBILITY_MODES.ALL_BOOKS));
                } else if (isAllActiveVisibility()) {
                    appendVisibilityChip(getBookVisibilityOption(BOOK_VISIBILITY_MODES.ALL_ACTIVE));
                } else {
                    for (const mode of BOOK_VISIBILITY_MULTISELECT_MODES) {
                        if (!listPanelState.bookVisibilitySelections.has(mode)) continue;
                        appendVisibilityChip(getBookVisibilityOption(mode));
                    }
                }
            };

            const closeBookVisibilityMenu = ()=>{
                if (!listPanelState.bookVisibilityMenu) return;
                listPanelState.bookVisibilityMenu.classList.remove(CSS_STATE_ACTIVE);
                const trigger = listPanelState.bookVisibilityMenu.parentElement?.querySelector(`.${CSS_MULTISELECT_DROPDOWN_BUTTON}`);
                trigger?.setAttribute('aria-expanded', 'false');
            };

            const applyActiveFilter = ()=>{
                const visibleBookNames = getBookVisibilityScope(getSelectedWorldInfo());
                const visibleBookLookup = new Set(visibleBookNames);
                const isAllBooks = isAllBooksVisibility();
                const isAllActive = isAllActiveVisibility();
                for (const bookName of Object.keys(runtime.cache)) {
                    const hideByVisibilityFilter = !visibleBookLookup.has(bookName);
                    runtime.cache[bookName].dom.root.classList.toggle('stwid--filter-visibility', hideByVisibilityFilter);
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
                        option.classList.toggle(CSS_STATE_ACTIVE, isActive);
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
            const visibilitySection = buildVisibilityDropdownSection({
                listPanelState,
                applyActiveFilter,
                closeBookVisibilityMenu,
                createBookVisibilityIcon,
                setAllBooksVisibility,
                setAllActiveVisibility,
                toggleVisibilitySelection,
            });
            applyOrderHelperToggleVisibility();
            visibilityRow.append(visibilitySection.visibilityContainer);
            docClickHandler = visibilitySection.onDocClickCloseMenu;
            document.addEventListener('click', visibilitySection.onDocClickCloseMenu);
            filter.append(iconTab);
            applyActiveFilter();
            bookListContainer.append(filter);
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
        setOrderHelperToggleVisibility: (enabled)=>{
            orderHelperToggleVisible = Boolean(enabled);
            applyOrderHelperToggleVisibility();
        },
        setupFilter,
    };
};

export {
    BOOK_VISIBILITY_MODES,
    createFilterBarSlice,
};

