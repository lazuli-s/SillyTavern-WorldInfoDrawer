const FILTER_DATASET_KEYS = {
    strategy: 'stwidFilterStrategy',
    position: 'stwidFilterPosition',
    recursion: 'stwidFilterRecursion',
    outlet: 'stwidFilterOutlet',
    automationId: 'stwidFilterAutomationId',
    group: 'stwidFilterGroup',
    script: 'stwidFilterScript',
};

const normalizeAllowedFilters = (filters, allowedValues)=>{
    const allowed = new Set(allowedValues);
    return filters.filter((value)=>allowed.has(value));
};

const createFilterNormalizers = ({
    getStrategyValues,
    getPositionValues,
    getOutletValues,
    getAutomationIdValues,
    getGroupValues,
})=>{
    const normalizeStrategyFilters = (filters)=>normalizeAllowedFilters(filters, getStrategyValues());
    const normalizePositionFilters = (filters)=>normalizeAllowedFilters(filters, getPositionValues());
    const normalizeOutletFilters = (filters)=>normalizeAllowedFilters(filters, getOutletValues());
    const normalizeAutomationIdFilters = (filters)=>normalizeAllowedFilters(filters, getAutomationIdValues());
    const normalizeGroupFilters = (filters)=>normalizeAllowedFilters(filters, getGroupValues());

    const normalizeGroupValuesForFilter = (groupValues)=>{
        if (Array.isArray(groupValues)) {
            if (!groupValues.length) return [''];
            return groupValues.map((value)=>String(value ?? '').trim());
        }
        if (groupValues == null) return [''];
        return [String(groupValues).trim()];
    };

    return {
        normalizeStrategyFilters,
        normalizePositionFilters,
        normalizeOutletFilters,
        normalizeAutomationIdFilters,
        normalizeGroupFilters,
        normalizeGroupValuesForFilter,
    };
};

const createRowFilterStateHelpers = ()=>{
    const updateEntryManagerRowFilterClass = (row)=>{
        if (!row) return;
        const strategyFiltered = row.dataset[FILTER_DATASET_KEYS.strategy] === 'true';
        const positionFiltered = row.dataset[FILTER_DATASET_KEYS.position] === 'true';
        const recursionFiltered = row.dataset[FILTER_DATASET_KEYS.recursion] === 'true';
        const outletFiltered = row.dataset[FILTER_DATASET_KEYS.outlet] === 'true';
        const automationIdFiltered = row.dataset[FILTER_DATASET_KEYS.automationId] === 'true';
        const groupFiltered = row.dataset[FILTER_DATASET_KEYS.group] === 'true';
        const scriptFiltered = row.dataset[FILTER_DATASET_KEYS.script] === 'true';
        row.classList.toggle(
            'stwid--state-filtered',
            strategyFiltered
                || positionFiltered
                || recursionFiltered
                || outletFiltered
                || automationIdFiltered
                || groupFiltered
                || scriptFiltered,
        );
    };

    const setEntryManagerRowFilterState = (row, datasetFlagKey, filtered)=>{
        if (!row) return;
        row.dataset[datasetFlagKey] = filtered ? 'true' : 'false';
        updateEntryManagerRowFilterClass(row);
    };

    return {
        setEntryManagerRowFilterState,
    };
};

const createRowFilterAppliers = ({
    entryManagerState,
    entryState,
    getStrategyValues,
    getPositionValues,
    getOutletValues,
    getOutletValue,
    getAutomationIdValues,
    getAutomationIdValue,
    getGroupValues,
    getGroupValue,
    normalizeGroupValuesForFilter,
    setEntryManagerRowFilterState,
})=>{
    const applySimpleSetFilterToRow = ({
        row,
        entryData,
        precomputed,
        valuesFromState,
        valuesFromSource,
        allowedFromState,
        datasetKey,
        getEntryValue,
    })=>{
        const values = precomputed?.values ?? (valuesFromState().length ? valuesFromState() : valuesFromSource());
        if (!values.length) {
            setEntryManagerRowFilterState(row, datasetKey, false);
            return;
        }

        const allowed = precomputed?.allowed ?? allowedFromState();
        const entryValue = getEntryValue(entryData);
        setEntryManagerRowFilterState(row, datasetKey, !allowed.has(entryValue));
    };

    const applyEntryManagerStrategyFilterToRow = (row, entryData, precomputed = null)=>{
        applySimpleSetFilterToRow({
            row,
            entryData,
            precomputed,
            valuesFromState: ()=>entryManagerState.strategyValues,
            valuesFromSource: getStrategyValues,
            allowedFromState: ()=>new Set(entryManagerState.filters.strategy ?? []),
            datasetKey: FILTER_DATASET_KEYS.strategy,
            getEntryValue: entryState,
        });
    };

    const applyEntryManagerPositionFilterToRow = (row, entryData, precomputed = null)=>{
        applySimpleSetFilterToRow({
            row,
            entryData,
            precomputed,
            valuesFromState: ()=>entryManagerState.positionValues,
            valuesFromSource: getPositionValues,
            allowedFromState: ()=>new Set((entryManagerState.filters.position ?? []).map((value)=>String(value))),
            datasetKey: FILTER_DATASET_KEYS.position,
            getEntryValue: (entry)=>String(entry.position ?? ''),
        });
    };

    const applyEntryManagerRecursionFilterToRow = (row, entryData, precomputed = null)=>{
        const recursionValues = precomputed?.values ?? (entryManagerState.recursionValues ?? []);
        if (!recursionValues.length) {
            setEntryManagerRowFilterState(row, FILTER_DATASET_KEYS.recursion, false);
            return;
        }
        const selectedRecursionFilters = precomputed?.selectedFilters ?? entryManagerState.filters.recursion ?? [];
        const allowed = precomputed?.allowed ?? new Set(selectedRecursionFilters);
        if (selectedRecursionFilters.length === recursionValues.length) {
            setEntryManagerRowFilterState(row, FILTER_DATASET_KEYS.recursion, false);
            return;
        }
        const hasDelayUntilRecursion = Number(entryData?.delayUntilRecursion) > 0;
        const entryFlags = [
            entryData?.excludeRecursion ? 'excludeRecursion' : null,
            entryData?.preventRecursion ? 'preventRecursion' : null,
            hasDelayUntilRecursion ? 'delayUntilRecursion' : null,
        ].filter(Boolean);
        const matches = entryFlags.some((flag)=>allowed.has(flag));
        setEntryManagerRowFilterState(row, FILTER_DATASET_KEYS.recursion, !matches);
    };

    const applyEntryManagerOutletFilterToRow = (row, entryData, precomputed = null)=>{
        applySimpleSetFilterToRow({
            row,
            entryData,
            precomputed,
            valuesFromState: ()=>entryManagerState.outletValues,
            valuesFromSource: getOutletValues,
            allowedFromState: ()=>new Set(entryManagerState.filters.outlet ?? []),
            datasetKey: FILTER_DATASET_KEYS.outlet,
            getEntryValue: getOutletValue,
        });
    };

    const applyEntryManagerAutomationIdFilterToRow = (row, entryData, precomputed = null)=>{
        applySimpleSetFilterToRow({
            row,
            entryData,
            precomputed,
            valuesFromState: ()=>entryManagerState.automationIdValues,
            valuesFromSource: getAutomationIdValues,
            allowedFromState: ()=>new Set(entryManagerState.filters.automationId ?? []),
            datasetKey: FILTER_DATASET_KEYS.automationId,
            getEntryValue: getAutomationIdValue,
        });
    };

    const applyEntryManagerGroupFilterToRow = (row, entryData, precomputed = null)=>{
        const getGroupMatchValue = (entry)=>normalizeGroupValuesForFilter(getGroupValue(entry));
        const values = precomputed?.values ?? (entryManagerState.groupValues.length ? entryManagerState.groupValues : getGroupValues());
        if (!values.length) {
            setEntryManagerRowFilterState(row, FILTER_DATASET_KEYS.group, false);
            return;
        }

        const allowed = precomputed?.allowed ?? new Set(entryManagerState.filters.group ?? []);
        const matches = getGroupMatchValue(entryData).some((value)=>allowed.has(value));
        setEntryManagerRowFilterState(row, FILTER_DATASET_KEYS.group, !matches);
    };

    return {
        applySimpleSetFilterToRow,
        applyEntryManagerStrategyFilterToRow,
        applyEntryManagerPositionFilterToRow,
        applyEntryManagerRecursionFilterToRow,
        applyEntryManagerOutletFilterToRow,
        applyEntryManagerAutomationIdFilterToRow,
        applyEntryManagerGroupFilterToRow,
    };
};

const createBookFilterAppliers = ({
    dom,
    entryManagerState,
    getEntryManagerEntries,
    getStrategyValues,
    getPositionValues,
    getOutletValues,
    getAutomationIdValues,
    getGroupValues,
    applyEntryManagerStrategyFilterToRow,
    applyEntryManagerPositionFilterToRow,
    applyEntryManagerRecursionFilterToRow,
    applyEntryManagerOutletFilterToRow,
    applyEntryManagerAutomationIdFilterToRow,
    applyEntryManagerGroupFilterToRow,
})=>{
    const forEachEntryRowInBook = (book, callback)=>{
        const entries = getEntryManagerEntries(book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            callback({ entry, row });
        }
    };

    const applyEntryManagerStrategyFilters = ()=>{
        const strategyValues = entryManagerState.strategyValues.length
            ? entryManagerState.strategyValues
            : getStrategyValues();
        const precomputed = {
            values: strategyValues,
            allowed: new Set(entryManagerState.filters.strategy ?? []),
        };
        forEachEntryRowInBook(entryManagerState.book, ({ entry, row })=>{
            applyEntryManagerStrategyFilterToRow(row, entry.data, precomputed);
        });
    };

    const applyEntryManagerPositionFilters = ()=>{
        const positionValues = entryManagerState.positionValues.length
            ? entryManagerState.positionValues
            : getPositionValues();
        const precomputed = {
            values: positionValues,
            allowed: new Set((entryManagerState.filters.position ?? []).map((value)=>String(value))),
        };
        forEachEntryRowInBook(entryManagerState.book, ({ entry, row })=>{
            applyEntryManagerPositionFilterToRow(row, entry.data, precomputed);
        });
    };

    const applyEntryManagerRecursionFilters = ()=>{
        const selectedFilters = entryManagerState.filters.recursion ?? [];
        const precomputed = {
            values: entryManagerState.recursionValues ?? [],
            selectedFilters,
            allowed: new Set(selectedFilters),
        };
        forEachEntryRowInBook(entryManagerState.book, ({ entry, row })=>{
            applyEntryManagerRecursionFilterToRow(row, entry.data, precomputed);
        });
    };

    const applyEntryManagerOutletFilters = ()=>{
        const outletValues = entryManagerState.outletValues.length
            ? entryManagerState.outletValues
            : getOutletValues();
        const precomputed = {
            values: outletValues,
            allowed: new Set(entryManagerState.filters.outlet ?? []),
        };
        forEachEntryRowInBook(entryManagerState.book, ({ entry, row })=>{
            applyEntryManagerOutletFilterToRow(row, entry.data, precomputed);
        });
    };

    const applyEntryManagerAutomationIdFilters = ()=>{
        const automationIdValues = entryManagerState.automationIdValues.length
            ? entryManagerState.automationIdValues
            : getAutomationIdValues();
        const precomputed = {
            values: automationIdValues,
            allowed: new Set(entryManagerState.filters.automationId ?? []),
        };
        forEachEntryRowInBook(entryManagerState.book, ({ entry, row })=>{
            applyEntryManagerAutomationIdFilterToRow(row, entry.data, precomputed);
        });
    };

    const applyEntryManagerGroupFilters = ()=>{
        const groupValues = entryManagerState.groupValues.length
            ? entryManagerState.groupValues
            : getGroupValues();
        const precomputed = {
            values: groupValues,
            allowed: new Set(entryManagerState.filters.group ?? []),
        };
        forEachEntryRowInBook(entryManagerState.book, ({ entry, row })=>{
            applyEntryManagerGroupFilterToRow(row, entry.data, precomputed);
        });
    };

    return {
        forEachEntryRowInBook,
        applyEntryManagerStrategyFilters,
        applyEntryManagerPositionFilters,
        applyEntryManagerRecursionFilters,
        applyEntryManagerOutletFilters,
        applyEntryManagerAutomationIdFilters,
        applyEntryManagerGroupFilters,
    };
};

const createFilterSyncHelpers = ({
    dom,
    entryManagerState,
    getEntryManagerEntries,
    getStrategyValues,
    getPositionValues,
    getOutletValues,
    getAutomationIdValues,
    getGroupValues,
    normalizeStrategyFilters,
    normalizePositionFilters,
    normalizeOutletFilters,
    normalizeAutomationIdFilters,
    normalizeGroupFilters,
    setEntryManagerRowFilterState,
})=>{
    const syncSelectableFilters = ({
        getNextValues,
        getPrevValues,
        getSelectedFilters,
        setNextValues,
        setSelectedFilters,
        normalizeSelectedFilters,
    })=>{
        const nextValues = getNextValues();
        const previousValues = getPrevValues();
        const selectedFilters = getSelectedFilters();
        const hadAllSelected = selectedFilters.length === previousValues.length;

        setNextValues(nextValues);
        if (!nextValues.length) {
            setSelectedFilters([]);
            return;
        }

        if (hadAllSelected || !selectedFilters.length) {
            setSelectedFilters([...nextValues]);
            return;
        }

        setSelectedFilters(normalizeSelectedFilters(selectedFilters));
    };

    const clearEntryManagerScriptFilters = ()=>{
        const entries = getEntryManagerEntries(entryManagerState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            setEntryManagerRowFilterState(row, FILTER_DATASET_KEYS.script, false);
        }
    };

    const syncEntryManagerStrategyFilters = ()=>{
        syncSelectableFilters({
            getNextValues: getStrategyValues,
            getPrevValues: ()=>entryManagerState.strategyValues,
            getSelectedFilters: ()=>entryManagerState.filters.strategy,
            setNextValues: (values)=>{
                entryManagerState.strategyValues = values;
            },
            setSelectedFilters: (filters)=>{
                entryManagerState.filters.strategy = filters;
            },
            normalizeSelectedFilters: normalizeStrategyFilters,
        });
    };

    const syncEntryManagerPositionFilters = ()=>{
        syncSelectableFilters({
            getNextValues: getPositionValues,
            getPrevValues: ()=>entryManagerState.positionValues,
            getSelectedFilters: ()=>entryManagerState.filters.position,
            setNextValues: (values)=>{
                entryManagerState.positionValues = values;
            },
            setSelectedFilters: (filters)=>{
                entryManagerState.filters.position = filters;
            },
            normalizeSelectedFilters: normalizePositionFilters,
        });
    };

    const syncEntryManagerOutletFilters = ()=>{
        syncSelectableFilters({
            getNextValues: getOutletValues,
            getPrevValues: ()=>entryManagerState.outletValues,
            getSelectedFilters: ()=>entryManagerState.filters.outlet,
            setNextValues: (values)=>{
                entryManagerState.outletValues = values;
            },
            setSelectedFilters: (filters)=>{
                entryManagerState.filters.outlet = filters;
            },
            normalizeSelectedFilters: normalizeOutletFilters,
        });
    };

    const syncEntryManagerAutomationIdFilters = ()=>{
        syncSelectableFilters({
            getNextValues: getAutomationIdValues,
            getPrevValues: ()=>entryManagerState.automationIdValues,
            getSelectedFilters: ()=>entryManagerState.filters.automationId,
            setNextValues: (values)=>{
                entryManagerState.automationIdValues = values;
            },
            setSelectedFilters: (filters)=>{
                entryManagerState.filters.automationId = filters;
            },
            normalizeSelectedFilters: normalizeAutomationIdFilters,
        });
    };

    const syncEntryManagerGroupFilters = ()=>{
        syncSelectableFilters({
            getNextValues: getGroupValues,
            getPrevValues: ()=>entryManagerState.groupValues,
            getSelectedFilters: ()=>entryManagerState.filters.group,
            setNextValues: (values)=>{
                entryManagerState.groupValues = values;
            },
            setSelectedFilters: (filters)=>{
                entryManagerState.filters.group = filters;
            },
            normalizeSelectedFilters: normalizeGroupFilters,
        });
    };

    return {
        clearEntryManagerScriptFilters,
        syncSelectableFilters,
        syncEntryManagerStrategyFilters,
        syncEntryManagerPositionFilters,
        syncEntryManagerOutletFilters,
        syncEntryManagerAutomationIdFilters,
        syncEntryManagerGroupFilters,
    };
};

const createEntryManagerFilters = ({
    dom,
    entryManagerState,
    entryState,
    getEntryManagerEntries,
    getStrategyValues,
    getPositionValues,
    getOutletValues,
    getOutletValue,
    getAutomationIdValues,
    getAutomationIdValue,
    getGroupValues,
    getGroupValue,
}) => {
    const {
        normalizeStrategyFilters,
        normalizePositionFilters,
        normalizeOutletFilters,
        normalizeAutomationIdFilters,
        normalizeGroupFilters,
        normalizeGroupValuesForFilter,
    } = createFilterNormalizers({
        getStrategyValues,
        getPositionValues,
        getOutletValues,
        getAutomationIdValues,
        getGroupValues,
    });

    const { setEntryManagerRowFilterState } = createRowFilterStateHelpers();

    const {
        applyEntryManagerStrategyFilterToRow,
        applyEntryManagerPositionFilterToRow,
        applyEntryManagerRecursionFilterToRow,
        applyEntryManagerOutletFilterToRow,
        applyEntryManagerAutomationIdFilterToRow,
        applyEntryManagerGroupFilterToRow,
    } = createRowFilterAppliers({
        entryManagerState,
        entryState,
        getStrategyValues,
        getPositionValues,
        getOutletValues,
        getOutletValue,
        getAutomationIdValues,
        getAutomationIdValue,
        getGroupValues,
        getGroupValue,
        normalizeGroupValuesForFilter,
        setEntryManagerRowFilterState,
    });

    const {
        applyEntryManagerStrategyFilters,
        applyEntryManagerPositionFilters,
        applyEntryManagerRecursionFilters,
        applyEntryManagerOutletFilters,
        applyEntryManagerAutomationIdFilters,
        applyEntryManagerGroupFilters,
    } = createBookFilterAppliers({
        dom,
        entryManagerState,
        getEntryManagerEntries,
        getStrategyValues,
        getPositionValues,
        getOutletValues,
        getAutomationIdValues,
        getGroupValues,
        applyEntryManagerStrategyFilterToRow,
        applyEntryManagerPositionFilterToRow,
        applyEntryManagerRecursionFilterToRow,
        applyEntryManagerOutletFilterToRow,
        applyEntryManagerAutomationIdFilterToRow,
        applyEntryManagerGroupFilterToRow,
    });

    const {
        clearEntryManagerScriptFilters,
        syncEntryManagerStrategyFilters,
        syncEntryManagerPositionFilters,
        syncEntryManagerOutletFilters,
        syncEntryManagerAutomationIdFilters,
        syncEntryManagerGroupFilters,
    } = createFilterSyncHelpers({
        dom,
        entryManagerState,
        getEntryManagerEntries,
        getStrategyValues,
        getPositionValues,
        getOutletValues,
        getAutomationIdValues,
        getGroupValues,
        normalizeStrategyFilters,
        normalizePositionFilters,
        normalizeOutletFilters,
        normalizeAutomationIdFilters,
        normalizeGroupFilters,
        setEntryManagerRowFilterState,
    });

    return {
        applyEntryManagerRecursionFilterToRow,
        applyEntryManagerRecursionFilters,
        applyEntryManagerPositionFilterToRow,
        applyEntryManagerPositionFilters,
        applyEntryManagerOutletFilterToRow,
        applyEntryManagerOutletFilters,
        applyEntryManagerAutomationIdFilterToRow,
        applyEntryManagerAutomationIdFilters,
        applyEntryManagerGroupFilterToRow,
        applyEntryManagerGroupFilters,
        applyEntryManagerStrategyFilterToRow,
        applyEntryManagerStrategyFilters,
        clearEntryManagerScriptFilters,
        normalizeOutletFilters,
        normalizeAutomationIdFilters,
        normalizeGroupFilters,
        normalizePositionFilters,
        normalizeStrategyFilters,
        setEntryManagerRowFilterState,
        syncEntryManagerOutletFilters,
        syncEntryManagerAutomationIdFilters,
        syncEntryManagerGroupFilters,
        syncEntryManagerPositionFilters,
        syncEntryManagerStrategyFilters,
    };
};

export { createEntryManagerFilters };
