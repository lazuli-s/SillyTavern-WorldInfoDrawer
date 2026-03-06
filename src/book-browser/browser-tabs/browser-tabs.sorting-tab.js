import { Settings } from '../../shared/settings.js';
import { appendSortOptions } from '../../shared/utils.js';

export const createSortingTabContent = ({
    cache,
    getListPanelApi,
})=>{
    const sortingRow = document.createElement('div');
    sortingRow.classList.add('stwid--sortingRow');

    const globalSortingWrapper = document.createElement('div');
    globalSortingWrapper.classList.add('stwid--thinContainer');

    const globalSortingWrapperLabel = document.createElement('span');
    globalSortingWrapperLabel.classList.add('stwid--thinContainerLabel');
    globalSortingWrapperLabel.textContent = 'Global Sorting';

    const globalSortingWrapperHint = document.createElement('i');
    globalSortingWrapperHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
    globalSortingWrapperHint.title = 'This menu sets the default sorting for all lorebooks. If Per-book Sorting is on, books with saved per-book sorting use that instead.';
    globalSortingWrapperLabel.append(globalSortingWrapperHint);
    globalSortingWrapper.append(globalSortingWrapperLabel);

    const globalSortingGroup = document.createElement('div');
    globalSortingGroup.classList.add('stwid--globalSorting');

    const sortSel = document.createElement('select');
    sortSel.classList.add('text_pole', 'stwid--smallSelectTextPole');
    sortSel.title = 'Global entry sort for the book browser';
    sortSel.setAttribute('aria-label', 'Global entry sort');
    sortSel.addEventListener('change', ()=>{
        const value = JSON.parse(sortSel.value);
        Settings.instance.sortLogic = value.sort;
        Settings.instance.sortDirection = value.direction;
        const listPanelApi = getListPanelApi();
        for (const name of Object.keys(cache)) {
            listPanelApi.sortEntriesIfNeeded(name);
        }
        Settings.instance.save();
    });
    appendSortOptions(sortSel, Settings.instance.sortLogic, Settings.instance.sortDirection);
    globalSortingGroup.append(sortSel);
    globalSortingWrapper.append(globalSortingGroup);

    const perBookSortingWrapper = document.createElement('div');
    perBookSortingWrapper.classList.add('stwid--thinContainer');

    const perBookSortingWrapperLabel = document.createElement('span');
    perBookSortingWrapperLabel.classList.add('stwid--thinContainerLabel');
    perBookSortingWrapperLabel.textContent = 'Per-book Sorting';

    const perBookSortingWrapperHint = document.createElement('i');
    perBookSortingWrapperHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--thinContainerLabelHint');
    perBookSortingWrapperHint.title = 'Turn this on to let each lorebook use its own sorting preference. Turn it off to make every lorebook follow Global Sorting.';
    perBookSortingWrapperLabel.append(perBookSortingWrapperHint);
    perBookSortingWrapper.append(perBookSortingWrapperLabel);

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
        const listPanelApi = getListPanelApi();
        for (const name of Object.keys(cache)) {
            listPanelApi.sortEntriesIfNeeded(name);
        }
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

    sortingRow.append(globalSortingWrapper, perBookSortingWrapper);
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
