export const buildSearchRow = (searchRow, listPanelState, runtime, updateFolderActiveToggles)=>{
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

export const mountSearchTabContent = ({
    tabContentsById,
    searchRow,
})=>{
    const searchTabContent = tabContentsById.get('search');
    if (!searchTabContent) return;
    searchTabContent.append(searchRow);
};
