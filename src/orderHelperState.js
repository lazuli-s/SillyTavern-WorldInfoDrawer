const ORDER_HELPER_SORT_STORAGE_KEY = 'stwid--order-helper-sort';
const ORDER_HELPER_HIDE_KEYS_STORAGE_KEY = 'stwid--order-helper-hide-keys';
const ORDER_HELPER_COLUMNS_STORAGE_KEY = 'stwid--order-helper-columns';

const ORDER_HELPER_DEFAULT_COLUMNS = {
    strategy: true,
    position: true,
    depth: true,
    outlet: true,
    group: false,
    order: true,
    sticky: false,
    cooldown: false,
    delay: false,
    automationId: false,
    trigger: true,
    recursion: false,
    budget: false,
    characterFilter: false,
};

const getStrategyOptions = ()=>{
    const select = document.querySelector('#entry_edit_template [name="entryStateSelector"]');
    if (!select) return [];
    return [...select.querySelectorAll('option')]
        .map((option)=>({
            value: option.value,
            label: option.textContent?.trim() ?? option.value,
        }))
        .filter((option)=>option.value);
};

const getStrategyValues = ()=>getStrategyOptions().map((option)=>option.value);

const getPositionOptions = ()=>{
    const select = document.querySelector('#entry_edit_template [name="position"]');
    if (!select) return [];
    return [...select.querySelectorAll('option')]
        .map((option)=>({
            value: option.value,
            label: option.textContent?.trim() ?? option.value,
        }))
        .filter((option)=>option.value);
};

const getPositionValues = ()=>getPositionOptions().map((option)=>option.value);

const createOrderHelperState = ({ SORT, SORT_DIRECTION })=>{
    const recursionValues = [
        'excludeRecursion',
        'preventRecursion',
        'delayUntilRecursion',
    ];
    const state = {
        sort: SORT.TITLE,
        direction: SORT_DIRECTION.ASCENDING,
        book: null,
        hideKeys: false,
        columns: { ...ORDER_HELPER_DEFAULT_COLUMNS },
        filters: {
            strategy: getStrategyValues(),
            position: getPositionValues(),
            recursion: [...recursionValues],
            outlet: [],
            automationId: [],
            group: [],
        },
        strategyValues: getStrategyValues(),
        positionValues: getPositionValues(),
        recursionValues,
        outletValues: [],
        automationIdValues: [],
        groupValues: [],
    };
    try {
        const stored = JSON.parse(localStorage.getItem(ORDER_HELPER_SORT_STORAGE_KEY));
        if (Object.values(SORT).includes(stored?.sort) && Object.values(SORT_DIRECTION).includes(stored?.direction)) {
            state.sort = stored.sort;
            state.direction = stored.direction;
        }
    } catch { /* empty */ }
    try {
        state.hideKeys = localStorage.getItem(ORDER_HELPER_HIDE_KEYS_STORAGE_KEY) === 'true';
    } catch { /* empty */ }
    try {
        const storedColumns = JSON.parse(localStorage.getItem(ORDER_HELPER_COLUMNS_STORAGE_KEY));
        if (storedColumns && typeof storedColumns === 'object') {
            for (const [key, value] of Object.entries(ORDER_HELPER_DEFAULT_COLUMNS)) {
                if (typeof storedColumns[key] === 'boolean') {
                    state.columns[key] = storedColumns[key];
                } else {
                    state.columns[key] = value;
                }
            }
        }
    } catch { /* empty */ }
    return state;
};

export {
    ORDER_HELPER_COLUMNS_STORAGE_KEY,
    ORDER_HELPER_HIDE_KEYS_STORAGE_KEY,
    ORDER_HELPER_SORT_STORAGE_KEY,
    createOrderHelperState,
    getPositionOptions,
    getPositionValues,
    getStrategyOptions,
    getStrategyValues,
};
