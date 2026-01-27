const createOrderHelperFilters = ({
    dom,
    orderHelperState,
    entryState,
    getOrderHelperEntries,
    getStrategyValues,
    getPositionValues,
    getOutletValues,
    getOutletValue,
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

    const updateOrderHelperRowFilterClass = (row)=>{
        if (!row) return;
        const strategyFiltered = row.dataset.stwidFilterStrategy === 'true';
        const positionFiltered = row.dataset.stwidFilterPosition === 'true';
        const recursionFiltered = row.dataset.stwidFilterRecursion === 'true';
        const outletFiltered = row.dataset.stwidFilterOutlet === 'true';
        const scriptFiltered = row.dataset.stwidFilterScript === 'true';
        row.classList.toggle(
            'stwid--isFiltered',
            strategyFiltered || positionFiltered || recursionFiltered || outletFiltered || scriptFiltered,
        );
    };

    const setOrderHelperRowFilterState = (row, key, filtered)=>{
        if (!row) return;
        row.dataset[key] = filtered ? 'true' : 'false';
        updateOrderHelperRowFilterClass(row);
    };

    const applyOrderHelperStrategyFilterToRow = (row, entryData)=>{
        const strategyValues = orderHelperState.strategyValues.length
            ? orderHelperState.strategyValues
            : getStrategyValues();
        if (!strategyValues.length) {
            setOrderHelperRowFilterState(row, 'stwidFilterStrategy', false);
            return;
        }
        if (!orderHelperState.filters.strategy.length) {
            orderHelperState.filters.strategy = [...strategyValues];
        }
        const allowed = new Set(orderHelperState.filters.strategy);
        const strategy = entryState(entryData);
        setOrderHelperRowFilterState(row, 'stwidFilterStrategy', !allowed.has(strategy));
    };

    const applyOrderHelperPositionFilterToRow = (row, entryData)=>{
        const positionValues = orderHelperState.positionValues.length
            ? orderHelperState.positionValues
            : getPositionValues();
        if (!positionValues.length) {
            setOrderHelperRowFilterState(row, 'stwidFilterPosition', false);
            return;
        }
        if (!orderHelperState.filters.position.length) {
            orderHelperState.filters.position = [...positionValues];
        }
        const allowed = new Set(orderHelperState.filters.position.map((value)=>String(value)));
        const position = entryData.position ?? '';
        setOrderHelperRowFilterState(row, 'stwidFilterPosition', !allowed.has(String(position)));
    };

    const applyOrderHelperRecursionFilterToRow = (row, entryData)=>{
        const recursionValues = orderHelperState.recursionValues ?? [];
        if (!recursionValues.length) {
            setOrderHelperRowFilterState(row, 'stwidFilterRecursion', false);
            return;
        }
        if (!orderHelperState.filters.recursion.length) {
            orderHelperState.filters.recursion = [...recursionValues];
        }
        const allowed = new Set(orderHelperState.filters.recursion);
        if (orderHelperState.filters.recursion.length === recursionValues.length) {
            setOrderHelperRowFilterState(row, 'stwidFilterRecursion', false);
            return;
        }
        const hasDelayUntilRecursion = entryData?.delayUntilRecursion !== false && entryData?.delayUntilRecursion != null;
        const entryFlags = [
            entryData?.excludeRecursion ? 'excludeRecursion' : null,
            entryData?.preventRecursion ? 'preventRecursion' : null,
            hasDelayUntilRecursion ? 'delayUntilRecursion' : null,
        ].filter(Boolean);
        const matches = entryFlags.some((flag)=>allowed.has(flag));
        setOrderHelperRowFilterState(row, 'stwidFilterRecursion', !matches);
    };

    const applyOrderHelperOutletFilterToRow = (row, entryData)=>{
        const outletValues = orderHelperState.outletValues.length
            ? orderHelperState.outletValues
            : getOutletValues();
        if (!outletValues.length) {
            setOrderHelperRowFilterState(row, 'stwidFilterOutlet', false);
            return;
        }
        if (!orderHelperState.filters.outlet.length) {
            orderHelperState.filters.outlet = [...outletValues];
        }
        const allowed = new Set(orderHelperState.filters.outlet);
        const outletValue = getOutletValue(entryData);
        setOrderHelperRowFilterState(row, 'stwidFilterOutlet', !allowed.has(outletValue));
    };

    const applyOrderHelperStrategyFilters = ()=>{
        const entries = getOrderHelperEntries(orderHelperState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyOrderHelperStrategyFilterToRow(row, entry.data);
        }
    };

    const applyOrderHelperPositionFilters = ()=>{
        const entries = getOrderHelperEntries(orderHelperState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyOrderHelperPositionFilterToRow(row, entry.data);
        }
    };

    const applyOrderHelperRecursionFilters = ()=>{
        const entries = getOrderHelperEntries(orderHelperState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyOrderHelperRecursionFilterToRow(row, entry.data);
        }
    };

    const applyOrderHelperOutletFilters = ()=>{
        const entries = getOrderHelperEntries(orderHelperState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyOrderHelperOutletFilterToRow(row, entry.data);
        }
    };

    const clearOrderHelperScriptFilters = ()=>{
        const entries = getOrderHelperEntries(orderHelperState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            setOrderHelperRowFilterState(row, 'stwidFilterScript', false);
        }
    };

    const syncOrderHelperStrategyFilters = ()=>{
        const nextValues = getStrategyValues();
        const hadAllSelected = orderHelperState.filters.strategy.length === orderHelperState.strategyValues.length;
        orderHelperState.strategyValues = nextValues;
        if (!nextValues.length) {
            orderHelperState.filters.strategy = [];
            return;
        }
        if (hadAllSelected || !orderHelperState.filters.strategy.length) {
            orderHelperState.filters.strategy = [...nextValues];
        } else {
            orderHelperState.filters.strategy = normalizeStrategyFilters(orderHelperState.filters.strategy);
        }
    };

    const syncOrderHelperPositionFilters = ()=>{
        const nextValues = getPositionValues();
        const hadAllSelected = orderHelperState.filters.position.length === orderHelperState.positionValues.length;
        orderHelperState.positionValues = nextValues;
        if (!nextValues.length) {
            orderHelperState.filters.position = [];
            return;
        }
        if (hadAllSelected || !orderHelperState.filters.position.length) {
            orderHelperState.filters.position = [...nextValues];
        } else {
            orderHelperState.filters.position = normalizePositionFilters(orderHelperState.filters.position);
        }
    };

    const syncOrderHelperOutletFilters = ()=>{
        const nextValues = getOutletValues();
        const hadAllSelected = orderHelperState.filters.outlet.length === orderHelperState.outletValues.length;
        orderHelperState.outletValues = nextValues;
        if (!nextValues.length) {
            orderHelperState.filters.outlet = [];
            return;
        }
        if (hadAllSelected || !orderHelperState.filters.outlet.length) {
            orderHelperState.filters.outlet = [...nextValues];
        } else {
            orderHelperState.filters.outlet = normalizeOutletFilters(orderHelperState.filters.outlet);
        }
    };

    return {
        applyOrderHelperRecursionFilterToRow,
        applyOrderHelperRecursionFilters,
        applyOrderHelperPositionFilterToRow,
        applyOrderHelperPositionFilters,
        applyOrderHelperOutletFilterToRow,
        applyOrderHelperOutletFilters,
        applyOrderHelperStrategyFilterToRow,
        applyOrderHelperStrategyFilters,
        clearOrderHelperScriptFilters,
        normalizeOutletFilters,
        normalizePositionFilters,
        normalizeStrategyFilters,
        setOrderHelperRowFilterState,
        syncOrderHelperOutletFilters,
        syncOrderHelperPositionFilters,
        syncOrderHelperStrategyFilters,
    };
};

export { createOrderHelperFilters };
