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
    const normalizeStrategyFilters = (filters)=>{
        const allowed = new Set(getStrategyValues());
        return filters.filter((value)=>allowed.has(value));
    };

    const normalizePositionFilters = (filters)=>{
        const allowed = new Set(getPositionValues());
        return filters.filter((value)=>allowed.has(value));
    };

    const normalizeOutletFilters = (filters)=>{
        const allowed = new Set(getOutletValues());
        return filters.filter((value)=>allowed.has(value));
    };

    const normalizeAutomationIdFilters = (filters)=>{
        const allowed = new Set(getAutomationIdValues());
        return filters.filter((value)=>allowed.has(value));
    };

    const normalizeGroupFilters = (filters)=>{
        const allowed = new Set(getGroupValues());
        return filters.filter((value)=>allowed.has(value));
    };

    const normalizeGroupValuesForFilter = (groupValues)=>{
        if (Array.isArray(groupValues)) {
            if (!groupValues.length) return [''];
            return groupValues.map((value)=>String(value ?? '').trim());
        }
        if (groupValues == null) return [''];
        return [String(groupValues).trim()];
    };

    const updateEntryManagerRowFilterClass = (row)=>{
        if (!row) return;
        const strategyFiltered = row.dataset.stwidFilterStrategy === 'true';
        const positionFiltered = row.dataset.stwidFilterPosition === 'true';
        const recursionFiltered = row.dataset.stwidFilterRecursion === 'true';
        const outletFiltered = row.dataset.stwidFilterOutlet === 'true';
        const automationIdFiltered = row.dataset.stwidFilterAutomationId === 'true';
        const groupFiltered = row.dataset.stwidFilterGroup === 'true';
        const scriptFiltered = row.dataset.stwidFilterScript === 'true';
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

    const setEntryManagerRowFilterState = (row, key, filtered)=>{
        if (!row) return;
        row.dataset[key] = filtered ? 'true' : 'false';
        updateEntryManagerRowFilterClass(row);
    };

    const applyEntryManagerStrategyFilterToRow = (row, entryData, precomputed = null)=>{
        const strategyValues = precomputed?.values ?? (
            entryManagerState.strategyValues.length
                ? entryManagerState.strategyValues
                : getStrategyValues()
        );
        if (!strategyValues.length) {
            setEntryManagerRowFilterState(row, 'stwidFilterStrategy', false);
            return;
        }
        const allowed = precomputed?.allowed ?? new Set(entryManagerState.filters.strategy ?? []);
        const strategy = entryState(entryData);
        setEntryManagerRowFilterState(row, 'stwidFilterStrategy', !allowed.has(strategy));
    };

    const applyEntryManagerPositionFilterToRow = (row, entryData, precomputed = null)=>{
        const positionValues = precomputed?.values ?? (
            entryManagerState.positionValues.length
                ? entryManagerState.positionValues
                : getPositionValues()
        );
        if (!positionValues.length) {
            setEntryManagerRowFilterState(row, 'stwidFilterPosition', false);
            return;
        }
        const positionFilters = entryManagerState.filters.position ?? [];
        const allowed = precomputed?.allowed ?? new Set(positionFilters.map((value)=>String(value)));
        const position = entryData.position ?? '';
        setEntryManagerRowFilterState(row, 'stwidFilterPosition', !allowed.has(String(position)));
    };

    const applyEntryManagerRecursionFilterToRow = (row, entryData, precomputed = null)=>{
        const recursionValues = precomputed?.values ?? (entryManagerState.recursionValues ?? []);
        if (!recursionValues.length) {
            setEntryManagerRowFilterState(row, 'stwidFilterRecursion', false);
            return;
        }
        const selectedRecursionFilters = precomputed?.selectedFilters ?? entryManagerState.filters.recursion ?? [];
        const allowed = precomputed?.allowed ?? new Set(selectedRecursionFilters);
        if (selectedRecursionFilters.length === recursionValues.length) {
            setEntryManagerRowFilterState(row, 'stwidFilterRecursion', false);
            return;
        }
        const hasDelayUntilRecursion = Number(entryData?.delayUntilRecursion) > 0;
        const entryFlags = [
            entryData?.excludeRecursion ? 'excludeRecursion' : null,
            entryData?.preventRecursion ? 'preventRecursion' : null,
            hasDelayUntilRecursion ? 'delayUntilRecursion' : null,
        ].filter(Boolean);
        const matches = entryFlags.some((flag)=>allowed.has(flag));
        setEntryManagerRowFilterState(row, 'stwidFilterRecursion', !matches);
    };

    const applyEntryManagerOutletFilterToRow = (row, entryData, precomputed = null)=>{
        const outletValues = precomputed?.values ?? (
            entryManagerState.outletValues.length
                ? entryManagerState.outletValues
                : getOutletValues()
        );
        if (!outletValues.length) {
            setEntryManagerRowFilterState(row, 'stwidFilterOutlet', false);
            return;
        }
        const allowed = precomputed?.allowed ?? new Set(entryManagerState.filters.outlet ?? []);
        const outletValue = getOutletValue(entryData);
        setEntryManagerRowFilterState(row, 'stwidFilterOutlet', !allowed.has(outletValue));
    };

    const applyEntryManagerAutomationIdFilterToRow = (row, entryData, precomputed = null)=>{
        const automationIdValues = precomputed?.values ?? (
            entryManagerState.automationIdValues.length
                ? entryManagerState.automationIdValues
                : getAutomationIdValues()
        );
        if (!automationIdValues.length) {
            setEntryManagerRowFilterState(row, 'stwidFilterAutomationId', false);
            return;
        }
        const allowed = precomputed?.allowed ?? new Set(entryManagerState.filters.automationId ?? []);
        const automationId = getAutomationIdValue(entryData);
        setEntryManagerRowFilterState(row, 'stwidFilterAutomationId', !allowed.has(automationId));
    };

    const applyEntryManagerGroupFilterToRow = (row, entryData, precomputed = null)=>{
        const groupValues = precomputed?.values ?? (
            entryManagerState.groupValues.length
                ? entryManagerState.groupValues
                : getGroupValues()
        );
        if (!groupValues.length) {
            setEntryManagerRowFilterState(row, 'stwidFilterGroup', false);
            return;
        }
        const allowed = precomputed?.allowed ?? new Set(entryManagerState.filters.group ?? []);
        const groupValuesForEntry = normalizeGroupValuesForFilter(getGroupValue(entryData));
        const matches = groupValuesForEntry.some((value)=>allowed.has(value));
        setEntryManagerRowFilterState(row, 'stwidFilterGroup', !matches);
    };

    const applyEntryManagerStrategyFilters = ()=>{
        const entries = getEntryManagerEntries(entryManagerState.book, true);
        const strategyValues = entryManagerState.strategyValues.length
            ? entryManagerState.strategyValues
            : getStrategyValues();
        const allowed = new Set(entryManagerState.filters.strategy ?? []);
        const precomputed = { values: strategyValues, allowed };
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyEntryManagerStrategyFilterToRow(row, entry.data, precomputed);
        }
    };

    const applyEntryManagerPositionFilters = ()=>{
        const entries = getEntryManagerEntries(entryManagerState.book, true);
        const positionValues = entryManagerState.positionValues.length
            ? entryManagerState.positionValues
            : getPositionValues();
        const positionFilters = entryManagerState.filters.position ?? [];
        const allowed = new Set(positionFilters.map((value)=>String(value)));
        const precomputed = { values: positionValues, allowed };
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyEntryManagerPositionFilterToRow(row, entry.data, precomputed);
        }
    };

    const applyEntryManagerRecursionFilters = ()=>{
        const entries = getEntryManagerEntries(entryManagerState.book, true);
        const recursionValues = entryManagerState.recursionValues ?? [];
        const selectedFilters = entryManagerState.filters.recursion ?? [];
        const allowed = new Set(selectedFilters);
        const precomputed = {
            values: recursionValues,
            selectedFilters,
            allowed,
        };
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyEntryManagerRecursionFilterToRow(row, entry.data, precomputed);
        }
    };

    const applyEntryManagerOutletFilters = ()=>{
        const entries = getEntryManagerEntries(entryManagerState.book, true);
        const outletValues = entryManagerState.outletValues.length
            ? entryManagerState.outletValues
            : getOutletValues();
        const allowed = new Set(entryManagerState.filters.outlet ?? []);
        const precomputed = { values: outletValues, allowed };
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyEntryManagerOutletFilterToRow(row, entry.data, precomputed);
        }
    };

    const applyEntryManagerAutomationIdFilters = ()=>{
        const entries = getEntryManagerEntries(entryManagerState.book, true);
        const automationIdValues = entryManagerState.automationIdValues.length
            ? entryManagerState.automationIdValues
            : getAutomationIdValues();
        const allowed = new Set(entryManagerState.filters.automationId ?? []);
        const precomputed = { values: automationIdValues, allowed };
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyEntryManagerAutomationIdFilterToRow(row, entry.data, precomputed);
        }
    };

    const applyEntryManagerGroupFilters = ()=>{
        const entries = getEntryManagerEntries(entryManagerState.book, true);
        const groupValues = entryManagerState.groupValues.length
            ? entryManagerState.groupValues
            : getGroupValues();
        const allowed = new Set(entryManagerState.filters.group ?? []);
        const precomputed = { values: groupValues, allowed };
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyEntryManagerGroupFilterToRow(row, entry.data, precomputed);
        }
    };

    const clearEntryManagerScriptFilters = ()=>{
        const entries = getEntryManagerEntries(entryManagerState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            setEntryManagerRowFilterState(row, 'stwidFilterScript', false);
        }
    };

    const syncEntryManagerStrategyFilters = ()=>{
        const nextValues = getStrategyValues();
        const hadAllSelected = entryManagerState.filters.strategy.length === entryManagerState.strategyValues.length;
        entryManagerState.strategyValues = nextValues;
        if (!nextValues.length) {
            entryManagerState.filters.strategy = [];
            return;
        }
        if (hadAllSelected || !entryManagerState.filters.strategy.length) {
            entryManagerState.filters.strategy = [...nextValues];
        } else {
            entryManagerState.filters.strategy = normalizeStrategyFilters(entryManagerState.filters.strategy);
        }
    };

    const syncEntryManagerPositionFilters = ()=>{
        const nextValues = getPositionValues();
        const hadAllSelected = entryManagerState.filters.position.length === entryManagerState.positionValues.length;
        entryManagerState.positionValues = nextValues;
        if (!nextValues.length) {
            entryManagerState.filters.position = [];
            return;
        }
        if (hadAllSelected || !entryManagerState.filters.position.length) {
            entryManagerState.filters.position = [...nextValues];
        } else {
            entryManagerState.filters.position = normalizePositionFilters(entryManagerState.filters.position);
        }
    };

    const syncEntryManagerOutletFilters = ()=>{
        const nextValues = getOutletValues();
        const hadAllSelected = entryManagerState.filters.outlet.length === entryManagerState.outletValues.length;
        entryManagerState.outletValues = nextValues;
        if (!nextValues.length) {
            entryManagerState.filters.outlet = [];
            return;
        }
        if (hadAllSelected || !entryManagerState.filters.outlet.length) {
            entryManagerState.filters.outlet = [...nextValues];
        } else {
            entryManagerState.filters.outlet = normalizeOutletFilters(entryManagerState.filters.outlet);
        }
    };

    const syncEntryManagerAutomationIdFilters = ()=>{
        const nextValues = getAutomationIdValues();
        const hadAllSelected = entryManagerState.filters.automationId.length === entryManagerState.automationIdValues.length;
        entryManagerState.automationIdValues = nextValues;
        if (!nextValues.length) {
            entryManagerState.filters.automationId = [];
            return;
        }
        if (hadAllSelected || !entryManagerState.filters.automationId.length) {
            entryManagerState.filters.automationId = [...nextValues];
        } else {
            entryManagerState.filters.automationId = normalizeAutomationIdFilters(entryManagerState.filters.automationId);
        }
    };

    const syncEntryManagerGroupFilters = ()=>{
        const nextValues = getGroupValues();
        const hadAllSelected = entryManagerState.filters.group.length === entryManagerState.groupValues.length;
        entryManagerState.groupValues = nextValues;
        if (!nextValues.length) {
            entryManagerState.filters.group = [];
            return;
        }
        if (hadAllSelected || !entryManagerState.filters.group.length) {
            entryManagerState.filters.group = [...nextValues];
        } else {
            entryManagerState.filters.group = normalizeGroupFilters(entryManagerState.filters.group);
        }
    };

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
