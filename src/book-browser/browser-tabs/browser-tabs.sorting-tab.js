import { Settings } from '../../shared/settings.js';
import { appendSortOptions } from '../../shared/utils.js';

function createThinContainerLabel(labelText, hintTitle) {
    const thinContainerLabel = document.createElement('span');
    thinContainerLabel.classList.add('stwid--thinContainerLabel');
    thinContainerLabel.textContent = labelText;

    const thinContainerHint = document.createElement('i');
    thinContainerHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
    thinContainerHint.title = hintTitle;
    thinContainerLabel.append(thinContainerHint);

    return thinContainerLabel;
}

function sortAllCachedBooks(cache, getListPanelApi) {
    const listPanelApi = getListPanelApi();
    for (const bookName of Object.keys(cache)) {
        listPanelApi.sortEntriesIfNeeded(bookName);
    }
}

function createGlobalSortingSection({
    cache,
    getListPanelApi,
}) {
    const globalSortingWrapper = document.createElement('div');
    globalSortingWrapper.classList.add('stwid--thinContainer');
    globalSortingWrapper.append(createThinContainerLabel(
        'Global Sorting',
        'This menu sets the default sorting for all lorebooks. If Per-book Sorting is on, books with saved per-book sorting use that instead.',
    ));

    const globalSortingGroup = document.createElement('div');
    globalSortingGroup.classList.add('stwid--globalSorting');

    const globalSortSelect = document.createElement('select');
    globalSortSelect.classList.add('text_pole', 'stwid--smallSelectTextPole');
    globalSortSelect.title = 'Global entry sort for the book browser';
    globalSortSelect.setAttribute('aria-label', 'Global entry sort');
    globalSortSelect.addEventListener('change', ()=>{
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

function createPerBookSortingSection({
    cache,
    getListPanelApi,
}) {
    const perBookSortingWrapper = document.createElement('div');
    perBookSortingWrapper.classList.add('stwid--thinContainer');
    perBookSortingWrapper.append(createThinContainerLabel(
        'Per-book Sorting',
        'Turn this on to let each lorebook use its own sorting preference. Turn it off to make every lorebook follow Global Sorting.',
    ));

    const perBookSortingGroup = document.createElement('div');
    perBookSortingGroup.classList.add('stwid--individualSorting');

    const perBookButtons = document.createElement('div');
    perBookButtons.classList.add('stwid--perBookSortButtons');

    const bookSortToggle = document.createElement('button');
    bookSortToggle.type = 'button';
    bookSortToggle.classList.add('menu_button', 'stwid--bookSortToggle');

    const toggleIcon = document.createElement('i');
    toggleIcon.classList.add('fa-solid', 'fa-fw');
    bookSortToggle.append(toggleIcon);

    const updateToggleState = ()=>{
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
    bookSortToggle.addEventListener('click', ()=>{
        Settings.instance.useBookSorts = !Settings.instance.useBookSorts;
        Settings.instance.save();
        updateToggleState();
        sortAllCachedBooks(cache, getListPanelApi);
    });

    const clearBookSorts = document.createElement('button');
    clearBookSorts.type = 'button';
    clearBookSorts.classList.add('menu_button', 'stwid--clearBookSorts');

    const clearIcon = document.createElement('i');
    clearIcon.classList.add('fa-solid', 'fa-fw', 'fa-broom');
    clearBookSorts.append(clearIcon);

    clearBookSorts.title = 'Clear All Preferences';
    clearBookSorts.setAttribute('aria-label', 'Clear All Preferences');
    clearBookSorts.addEventListener('click', async()=>{
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

export const createSortingTabContent = ({
    cache,
    getListPanelApi,
})=>{
    const sortingRow = document.createElement('div');
    sortingRow.classList.add('stwid--browserRow');

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

export const mountSortingTabContent = ({
    tabContentsById,
    sortingRow,
})=>{
    const sortingTabContent = tabContentsById.get('sorting');
    if (!sortingTabContent) return;
    sortingTabContent.append(sortingRow);
};
