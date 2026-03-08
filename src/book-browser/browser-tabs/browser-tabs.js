import { createSearchRow, mountSearchTabContent } from './browser-tabs.search-tab.js';
import {
    BOOK_VISIBILITY_MODES,
    createVisibilitySlice,
    mountVisibilityTabContent,
} from './browser-tabs.visibility-tab.js';
import { mountSortingTabContent } from './browser-tabs.sorting-tab.js';
import { Settings } from '../../shared/settings.js';

const MULTISELECT_DROPDOWN_CLOSE_HANDLER = 'stwidCloseMultiselectDropdownMenu';
const CSS_STATE_ACTIVE = 'stwid--state-active';
const CSS_MULTISELECT_DROPDOWN_BUTTON = 'stwid--multiselectDropdownButton';
const CSS_VISIBILITY_CHIP = 'stwid--visibilityChip';
const TAB_IDS = Object.freeze({
    SETTINGS: 'settings',
    LOREBOOKS: 'lorebooks',
    FOLDERS: 'folders',
    VISIBILITY: 'visibility',
    SORTING: 'sorting',
    SEARCH: 'search',
});
const KNOWN_TAB_IDS = Object.freeze(Object.values(TAB_IDS));

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

const ensureValidBookVisibilityMode = (listPanelState)=>{
    if (!Object.values(BOOK_VISIBILITY_MODES).includes(listPanelState.bookVisibilityMode)) {
        listPanelState.bookVisibilityMode = BOOK_VISIBILITY_MODES.ALL_BOOKS;
    }
};

const createTabButton = ({ tab, onClick })=>{
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

    button.addEventListener('click', ()=>onClick(tab.id));
    return button;
};

const createTabPanel = ({ tabId })=>{
    const content = document.createElement('div');
    content.classList.add('stwid--iconTabContent');
    content.dataset.tabId = tabId;
    content.setAttribute('role', 'tabpanel');
    return content;
};

const appendRuntimeTabContent = (tabContentsById, tabId, runtimeDomNode)=>{
    const tabContent = tabContentsById.get(tabId);
    if (tabContent && runtimeDomNode instanceof HTMLElement) {
        tabContent.append(runtimeDomNode);
    }
};

const mountRuntimeTabContent = ({
    tabContentsById,
    runtimeState,
    visibilityRow,
    sortingRow,
    searchRow,
})=>{
    appendRuntimeTabContent(tabContentsById, TAB_IDS.LOREBOOKS, runtimeState?.dom?.lorebooksTabContent);
    appendRuntimeTabContent(tabContentsById, TAB_IDS.FOLDERS, runtimeState?.dom?.foldersTabContent);
    appendRuntimeTabContent(tabContentsById, TAB_IDS.SETTINGS, runtimeState?.dom?.settingsTabContent);
    mountVisibilityTabContent({ tabContentsById, visibilityRow });
    mountSortingTabContent({ tabContentsById, sortingRow });
    mountSearchTabContent({ tabContentsById, searchRow });
};

const buildIconTabBar = (runtimeState, visibilityRow, sortingRow, searchRow)=>{
    const iconTab = document.createElement('div');
    iconTab.classList.add('stwid--iconTab');
    const iconTabBar = document.createElement('div');
    iconTabBar.classList.add('stwid--iconTabBar');
    iconTabBar.setAttribute('role', 'tablist');
    iconTabBar.setAttribute('aria-label', 'List panel tabs');
    const panelTabs = [
        { id: TAB_IDS.SETTINGS, icon: 'fa-cog', label: 'Settings' },
        { id: TAB_IDS.LOREBOOKS, icon: 'fa-book', label: 'Lorebooks' },
        { id: TAB_IDS.FOLDERS, icon: 'fa-folder', label: 'Folders' },
        { id: TAB_IDS.VISIBILITY, icon: 'fa-eye', label: 'Visibility' },
        { id: TAB_IDS.SORTING, icon: 'fa-arrow-down-wide-short', label: 'Sorting' },
        { id: TAB_IDS.SEARCH, icon: 'fa-magnifying-glass', label: 'Search' },
    ];
    const tabButtons = [];
    const tabButtonsById = new Map();
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
        const button = createTabButton({ tab, onClick: setActivePlaceholderTab });
        tabButtons.push(button);
        tabButtonsById.set(tab.id, button);
        iconTabBar.append(button);

        const content = createTabPanel({ tabId: tab.id });
        tabContents.push(content);
        tabContentsById.set(tab.id, content);
        iconTab.append(content);
    }

    const applyTabHidden = (tabId, hidden)=>{
        const button = tabButtonsById.get(tabId);
        const content = tabContentsById.get(tabId);
        if (button) {
            button.hidden = hidden;
        }
        if (content) {
            content.hidden = hidden;
        }
        if (hidden && button?.classList.contains('active')) {
            const firstVisibleButton = tabButtons.find((tabButton)=>!tabButton.hidden);
            if (firstVisibleButton) {
                setActivePlaceholderTab(firstVisibleButton.dataset.tabId);
            }
        }
    };

    mountRuntimeTabContent({
        tabContentsById,
        runtimeState,
        visibilityRow,
        sortingRow,
        searchRow,
    });
    iconTab.prepend(iconTabBar);
    const defaultTabId = panelTabs[0]?.id ?? TAB_IDS.SETTINGS;
    setActivePlaceholderTab(defaultTabId);
    for (const tabId of Settings.instance.hiddenTabs) {
        applyTabHidden(tabId, true);
    }
    return { iconTab, applyTabHidden };
};

const createDocumentClickSubscription = ()=>{
    let handler = null;

    return {
        set(nextHandler) {
            if (handler) {
                document.removeEventListener('click', handler);
            }
            handler = typeof nextHandler === 'function' ? nextHandler : null;
            if (handler) {
                document.addEventListener('click', handler);
            }
        },
        cleanup() {
            if (handler) {
                document.removeEventListener('click', handler);
                handler = null;
            }
        },
    };
};

const createFilterBarSlice = ({
    listPanelState,
    runtime,
    updateFolderActiveToggles,
    setApplyActiveFilter,
    onBookVisibilityScopeChange,
})=>{
    ensureValidBookVisibilityMode(listPanelState);
    const visibilitySlice = createVisibilitySlice({
        listPanelState,
        runtime,
        updateFolderActiveToggles,
        onBookVisibilityScopeChange,
        setApplyActiveFilter,
        closeOpenMultiselectDropdownMenus,
        setMultiselectDropdownOptionCheckboxState,
        visibilityChipClass: CSS_VISIBILITY_CHIP,
    });
    const documentClickSubscription = createDocumentClickSubscription();
    let applyTabHidden = null;
    const setupFilter = (bookListContainer)=>{
        const filter = document.createElement('div'); {
            const { searchRow } = createSearchRow(listPanelState, runtime, updateFolderActiveToggles);
            const visibilityRow = document.createElement('div');
            visibilityRow.classList.add('stwid--visibilityRow');
            const sortingRow = runtime?.dom?.sortingRow instanceof HTMLElement
                ? runtime.dom.sortingRow
                : document.createElement('div');
            if (!sortingRow.classList.contains('stwid--sortingRow')) {
                sortingRow.classList.add('stwid--sortingRow');
            }
            filter.classList.add('stwid--filter');
            const builtTabBar = buildIconTabBar(runtime, visibilityRow, sortingRow, searchRow);
            applyTabHidden = builtTabBar.applyTabHidden;
            const onDocClickCloseMenu = visibilitySlice.setupVisibilitySection(visibilityRow);
            documentClickSubscription.set(onDocClickCloseMenu);
            filter.append(builtTabBar.iconTab);
            runtime.applyActiveFilter?.();
            bookListContainer.append(filter);
        }
    };

    const applyHiddenTabs = (hiddenTabIds = [])=>{
        const hiddenTabs = Array.isArray(hiddenTabIds) ? hiddenTabIds : [];
        for (const tabId of KNOWN_TAB_IDS) {
            applyTabHidden?.(tabId, hiddenTabs.includes(tabId));
        }
    };

    return {
        cleanup: ()=>{
            documentClickSubscription.cleanup();
            applyTabHidden = null;
        },
        applyHiddenTabs,
        getBookVisibilityScope: (...args)=>visibilitySlice.getBookVisibilityScope(...args),
        setEntryManagerToggleVisibility: (enabled)=>{
            runtime?.dom?.setOrderToggleVisible?.(Boolean(enabled));
        },
        setupFilter,
    };
};

export {
    createFilterBarSlice,
};
