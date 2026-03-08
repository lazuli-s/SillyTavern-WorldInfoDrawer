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
const CSS_MULTISELECT_DROPDOWN_OPTION = 'stwid--multiselectDropdownOption';
const CSS_MULTISELECT_DROPDOWN_OPTION_CHECKBOX = 'stwid--multiselectDropdownOptionCheckbox';
const DEFAULT_CSS_VISIBILITY_CHIP = 'stwid--visibilityChip';

const normalizeBookSourceLinks = (links)=>({
    character: Boolean(links?.character),
    chat: Boolean(links?.chat),
    persona: Boolean(links?.persona),
});

const createVisibilityMenuButton = ()=>{
    const visibilityMenuButton = document.createElement('button');
    visibilityMenuButton.type = 'button';
    visibilityMenuButton.classList.add('menu_button', CSS_MULTISELECT_DROPDOWN_BUTTON);
    visibilityMenuButton.title = 'Select which book sources are visible in the list and Entry Manager.';
    visibilityMenuButton.setAttribute('aria-label', 'Visibility filters');
    visibilityMenuButton.setAttribute('aria-expanded', 'false');
    visibilityMenuButton.setAttribute('aria-haspopup', 'true');
    const triggerIcon = document.createElement('i');
    triggerIcon.classList.add('fa-solid', 'fa-fw', 'fa-eye');
    visibilityMenuButton.append(triggerIcon);
    return visibilityMenuButton;
};

const buildVisibilityMenuOptions = ({
    menuEl,
    applyActiveFilter,
    createBookVisibilityIcon,
    setAllBooksVisibility,
    setAllActiveVisibility,
    toggleVisibilitySelection,
    setMultiselectDropdownOptionCheckboxState,
})=>{
    for (const option of BOOK_VISIBILITY_OPTIONS) {
        const optionTooltip = BOOK_VISIBILITY_OPTION_TOOLTIPS[option.mode] ?? option.label;
        const optionButton = document.createElement('button');
        optionButton.type = 'button';
        optionButton.classList.add(CSS_MULTISELECT_DROPDOWN_OPTION, 'stwid--menuItem');
        optionButton.setAttribute('data-mode', option.mode);
        optionButton.setAttribute('aria-pressed', 'false');
        optionButton.title = optionTooltip;
        optionButton.setAttribute('aria-label', optionTooltip);
        if (option.mode !== BOOK_VISIBILITY_MODES.ALL_BOOKS && option.mode !== BOOK_VISIBILITY_MODES.ALL_ACTIVE) {
            const optionCheckbox = document.createElement('i');
            optionCheckbox.classList.add(
                'fa-solid',
                'fa-fw',
                CSS_MULTISELECT_DROPDOWN_OPTION_CHECKBOX,
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
        menuEl.append(optionButton);
    }
};

const createVisibilityMenuCloseHandlers = ({
    menuEl,
    closeBookVisibilityMenu,
    closeOpenMultiselectDropdownMenus,
    triggerButton,
})=>{
    const onVisibilityMenuButtonClick = (evt)=>{
        evt.preventDefault();
        evt.stopPropagation();
        const shouldOpen = !menuEl.classList.contains(CSS_STATE_ACTIVE);
        closeBookVisibilityMenu();
        if (shouldOpen) {
            closeOpenMultiselectDropdownMenus(menuEl);
            menuEl.classList.add(CSS_STATE_ACTIVE);
            triggerButton.setAttribute('aria-expanded', 'true');
        }
    };

    const onDocClickCloseMenu = (evt)=>{
        if (!menuEl.classList.contains(CSS_STATE_ACTIVE)) return;
        const target = evt.target instanceof HTMLElement ? evt.target : null;
        if (target?.closest('.stwid--browserRow')) return;
        closeBookVisibilityMenu();
    };

    return {
        onVisibilityMenuButtonClick,
        onDocClickCloseMenu,
    };
};

const createVisibilityScopeHelpers = ({
    listPanelState,
    runtime,
    getSelectedWorldInfo,
    isAllBooksVisibility,
    isAllActiveVisibility,
})=>{
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

    return {
        getBookVisibilityFlags,
        getBookVisibilityScope,
    };
};

const createVisibilityChipsRenderer = ({
    listPanelState,
    visibilityChipClass,
    createBookVisibilityIcon,
    getBookVisibilityOption,
    isAllBooksVisibility,
    isAllActiveVisibility,
})=>()=>{
    if (!listPanelState.bookVisibilityChips) return;
    listPanelState.bookVisibilityChips.innerHTML = '';
    const appendVisibilityChip = (option)=>{
        const visibilityChip = document.createElement('span');
        visibilityChip.classList.add(visibilityChipClass);
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

const syncVisibilityMenuOptionState = ({
    optionEl,
    isAllBooks,
    isAllActive,
    selections,
    setMultiselectDropdownOptionCheckboxState,
})=>{
    const optionMode = optionEl.getAttribute('data-mode');
    const isActive = optionMode === BOOK_VISIBILITY_MODES.ALL_BOOKS
        ? isAllBooks
        : optionMode === BOOK_VISIBILITY_MODES.ALL_ACTIVE
            ? isAllActive
            : selections.has(optionMode);
    optionEl.classList.toggle(CSS_STATE_ACTIVE, isActive);
    optionEl.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    const optionCheckbox = optionEl.querySelector(`.${CSS_MULTISELECT_DROPDOWN_OPTION_CHECKBOX}`);
    if (optionCheckbox) {
        setMultiselectDropdownOptionCheckboxState(optionCheckbox, isActive);
    }
};

const createApplyActiveFilter = ({
    listPanelState,
    runtime,
    getBookVisibilityScope,
    getSelectedWorldInfo,
    isAllBooksVisibility,
    isAllActiveVisibility,
    renderVisibilityChips,
    onBookVisibilityScopeChange,
    updateFolderActiveToggles,
    setMultiselectDropdownOptionCheckboxState,
})=>()=>{
    const visibleBookNames = getBookVisibilityScope(getSelectedWorldInfo());
    const visibleBookLookup = new Set(visibleBookNames);
    const isAllBooks = isAllBooksVisibility();
    const isAllActive = isAllActiveVisibility();
    for (const bookName of Object.keys(runtime.cache)) {
        const hideByVisibilityFilter = !visibleBookLookup.has(bookName);
        runtime.cache[bookName].dom.root.classList.toggle('stwid--filter-visibility', hideByVisibilityFilter);
    }
    if (listPanelState.bookVisibilityMenu) {
        for (const optionEl of listPanelState.bookVisibilityMenu.querySelectorAll(`.${CSS_MULTISELECT_DROPDOWN_OPTION}`)) {
            syncVisibilityMenuOptionState({
                optionEl,
                isAllBooks,
                isAllActive,
                selections: listPanelState.bookVisibilitySelections,
                setMultiselectDropdownOptionCheckboxState,
            });
        }
    }
    renderVisibilityChips();
    onBookVisibilityScopeChange?.(visibleBookNames);
    updateFolderActiveToggles();
};

const buildVisibilityDropdownSection = ({
    listPanelState,
    applyActiveFilter,
    closeBookVisibilityMenu,
    createBookVisibilityIcon,
    setAllBooksVisibility,
    setAllActiveVisibility,
    toggleVisibilitySelection,
    closeOpenMultiselectDropdownMenus,
    setMultiselectDropdownOptionCheckboxState,
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

    const visibilityMenuButton = createVisibilityMenuButton();
    visibilityDropdownContainer.append(visibilityMenuButton);

    const bookVisibilityMenuEl = document.createElement('div');
    bookVisibilityMenuEl.classList.add('stwid--multiselectDropdownMenu', 'stwid--bookVisibilityMenu', 'stwid--small-multiselect', 'stwid--menu');
    listPanelState.bookVisibilityMenu = bookVisibilityMenuEl;

    buildVisibilityMenuOptions({
        menuEl: bookVisibilityMenuEl,
        applyActiveFilter,
        createBookVisibilityIcon,
        setAllBooksVisibility,
        setAllActiveVisibility,
        toggleVisibilitySelection,
        setMultiselectDropdownOptionCheckboxState,
    });
    bookVisibilityMenuEl[MULTISELECT_DROPDOWN_CLOSE_HANDLER] = closeBookVisibilityMenu;
    visibilityDropdownContainer.append(bookVisibilityMenuEl);

    const { onVisibilityMenuButtonClick, onDocClickCloseMenu } = createVisibilityMenuCloseHandlers({
        menuEl: bookVisibilityMenuEl,
        closeBookVisibilityMenu,
        closeOpenMultiselectDropdownMenus,
        triggerButton: visibilityMenuButton,
    });
    visibilityMenuButton.addEventListener('click', onVisibilityMenuButtonClick);
    const chips = document.createElement('div');
    chips.classList.add('stwid--visibilityChips');
    listPanelState.bookVisibilityChips = chips;
    visibilityContainer.append(visibilityDropdownContainer, chips);

    return { visibilityContainer, onDocClickCloseMenu };
};

const createVisibilitySlice = ({
    listPanelState,
    runtime,
    updateFolderActiveToggles,
    onBookVisibilityScopeChange,
    setApplyActiveFilter,
    closeOpenMultiselectDropdownMenus,
    setMultiselectDropdownOptionCheckboxState,
    visibilityChipClass = DEFAULT_CSS_VISIBILITY_CHIP,
})=>{
    const getSelectedWorldInfo = ()=>runtime.getSelectedWorldInfo ? runtime.getSelectedWorldInfo() : runtime.selected_world_info;
    const isVisibilityMode = (mode)=>listPanelState.bookVisibilityMode === mode;
    const isAllBooksVisibility = ()=>isVisibilityMode(BOOK_VISIBILITY_MODES.ALL_BOOKS);
    const isAllActiveVisibility = ()=>isVisibilityMode(BOOK_VISIBILITY_MODES.ALL_ACTIVE);
    const { getBookVisibilityScope } = createVisibilityScopeHelpers({
        listPanelState,
        runtime,
        getSelectedWorldInfo,
        isAllBooksVisibility,
        isAllActiveVisibility,
    });

    const getBookVisibilityOption = (mode)=>
        BOOK_VISIBILITY_OPTIONS.find((option)=>option.mode === mode) ?? BOOK_VISIBILITY_OPTIONS[0];

    const setVisibilityMode = (mode)=>{
        listPanelState.bookVisibilityMode = mode;
        listPanelState.bookVisibilitySelections.clear();
    };

    const setAllBooksVisibility = ()=>{
        setVisibilityMode(BOOK_VISIBILITY_MODES.ALL_BOOKS);
    };

    const setAllActiveVisibility = ()=>{
        setVisibilityMode(BOOK_VISIBILITY_MODES.ALL_ACTIVE);
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

    const renderVisibilityChips = createVisibilityChipsRenderer({
        listPanelState,
        visibilityChipClass,
        createBookVisibilityIcon,
        getBookVisibilityOption,
        isAllBooksVisibility,
        isAllActiveVisibility,
    });

    const closeBookVisibilityMenu = ()=>{
        if (!listPanelState.bookVisibilityMenu) return;
        listPanelState.bookVisibilityMenu.classList.remove(CSS_STATE_ACTIVE);
        const visibilityMenuButton = listPanelState.bookVisibilityMenu.parentElement?.querySelector(`.${CSS_MULTISELECT_DROPDOWN_BUTTON}`);
        visibilityMenuButton?.setAttribute('aria-expanded', 'false');
    };

    const applyActiveFilter = createApplyActiveFilter({
        listPanelState,
        runtime,
        getBookVisibilityScope,
        getSelectedWorldInfo,
        isAllBooksVisibility,
        isAllActiveVisibility,
        renderVisibilityChips,
        onBookVisibilityScopeChange,
        updateFolderActiveToggles,
        setMultiselectDropdownOptionCheckboxState,
    });
    setApplyActiveFilter(applyActiveFilter);

    const setupVisibilitySection = (visibilityRow)=>{
        const { visibilityContainer, onDocClickCloseMenu } = buildVisibilityDropdownSection({
            listPanelState,
            applyActiveFilter,
            closeBookVisibilityMenu,
            createBookVisibilityIcon,
            setAllBooksVisibility,
            setAllActiveVisibility,
            toggleVisibilitySelection,
            closeOpenMultiselectDropdownMenus,
            setMultiselectDropdownOptionCheckboxState,
        });
        visibilityRow.append(visibilityContainer);
        return onDocClickCloseMenu;
    };

    return {
        getBookVisibilityScope,
        setupVisibilitySection,
    };
};

export const mountVisibilityTabContent = ({
    tabContentsById,
    visibilityRow,
})=>{
    const visibilityTabContent = tabContentsById.get('visibility');
    if (!visibilityTabContent) return;
    visibilityTabContent.append(visibilityRow);
};

export {
    BOOK_VISIBILITY_MODES,
    createVisibilitySlice,
};
