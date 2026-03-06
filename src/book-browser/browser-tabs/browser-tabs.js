import { createSearchRow, mountSearchTabContent } from './browser-tabs.search-tab.js';
import {
    BOOK_VISIBILITY_MODES,
    createVisibilitySlice,
    mountVisibilityTabContent,
} from './browser-tabs.visibility-tab.js';
import { mountSortingTabContent } from './browser-tabs.sorting-tab.js';

const MULTISELECT_DROPDOWN_CLOSE_HANDLER = 'stwidCloseMultiselectDropdownMenu';
const CSS_STATE_ACTIVE = 'stwid--state-active';
const CSS_MULTISELECT_DROPDOWN_BUTTON = 'stwid--multiselectDropdownButton';
const CSS_VISIBILITY_CHIP = 'stwid--visibilityChip';

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
    if (!Object.values(BOOK_VISIBILITY_MODES).includes(listPanelState.bookVisibilityMode)) {
        listPanelState.bookVisibilityMode = BOOK_VISIBILITY_MODES.ALL_BOOKS;
    }
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

    let docClickHandler = null;
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
            const iconTab = buildIconTabBar(runtime, visibilityRow, sortingRow, searchRow);
            const onDocClickCloseMenu = visibilitySlice.setupVisibilitySection(visibilityRow);
            docClickHandler = onDocClickCloseMenu;
            document.addEventListener('click', onDocClickCloseMenu);
            filter.append(iconTab);
            runtime.applyActiveFilter?.();
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
        getBookVisibilityScope: (...args)=>visibilitySlice.getBookVisibilityScope(...args),
        setOrderHelperToggleVisibility: (enabled)=>{
            runtime?.dom?.setOrderToggleVisible?.(Boolean(enabled));
        },
        setupFilter,
    };
};

export {
    createFilterBarSlice,
};
