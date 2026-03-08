const FILTER_QUERY_CLASS = 'stwid--filter-query';
const INPUT_EVENT = 'input';

const setQueryFiltered = (targetElement, isFiltered)=>{
    if (!targetElement) return;
    if (isFiltered) {
        if (!targetElement.classList.contains(FILTER_QUERY_CLASS)) {
            targetElement.classList.add(FILTER_QUERY_CLASS);
        }
        return;
    }
    if (targetElement.classList.contains(FILTER_QUERY_CLASS)) {
        targetElement.classList.remove(FILTER_QUERY_CLASS);
    }
};

const buildEntrySearchSignature = (entry)=>{
    const comment = entry?.comment ?? '';
    const entryKeysCsv = Array.isArray(entry?.key) ? entry.key.join(', ') : '';
    return `${String(comment)}\n${String(entryKeysCsv)}`;
};

const getEntrySearchText = (listPanelState, bookName, entry)=>{
    if (!entry?.uid) return '';
    const signature = buildEntrySearchSignature(entry);
    listPanelState.ensureEntrySearchCacheBook(bookName);
    const cachedEntrySearch = listPanelState.getEntrySearchCacheValue(bookName, entry.uid);
    if (cachedEntrySearch?.signature === signature) return cachedEntrySearch.text;
    const text = signature.toLowerCase();
    listPanelState.setEntrySearchCacheValue(bookName, entry.uid, { signature, text });
    return text;
};

const applyBookBrowserSearchFilter = ({
    runtime,
    listPanelState,
    query,
    shouldScanEntries,
    setQueryFiltered,
    updateFolderActiveToggles,
})=>{
    const clearAllBookEntryFilters = (bookName)=>{
        for (const entry of Object.values(runtime.cache[bookName].entries)) {
            setQueryFiltered(runtime.cache[bookName].dom.entry[entry.uid]?.root, false);
        }
    };

    const entryMatchesQuery = (bookName, entry, normalizedQuery)=>
        getEntrySearchText(listPanelState, bookName, entry).includes(normalizedQuery);

    const applyEntrySearchToBook = (bookName, normalizedQuery, bookMatch)=>{
        if (bookMatch) {
            setQueryFiltered(runtime.cache[bookName].dom.root, false);
            clearAllBookEntryFilters(bookName);
            return;
        }

        let anyEntryMatch = false;
        for (const entry of Object.values(runtime.cache[bookName].entries)) {
            const entryMatch = entryMatchesQuery(bookName, entry, normalizedQuery);
            if (entryMatch) anyEntryMatch = true;
            setQueryFiltered(runtime.cache[bookName].dom.entry[entry.uid]?.root, !entryMatch);
        }
        setQueryFiltered(runtime.cache[bookName].dom.root, !anyEntryMatch);
    };

    listPanelState.pruneEntrySearchCacheStaleBooks(Object.keys(runtime.cache));

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

const buildSearchRow = (searchRow, listPanelState, runtime, updateFolderActiveToggles)=>{

    const search = document.createElement('input');
    search.classList.add('stwid--search');
    search.classList.add('text_pole');
    search.type = 'search';
    search.placeholder = 'Search books';
    search.title = 'Search books by name';
    search.setAttribute('aria-label', 'Search books');
    listPanelState.searchInput = search;

    const applySearchFilter = ()=>{
        const query = search.value.toLowerCase();
        const searchEntries = listPanelState.searchEntriesInput.checked;
        const shouldScanEntries = searchEntries && query.length >= 2;
        applyBookBrowserSearchFilter({
            runtime,
            listPanelState,
            query,
            shouldScanEntries,
            setQueryFiltered,
            updateFolderActiveToggles,
        });
    };

    const applySearchFilterDebounced = runtime.debounce(()=>applySearchFilter(), 125);

    search.addEventListener(INPUT_EVENT, ()=>{
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
        search.dispatchEvent(new Event(INPUT_EVENT));
    });
    searchEntriesLabel.append(searchEntriesCheckbox);
    searchEntriesLabel.append('Entries');
    searchRow.append(searchEntriesLabel);

    return { search, searchEntriesCheckbox };
};

export const createSearchRow = (listPanelState, runtime, updateFolderActiveToggles)=>{
    const searchRow = document.createElement('div');
    searchRow.classList.add('stwid--browserRow');
    const { search, searchEntriesCheckbox } = buildSearchRow(
        searchRow,
        listPanelState,
        runtime,
        updateFolderActiveToggles,
    );
    return { searchRow, search, searchEntriesCheckbox };
};

export const mountSearchTabContent = ({
    tabContentsById,
    searchRow,
})=>{
    const searchTabContent = tabContentsById.get('search');
    if (!searchTabContent) return;
    searchTabContent.append(searchRow);
};
