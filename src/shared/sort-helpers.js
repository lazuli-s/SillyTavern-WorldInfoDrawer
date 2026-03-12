import { Settings } from './settings.js';
import { SORT, SORT_DIRECTION } from './constants.js';
import { safeToSorted } from './utils.js';

const METADATA_NAMESPACE = 'stwid';
const METADATA_SORT_KEY = 'sort';
const MISSING_NUMBER_SORT_VALUE = Number.MAX_SAFE_INTEGER;
const ENTRY_KEY_JOIN_SEPARATOR = ', ';

const unwrapEntry = (entryOrWrapper) => entryOrWrapper.data ?? entryOrWrapper;

const normalizeString = (value) => {
    if (value === undefined || value === null) return '';
    return String(value).toLowerCase();
};

const getDefaultTitle = (entry) => entry.comment ?? (Array.isArray(entry.key) ? entry.key.join(ENTRY_KEY_JOIN_SEPARATOR) : '');

const createDefaultCompare = () => (a, b) => {
    return normalizeString(getDefaultTitle(unwrapEntry(a))).localeCompare(normalizeString(getDefaultTitle(unwrapEntry(b))));
};

const compareFiniteOrMissingNumbers = (aValue, bValue, { direction, onTie }) => {
    const hasA = Number.isFinite(aValue);
    const hasB = Number.isFinite(bValue);
    if (hasA && hasB && aValue !== bValue) return direction * (aValue - bValue);
    if (hasA && !hasB) return -1;
    if (!hasA && hasB) return 1;
    return onTie();
};

const createStringSorter = ({ entries, defaultCompare }) => (getter) => {
    return safeToSorted(entries, (a, b) => {
        const av = normalizeString(getter(unwrapEntry(a)));
        const bv = normalizeString(getter(unwrapEntry(b)));
        const cmp = av.localeCompare(bv);
        if (cmp !== 0) return cmp;
        return defaultCompare(a, b);
    });
};

const createNumericSorter = ({ entries, defaultCompare, sortDirection }) => (getter) => {
    const direction = sortDirection == SORT_DIRECTION.DESCENDING ? -1 : 1;
    return safeToSorted(entries, (a, b) => {
        const av = getter(unwrapEntry(a));
        const bv = getter(unwrapEntry(b));
        return compareFiniteOrMissingNumbers(av, bv, {
            direction,
            onTie: () => defaultCompare(a, b),
        });
    });
};

const getDisplayIndex = (entry) => {
    const displayIndex = Number(entry?.extensions?.display_index);
    return Number.isFinite(displayIndex) ? displayIndex : null;
};

const sortByTitle = (createStringSort) => {
    return createStringSort((entry) => entry.comment ?? (Array.isArray(entry.key) ? entry.key.join(ENTRY_KEY_JOIN_SEPARATOR) : ''));
};

const sortByTrigger = (createStringSort) => {
    return createStringSort((entry) => Array.isArray(entry.key) ? entry.key.join(ENTRY_KEY_JOIN_SEPARATOR) : '');
};

const sortByPrompt = (entries, defaultCompare) => {
    return safeToSorted(entries, (a, b) => {
        const aEntry = unwrapEntry(a);
        const bEntry = unwrapEntry(b);
        if (aEntry.position > bEntry.position) return 1;
        if (aEntry.position < bEntry.position) return -1;
        if ((aEntry.depth ?? MISSING_NUMBER_SORT_VALUE) < (bEntry.depth ?? MISSING_NUMBER_SORT_VALUE)) return 1;
        if ((aEntry.depth ?? MISSING_NUMBER_SORT_VALUE) > (bEntry.depth ?? MISSING_NUMBER_SORT_VALUE)) return -1;
        if ((aEntry.order ?? MISSING_NUMBER_SORT_VALUE) > (bEntry.order ?? MISSING_NUMBER_SORT_VALUE)) return -1;
        if ((aEntry.order ?? MISSING_NUMBER_SORT_VALUE) < (bEntry.order ?? MISSING_NUMBER_SORT_VALUE)) return 1;
        return defaultCompare(a, b);
    });
};

const sortByLength = (entries, createNumericSort) => {
    const lengthCache = new Map(entries.map((item) => {
        const entry = unwrapEntry(item);
        if (typeof entry?.content !== 'string') return [entry, null];
        return [entry, entry.content.split(/\s+/).filter(Boolean).length];
    }));
    return createNumericSort((entry) => {
        return lengthCache.get(entry) ?? null;
    });
};

const sortByCustom = (entries, defaultCompare) => {
    return safeToSorted(entries, (a, b) => {
        const av = getDisplayIndex(unwrapEntry(a));
        const bv = getDisplayIndex(unwrapEntry(b));
        return compareFiniteOrMissingNumbers(av, bv, {
            direction: 1,
            onTie: () => {
                const auid = Number(unwrapEntry(a).uid);
                const buid = Number(unwrapEntry(b).uid);
                if (Number.isFinite(auid) && Number.isFinite(buid) && auid !== buid) return auid - buid;
                return defaultCompare(a, b);
            },
        });
    });
};

const sortEntries = (entries, sortLogic = null, sortDirection = null) => {
    sortLogic ??= Settings.instance.sortLogic;
    sortDirection ??= Settings.instance.sortDirection;
    const defaultCompare = createDefaultCompare();
    const stringSort = createStringSorter({ entries, defaultCompare });
    const numericSort = createNumericSorter({ entries, defaultCompare, sortDirection });

    let result = [...entries];
    let shouldReverse = false;
    switch (sortLogic) {
        case SORT.ALPHABETICAL:
        case SORT.TITLE: {
            shouldReverse = true;
            result = sortByTitle(stringSort);
            break;
        }
        case SORT.TRIGGER: {
            shouldReverse = true;
            result = sortByTrigger(stringSort);
            break;
        }
        case SORT.PROMPT: {
            shouldReverse = true;
            result = sortByPrompt(entries, defaultCompare);
            break;
        }
        case SORT.POSITION: {
            result = numericSort((entry) => Number(entry.position));
            break;
        }
        case SORT.DEPTH: {
            result = numericSort((entry) => Number(entry.depth));
            break;
        }
        case SORT.ORDER: {
            result = numericSort((entry) => Number(entry.order));
            break;
        }
        case SORT.UID: {
            result = numericSort((entry) => Number(entry.uid));
            break;
        }
        case SORT.LENGTH: {
            result = sortByLength(entries, numericSort);
            break;
        }
        case SORT.CUSTOM: {
            result = sortByCustom(entries, defaultCompare);
            break;
        }
        default: {
            shouldReverse = true;
            result = stringSort((entry) => getDefaultTitle(entry));
            break;
        }
    }
    if (shouldReverse && sortDirection == SORT_DIRECTION.DESCENDING) result.reverse();
    return result;
};

const cloneMetadata = (metadata) => structuredClone(metadata ?? {});

const getSortFromMetadata = (metadata) => {
    const sortData = metadata?.[METADATA_NAMESPACE]?.[METADATA_SORT_KEY];
    if (!sortData) return null;
    const sort = sortData.sort ?? sortData.logic ?? sortData.sortLogic;
    const direction = sortData.direction ?? sortData.sortDirection;
    if (!Object.values(SORT).includes(sort) || !Object.values(SORT_DIRECTION).includes(direction)) return null;
    return { sort, direction };
};

export {
    cloneMetadata,
    METADATA_NAMESPACE,
    METADATA_SORT_KEY,
    getSortFromMetadata,
    sortEntries,
};
