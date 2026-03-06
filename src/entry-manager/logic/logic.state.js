import {
    ENTRY_MANAGER_RECURSION_OPTIONS,
    ENTRY_MANAGER_TOGGLE_COLUMNS,
} from '../../shared/constants.js';

const ENTRY_MANAGER_SORT_STORAGE_KEY = 'stwid--entry-manager-sort';
const ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY = 'stwid--entry-manager-hide-keys';
const ENTRY_MANAGER_COLUMNS_STORAGE_KEY = 'stwid--entry-manager-columns';

const ENTRY_MANAGER_DEFAULT_COLUMNS = {
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

const createEntryManagerState = ({ SORT, SORT_DIRECTION })=>{
    const recursionValues = ENTRY_MANAGER_RECURSION_OPTIONS.map(({ value })=>value);
    const schemaKeys = ENTRY_MANAGER_TOGGLE_COLUMNS.map(({ key })=>key);
    const schemaKeySet = new Set(schemaKeys);
    const defaultKeys = Object.keys(ENTRY_MANAGER_DEFAULT_COLUMNS);
    const missingInDefaults = schemaKeys.filter((key)=>!Object.hasOwn(ENTRY_MANAGER_DEFAULT_COLUMNS, key));
    const extraInDefaults = defaultKeys.filter((key)=>!schemaKeySet.has(key));
    if (missingInDefaults.length > 0 || extraInDefaults.length > 0) {
        console.warn('[STWID entryManagerState] Column schema mismatch detected.', { missingInDefaults, extraInDefaults });
    }
    const canonicalDefaultColumns = { ...ENTRY_MANAGER_DEFAULT_COLUMNS };
    for (const key of schemaKeys) {
        if (typeof canonicalDefaultColumns[key] !== 'boolean') {
            canonicalDefaultColumns[key] = false;
        }
    }
    const state = {
        sort: SORT.TITLE,
        direction: SORT_DIRECTION.ASCENDING,
        book: null,
        hideKeys: false,
        columns: { ...canonicalDefaultColumns },
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
        const stored = JSON.parse(localStorage.getItem(ENTRY_MANAGER_SORT_STORAGE_KEY));
        if (Object.values(SORT).includes(stored?.sort) && Object.values(SORT_DIRECTION).includes(stored?.direction)) {
            state.sort = stored.sort;
            state.direction = stored.direction;
        }
    } catch {  }
    try {
        state.hideKeys = localStorage.getItem(ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY) === 'true';
    } catch {  }
    try {
        const storedColumns = JSON.parse(localStorage.getItem(ENTRY_MANAGER_COLUMNS_STORAGE_KEY));
        if (storedColumns && typeof storedColumns === 'object') {
            for (const key of schemaKeys) {
                const value = canonicalDefaultColumns[key];
                if (typeof storedColumns[key] === 'boolean') {
                    state.columns[key] = storedColumns[key];
                } else {
                    state.columns[key] = value;
                }
            }
        }
    } catch {  }
    return state;
};

export {
    ENTRY_MANAGER_COLUMNS_STORAGE_KEY,
    ENTRY_MANAGER_DEFAULT_COLUMNS,
    ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY,
    ENTRY_MANAGER_SORT_STORAGE_KEY,
    createEntryManagerState,
    getPositionOptions,
    getPositionValues,
    getStrategyOptions,
    getStrategyValues,
};

