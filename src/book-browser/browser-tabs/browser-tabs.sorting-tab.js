import { Settings } from '../../shared/settings.js';
import { appendSortOptions, maybeYieldToEventLoop } from '../../shared/utils.js';

// Yield to the browser after this many books so re-sorting a large collection
// does not freeze the tab in one synchronous burst (PERF-W5-01).
const SORT_ALL_BATCH_SIZE = 5;

// Bumped on every re-sort request (global dropdown change or per-book toggle) so
// a newer request supersedes an older in-flight loop. This guarantees the final
// full pass uses the latest settings, rather than leaving early books sorted by
// an old setting and later books by a new one.
let sortAllGeneration = 0;

function createThinContainerLabel(labelText, hintTitle) {
  const thinContainerLabel = document.createElement('span');
  thinContainerLabel.classList.add('stwid--field-group__label');
  thinContainerLabel.textContent = labelText;

  const thinContainerHint = document.createElement('i');
  thinContainerHint.classList.add(
    'fa-solid',
    'fa-fw',
    'fa-circle-question',
    'stwid--field-group__label-hint',
  );
  thinContainerHint.title = hintTitle;
  thinContainerLabel.append(thinContainerHint);

  return thinContainerLabel;
}

async function sortAllCachedBooks(cache, getListPanelApi) {
  const myGeneration = ++sortAllGeneration;
  const listPanelApi = getListPanelApi();
  // Snapshot the names up front: the loop now yields, so cache could change
  // mid-pass; iterate the set as it was when the sort was requested.
  const bookNames = Object.keys(cache);
  for (let i = 0; i < bookNames.length; i++) {
    // A newer sort request has taken over — stop and let it do the full pass.
    if (myGeneration !== sortAllGeneration) return;
    const bookName = bookNames[i];
    if (!cache[bookName]) continue; // book removed during a yield
    listPanelApi.sortEntriesIfNeeded(bookName);
    await maybeYieldToEventLoop(i, SORT_ALL_BATCH_SIZE);
  }
}

function createGlobalSortingSection({ cache, getListPanelApi }) {
  const globalSortingWrapper = document.createElement('div');
  globalSortingWrapper.classList.add('stwid--field-group');
  globalSortingWrapper.append(
    createThinContainerLabel(
      'Global Sorting',
      'This menu sets the default sorting for all lorebooks. If Per-book Sorting is on, books with saved per-book sorting use that instead.',
    ),
  );

  const globalSortingGroup = document.createElement('div');
  globalSortingGroup.classList.add('stwid--global-sorting');

  const globalSortSelect = document.createElement('select');
  globalSortSelect.classList.add('text_pole', 'stwid--sort-select');
  globalSortSelect.title = 'Global entry sort for the book browser';
  globalSortSelect.setAttribute('aria-label', 'Global entry sort');
  globalSortSelect.addEventListener('change', () => {
    const value = JSON.parse(globalSortSelect.value);
    Settings.instance.sortLogic = value.sort;
    Settings.instance.sortDirection = value.direction;
    sortAllCachedBooks(cache, getListPanelApi);
    Settings.instance.save();
  });
  appendSortOptions(globalSortSelect, Settings.instance.sortLogic, Settings.instance.sortDirection);
  globalSortingGroup.append(globalSortSelect);
  globalSortingWrapper.append(globalSortingGroup);

  return globalSortingWrapper;
}

function createPerBookSortingSection({ cache, getListPanelApi }) {
  const perBookSortingWrapper = document.createElement('div');
  perBookSortingWrapper.classList.add('stwid--field-group');
  perBookSortingWrapper.append(
    createThinContainerLabel(
      'Per-book Sorting',
      'Turn this on to let each lorebook use its own sorting preference. Turn it off to make every lorebook follow Global Sorting.',
    ),
  );

  const perBookSortingGroup = document.createElement('div');
  perBookSortingGroup.classList.add('stwid--individual-sorting');

  const perBookButtons = document.createElement('div');
  perBookButtons.classList.add('stwid--per-book-sort-buttons');

  const bookSortToggle = document.createElement('button');
  bookSortToggle.type = 'button';
  bookSortToggle.classList.add('menu_button', 'stwid--book-sort-toggle');

  const toggleIcon = document.createElement('i');
  toggleIcon.classList.add('fa-solid', 'fa-fw');
  bookSortToggle.append(toggleIcon);

  const updateToggleState = () => {
    const enabled = Settings.instance.useBookSorts;
    bookSortToggle.classList.toggle('stwid--state-active', enabled);
    bookSortToggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    toggleIcon.classList.toggle('fa-toggle-on', enabled);
    toggleIcon.classList.toggle('fa-toggle-off', !enabled);
    const label = enabled ? 'Per-book sort: On' : 'Per-book sort: Off';
    bookSortToggle.title = label;
    bookSortToggle.setAttribute('aria-label', label);
  };
  updateToggleState();
  bookSortToggle.addEventListener('click', () => {
    Settings.instance.useBookSorts = !Settings.instance.useBookSorts;
    Settings.instance.save();
    updateToggleState();
    sortAllCachedBooks(cache, getListPanelApi);
  });

  const clearBookSorts = document.createElement('button');
  clearBookSorts.type = 'button';
  clearBookSorts.classList.add('menu_button', 'stwid--clear-book-sorts');

  const clearIcon = document.createElement('i');
  clearIcon.classList.add('fa-solid', 'fa-fw', 'fa-broom');
  clearBookSorts.append(clearIcon);

  clearBookSorts.title = 'Clear All Preferences';
  clearBookSorts.setAttribute('aria-label', 'Clear All Preferences');
  clearBookSorts.addEventListener('click', async () => {
    clearBookSorts.disabled = true;
    try {
      await getListPanelApi().clearBookSortPreferences();
    } finally {
      clearBookSorts.disabled = false;
    }
  });

  perBookButtons.append(bookSortToggle, clearBookSorts);
  perBookSortingGroup.append(perBookButtons);
  perBookSortingWrapper.append(perBookSortingGroup);

  return perBookSortingWrapper;
}

export const createSortingTabContent = ({ cache, getListPanelApi }) => {
  const sortingRow = document.createElement('div');
  sortingRow.classList.add('stwid--browser-row');

  const globalSortingSection = createGlobalSortingSection({
    cache,
    getListPanelApi,
  });
  const perBookSortingSection = createPerBookSortingSection({
    cache,
    getListPanelApi,
  });

  sortingRow.append(globalSortingSection, perBookSortingSection);
  return sortingRow;
};

export const mountSortingTabContent = ({ tabContentsById, sortingRow }) => {
  const sortingTabContent = tabContentsById.get('sorting');
  if (!sortingTabContent) return;
  sortingTabContent.append(sortingRow);
};
