import { createSearchRow, mountSearchTabContent } from './browser-tabs.search-tab.js';
import {
  BOOK_VISIBILITY_MODES,
  createVisibilitySlice,
  mountVisibilityTabContent,
} from './browser-tabs.visibility-tab.js';
import { mountSortingTabContent } from './browser-tabs.sorting-tab.js';
import { Settings } from '../../shared/settings.js';
import {
  closeOpenMultiselectDropdownMenus,
  setMultiselectDropdownOptionCheckboxState,
} from '../../shared/multiselect-dropdown.js';

const CSS_VISIBILITY_CHIP = 'stwid--visibility-chip';
const TAB_IDS = Object.freeze({
  LOREBOOKS: 'lorebooks',
  VISIBILITY: 'visibility',
  SORTING: 'sorting',
  SEARCH: 'search',
});
const KNOWN_TAB_IDS = Object.freeze(Object.values(TAB_IDS));

const ensureValidBookVisibilityMode = (listPanelState) => {
  if (!Object.values(BOOK_VISIBILITY_MODES).includes(listPanelState.bookVisibilityMode)) {
    listPanelState.bookVisibilityMode = BOOK_VISIBILITY_MODES.ALL_BOOKS;
  }
};

const createTabButton = ({ tab, onClick }) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('stwid--icon-tab__button');
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

  button.addEventListener('click', () => onClick(tab.id));
  return button;
};

const createTabPanel = ({ tabId }) => {
  const content = document.createElement('div');
  content.classList.add('stwid--icon-tab__content');
  content.dataset.tabId = tabId;
  content.setAttribute('role', 'tabpanel');
  return content;
};

// The Lorebooks panel holds the Lorebooks group, then the Folders group, in one
// shared row: each builder returns its bare group, because a row per group
// would stack them instead of laying them side by side.
const mountLorebooksTabContent = ({ tabContentsById, lorebooksGroup, foldersGroup }) => {
  const tabContent = tabContentsById.get(TAB_IDS.LOREBOOKS);
  if (!tabContent) return;
  const row = document.createElement('div');
  row.classList.add('stwid--browser-row');
  for (const group of [lorebooksGroup, foldersGroup]) {
    if (group instanceof HTMLElement) {
      row.append(group);
    }
  }
  tabContent.append(row);
};

const mountRuntimeTabContent = ({
  tabContentsById,
  runtimeState,
  visibilityRow,
  sortingRow,
  searchRow,
}) => {
  mountLorebooksTabContent({
    tabContentsById,
    lorebooksGroup: runtimeState?.dom?.lorebooksGroup,
    foldersGroup: runtimeState?.dom?.folderControls?.group,
  });
  mountVisibilityTabContent({ tabContentsById, visibilityRow });
  mountSortingTabContent({ tabContentsById, sortingRow });
  mountSearchTabContent({ tabContentsById, searchRow });
};

const createIconTabStateController = ({
  tabButtons,
  tabContents,
  tabButtonsById,
  tabContentsById,
}) => {
  const setActivePlaceholderTab = (tabId) => {
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

  const applyTabHidden = (tabId, hidden) => {
    const button = tabButtonsById.get(tabId);
    const content = tabContentsById.get(tabId);
    if (button) {
      button.hidden = hidden;
    }
    if (content) {
      content.hidden = hidden;
    }
    // Invariant: whenever any tab is visible, some visible tab is active. The
    // check covers both directions of `hidden`, so hiding the active tab and
    // restoring tabs into an otherwise dead strip both end with content shown.
    // With every tab hidden, no visible button exists and the empty strip
    // stays faithful to the setting.
    const hasVisibleActiveTab = tabButtons.some(
      (tabButton) => !tabButton.hidden && tabButton.classList.contains('active'),
    );
    if (!hasVisibleActiveTab) {
      const firstVisibleButton = tabButtons.find((tabButton) => !tabButton.hidden);
      if (firstVisibleButton) {
        setActivePlaceholderTab(firstVisibleButton.dataset.tabId);
      }
    }
  };

  return { setActivePlaceholderTab, applyTabHidden };
};

const createIconTabElements = ({
  panelTabs,
  iconTabBar,
  iconTab,
  onClick,
  tabButtons,
  tabContents,
  tabButtonsById,
  tabContentsById,
}) => {
  for (const tab of panelTabs) {
    const button = createTabButton({ tab, onClick });
    tabButtons.push(button);
    tabButtonsById.set(tab.id, button);
    iconTabBar.append(button);

    const content = createTabPanel({ tabId: tab.id });
    tabContents.push(content);
    tabContentsById.set(tab.id, content);
    iconTab.append(content);
  }
};

const buildIconTabBar = (runtimeState, visibilityRow, sortingRow, searchRow) => {
  const iconTab = document.createElement('div');
  iconTab.classList.add('stwid--icon-tab');
  const iconTabBar = document.createElement('div');
  iconTabBar.classList.add('stwid--icon-tab__bar');
  iconTabBar.setAttribute('role', 'tablist');
  iconTabBar.setAttribute('aria-label', 'List panel tabs');
  const panelTabs = [
    { id: TAB_IDS.LOREBOOKS, icon: 'fa-book', label: 'Lorebooks' },
    { id: TAB_IDS.VISIBILITY, icon: 'fa-eye', label: 'Visibility' },
    { id: TAB_IDS.SORTING, icon: 'fa-arrow-down-wide-short', label: 'Sorting' },
    { id: TAB_IDS.SEARCH, icon: 'fa-magnifying-glass', label: 'Search' },
  ];
  const tabButtons = [];
  const tabButtonsById = new Map();
  const tabContents = [];
  const tabContentsById = new Map();
  const { setActivePlaceholderTab, applyTabHidden } = createIconTabStateController({
    tabButtons,
    tabContents,
    tabButtonsById,
    tabContentsById,
  });

  createIconTabElements({
    panelTabs,
    iconTabBar,
    iconTab,
    onClick: setActivePlaceholderTab,
    tabButtons,
    tabContents,
    tabButtonsById,
    tabContentsById,
  });

  mountRuntimeTabContent({
    tabContentsById,
    runtimeState,
    visibilityRow,
    sortingRow,
    searchRow,
  });
  iconTab.prepend(iconTabBar);
  const defaultTabId = panelTabs[0]?.id ?? TAB_IDS.LOREBOOKS;
  setActivePlaceholderTab(defaultTabId);
  for (const tabId of Settings.instance.hiddenTabs) {
    applyTabHidden(tabId, true);
  }
  return { iconTab, applyTabHidden };
};

const createDocumentClickSubscription = () => {
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
}) => {
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
  const setupFilter = (bookListContainer) => {
    const filter = document.createElement('div');
    {
      const { searchRow } = createSearchRow(listPanelState, runtime, updateFolderActiveToggles);
      const visibilityRow = document.createElement('div');
      visibilityRow.classList.add('stwid--browser-row');
      const sortingRow =
        runtime?.dom?.sortingRow instanceof HTMLElement
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

  const applyHiddenTabs = (hiddenTabIds = []) => {
    const hiddenTabs = Array.isArray(hiddenTabIds) ? hiddenTabIds : [];
    for (const tabId of KNOWN_TAB_IDS) {
      applyTabHidden?.(tabId, hiddenTabs.includes(tabId));
    }
  };

  return {
    cleanup: () => {
      documentClickSubscription.cleanup();
      applyTabHidden = null;
    },
    applyHiddenTabs,
    getBookVisibilityScope: (...args) => visibilitySlice.getBookVisibilityScope(...args),
    setEntryManagerToggleVisibility: (enabled) => {
      runtime?.dom?.setOrderToggleVisible?.(Boolean(enabled));
    },
    setupFilter,
  };
};

export { createFilterBarSlice };
