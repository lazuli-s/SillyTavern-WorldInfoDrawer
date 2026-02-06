const createOrderHelperFilters = ({
    dom,
    orderHelperState,
    entryState,
    getOrderHelperEntries,
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

    const updateOrderHelperRowFilterClass = (row)=>{
        if (!row) return;
        const strategyFiltered = row.dataset.stwidFilterStrategy === 'true';
        const positionFiltered = row.dataset.stwidFilterPosition === 'true';
        const recursionFiltered = row.dataset.stwidFilterRecursion === 'true';
        const outletFiltered = row.dataset.stwidFilterOutlet === 'true';
        const automationIdFiltered = row.dataset.stwidFilterAutomationId === 'true';
        const groupFiltered = row.dataset.stwidFilterGroup === 'true';
        const scriptFiltered = row.dataset.stwidFilterScript === 'true';
        row.classList.toggle(
            'stwid--isFiltered',
            strategyFiltered
                || positionFiltered
                || recursionFiltered
                || outletFiltered
                || automationIdFiltered
                || groupFiltered
                || scriptFiltered,
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

    const applyOrderHelperAutomationIdFilterToRow = (row, entryData)=>{
        const automationIdValues = orderHelperState.automationIdValues.length
            ? orderHelperState.automationIdValues
            : getAutomationIdValues();
        if (!automationIdValues.length) {
            setOrderHelperRowFilterState(row, 'stwidFilterAutomationId', false);
            return;
        }
        if (!orderHelperState.filters.automationId.length) {
            orderHelperState.filters.automationId = [...automationIdValues];
        }
        const allowed = new Set(orderHelperState.filters.automationId);
        const automationId = getAutomationIdValue(entryData);
        setOrderHelperRowFilterState(row, 'stwidFilterAutomationId', !allowed.has(automationId));
    };

    const applyOrderHelperGroupFilterToRow = (row, entryData)=>{
        const groupValues = orderHelperState.groupValues.length
            ? orderHelperState.groupValues
            : getGroupValues();
        if (!groupValues.length) {
            setOrderHelperRowFilterState(row, 'stwidFilterGroup', false);
            return;
        }
        if (!orderHelperState.filters.group.length) {
            orderHelperState.filters.group = [...groupValues];
        }
        const allowed = new Set(orderHelperState.filters.group);
        const groupValuesForEntry = getGroupValue(entryData);
        const matches = groupValuesForEntry.some((value)=>allowed.has(value));
        setOrderHelperRowFilterState(row, 'stwidFilterGroup', !matches);
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

    const applyOrderHelperAutomationIdFilters = ()=>{
        const entries = getOrderHelperEntries(orderHelperState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyOrderHelperAutomationIdFilterToRow(row, entry.data);
        }
    };

    const applyOrderHelperGroupFilters = ()=>{
        const entries = getOrderHelperEntries(orderHelperState.book, true);
        for (const entry of entries) {
            const row = dom.order.entries?.[entry.book]?.[entry.data.uid];
            applyOrderHelperGroupFilterToRow(row, entry.data);
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

    const syncOrderHelperAutomationIdFilters = ()=>{
        const nextValues = getAutomationIdValues();
        const hadAllSelected = orderHelperState.filters.automationId.length === orderHelperState.automationIdValues.length;
        orderHelperState.automationIdValues = nextValues;
        if (!nextValues.length) {
            orderHelperState.filters.automationId = [];
            return;
        }
        if (hadAllSelected || !orderHelperState.filters.automationId.length) {
            orderHelperState.filters.automationId = [...nextValues];
        } else {
            orderHelperState.filters.automationId = normalizeAutomationIdFilters(orderHelperState.filters.automationId);
        }
    };

    const syncOrderHelperGroupFilters = ()=>{
        const nextValues = getGroupValues();
        const hadAllSelected = orderHelperState.filters.group.length === orderHelperState.groupValues.length;
        orderHelperState.groupValues = nextValues;
        if (!nextValues.length) {
            orderHelperState.filters.group = [];
            return;
        }
        if (hadAllSelected || !orderHelperState.filters.group.length) {
            orderHelperState.filters.group = [...nextValues];
        } else {
            orderHelperState.filters.group = normalizeGroupFilters(orderHelperState.filters.group);
        }
    };

    return {
        applyOrderHelperRecursionFilterToRow,
        applyOrderHelperRecursionFilters,
        applyOrderHelperPositionFilterToRow,
        applyOrderHelperPositionFilters,
        applyOrderHelperOutletFilterToRow,
        applyOrderHelperOutletFilters,
        applyOrderHelperAutomationIdFilterToRow,
        applyOrderHelperAutomationIdFilters,
        applyOrderHelperGroupFilterToRow,
        applyOrderHelperGroupFilters,
        applyOrderHelperStrategyFilterToRow,
        applyOrderHelperStrategyFilters,
        clearOrderHelperScriptFilters,
        normalizeOutletFilters,
        normalizeAutomationIdFilters,
        normalizeGroupFilters,
        normalizePositionFilters,
        normalizeStrategyFilters,
        setOrderHelperRowFilterState,
        syncOrderHelperOutletFilters,
        syncOrderHelperAutomationIdFilters,
        syncOrderHelperGroupFilters,
        syncOrderHelperPositionFilters,
        syncOrderHelperStrategyFilters,
    };
};

export { createOrderHelperFilters };
