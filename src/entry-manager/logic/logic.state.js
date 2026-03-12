import {
    ENTRY_MANAGER_RECURSION_OPTIONS,
    ENTRY_MANAGER_TOGGLE_COLUMNS,
} from '../../shared/constants.js';

const ENTRY_MANAGER_SORT_STORAGE_KEY = 'stwid--entry-manager-sort';
const ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY = 'stwid--entry-manager-hide-keys';
const ENTRY_MANAGER_COLUMNS_STORAGE_KEY = 'stwid--entry-manager-columns';
const SELECT_OPTION_SELECTOR = 'option';

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

const getSelectOptions = (selectQuery, optionSelector = SELECT_OPTION_SELECTOR)=>{
    const select = document.querySelector(selectQuery);
    if (!select) return [];
    return [...select.querySelectorAll(optionSelector)]
        .map((option)=>({
            value: option.value,
            label: option.textContent?.trim() ?? option.value,
        }))
        .filter((option)=>option.value);
};

const getOptionValues = (options)=>options.map((option)=>option.value);

const getStrategyOptions = ()=>{
    return getSelectOptions('#entry_edit_template [name="entryStateSelector"]');
};

const getStrategyValues = ()=>getOptionValues(getStrategyOptions());

const getPositionOptions = ()=>{
    return getSelectOptions('#entry_edit_template [name="position"]');
};

const getPositionValues = ()=>getOptionValues(getPositionOptions());

const readLocalStorageJson = (key)=>{
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
};

const readLocalStorageString = (key)=>{
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const buildCanonicalDefaultColumns = ()=>{
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

    return {
        canonicalDefaultColumns,
        schemaKeys,
        recursionValues,
    };
};

const buildInitialEntryManagerState = ({ canonicalDefaultColumns, recursionValues, SORT, SORT_DIRECTION })=>{
    const strategyValues = getStrategyValues();
    const positionValues = getPositionValues();

    return {
        sort: SORT.TITLE,
        direction: SORT_DIRECTION.ASCENDING,
        book: null,
        hideKeys: false,
        columns: { ...canonicalDefaultColumns },
        filters: {
            strategy: [...strategyValues],
            position: [...positionValues],
            recursion: [...recursionValues],
            outlet: [],
            automationId: [],
            group: [],
        },
        strategyValues,
        positionValues,
        recursionValues,
        outletValues: [],
        automationIdValues: [],
        groupValues: [],
    };
};

const applyStoredColumns = ({ state, storedColumns, schemaKeys, canonicalDefaultColumns })=>{
    for (const key of schemaKeys) {
        const value = canonicalDefaultColumns[key];
        if (typeof storedColumns[key] === 'boolean') {
            state.columns[key] = storedColumns[key];
        } else {
            state.columns[key] = value;
        }
    }
};

const applyStoredEntryManagerState = ({ state, schemaKeys, canonicalDefaultColumns, SORT, SORT_DIRECTION })=>{
    const storedSortSettings = readLocalStorageJson(ENTRY_MANAGER_SORT_STORAGE_KEY);
    if (Object.values(SORT).includes(storedSortSettings?.sort) && Object.values(SORT_DIRECTION).includes(storedSortSettings?.direction)) {
        state.sort = storedSortSettings.sort;
        state.direction = storedSortSettings.direction;
    }

    state.hideKeys = readLocalStorageString(ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY) === 'true';

    const storedColumns = readLocalStorageJson(ENTRY_MANAGER_COLUMNS_STORAGE_KEY);
    if (storedColumns && typeof storedColumns === 'object') {
        applyStoredColumns({ state, storedColumns, schemaKeys, canonicalDefaultColumns });
    }
};

const createEntryManagerState = ({ SORT, SORT_DIRECTION })=>{
    const { canonicalDefaultColumns, schemaKeys, recursionValues } = buildCanonicalDefaultColumns();
    const state = buildInitialEntryManagerState({ canonicalDefaultColumns, recursionValues, SORT, SORT_DIRECTION });
    applyStoredEntryManagerState({ state, schemaKeys, canonicalDefaultColumns, SORT, SORT_DIRECTION });
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

