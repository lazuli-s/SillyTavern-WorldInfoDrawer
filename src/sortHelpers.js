import { Settings } from './Settings.js';
import { SORT, SORT_DIRECTION } from './constants.js';
import { safeToSorted } from './utils.js';

const METADATA_NAMESPACE = 'stwid';
const METADATA_SORT_KEY = 'sort';

const sortEntries = (entries, sortLogic = null, sortDirection = null)=>{
    sortLogic ??= Settings.instance.sortLogic;
    sortDirection ??= Settings.instance.sortDirection;
    const x = (y)=>y.data ?? y;
    const normalizeString = (value)=>{
        if (value === undefined || value === null) return '';
        return String(value).toLowerCase();
    };
    const defaultTitle = (entry)=>entry.comment ?? (Array.isArray(entry.key) ? entry.key.join(', ') : '');
    const defaultCompare = (a,b)=>normalizeString(defaultTitle(x(a))).localeCompare(normalizeString(defaultTitle(x(b))));
    const stringSort = (getter)=>safeToSorted(entries, (a,b)=>{
        const av = normalizeString(getter(x(a)));
        const bv = normalizeString(getter(x(b)));
        const cmp = av.localeCompare(bv);
        if (cmp !== 0) return cmp;
        return defaultCompare(a, b);
    });
    const numericSort = (getter)=>{
        const direction = sortDirection == SORT_DIRECTION.DESCENDING ? -1 : 1;
        return safeToSorted(entries, (a,b)=>{
            const av = getter(x(a));
            const bv = getter(x(b));
            const hasA = Number.isFinite(av);
            const hasB = Number.isFinite(bv);
            if (hasA && hasB && av !== bv) return direction * (av - bv);
            if (hasA && !hasB) return -1;
            if (!hasA && hasB) return 1;
            return defaultCompare(a, b);
        });
    };

    let result = [...entries];
    let shouldReverse = false;
    switch (sortLogic) {
        case SORT.ALPHABETICAL:
        case SORT.TITLE: {
            shouldReverse = true;
            result = stringSort((entry)=>entry.comment ?? (Array.isArray(entry.key) ? entry.key.join(', ') : ''));
            break;
        }
        case SORT.TRIGGER: {
            shouldReverse = true;
            result = stringSort((entry)=>Array.isArray(entry.key) ? entry.key.join(', ') : '');
            break;
        }
        case SORT.PROMPT: {
            shouldReverse = true;
            result = safeToSorted(entries, (a,b)=>{
                if (x(a).position > x(b).position) return 1;
                if (x(a).position < x(b).position) return -1;
                if ((x(a).depth ?? Number.MAX_SAFE_INTEGER) < (x(b).depth ?? Number.MAX_SAFE_INTEGER)) return 1;
                if ((x(a).depth ?? Number.MAX_SAFE_INTEGER) > (x(b).depth ?? Number.MAX_SAFE_INTEGER)) return -1;
                if ((x(a).order ?? Number.MAX_SAFE_INTEGER) > (x(b).order ?? Number.MAX_SAFE_INTEGER)) return 1;
                if ((x(a).order ?? Number.MAX_SAFE_INTEGER) < (x(b).order ?? Number.MAX_SAFE_INTEGER)) return -1;
                return defaultCompare(a, b);
            });
            break;
        }
        case SORT.POSITION: {
            result = numericSort((entry)=>Number(entry.position));
            break;
        }
        case SORT.DEPTH: {
            result = numericSort((entry)=>Number(entry.depth));
            break;
        }
        case SORT.ORDER: {
            result = numericSort((entry)=>Number(entry.order));
            break;
        }
        case SORT.UID: {
            result = numericSort((entry)=>Number(entry.uid));
            break;
        }
        case SORT.LENGTH: {
            result = numericSort((entry)=>{
                if (typeof entry.content !== 'string') return null;
                return entry.content.split(/\s+/).filter(Boolean).length;
            });
            break;
        }
        default: {
            shouldReverse = true;
            result = stringSort((entry)=>defaultTitle(entry));
            break;
        }
    }
    if (shouldReverse && sortDirection == SORT_DIRECTION.DESCENDING) result.reverse();
    return result;
};

const cloneMetadata = (metadata)=>structuredClone(metadata ?? {});

const getSortFromMetadata = (metadata)=>{
    const sortData = metadata?.[METADATA_NAMESPACE]?.[METADATA_SORT_KEY];
    if (!sortData) return null;
    const sort = sortData.sort ?? sortData.logic ?? sortData.sortLogic;
    const direction = sortData.direction ?? sortData.sortDirection;
    if (!Object.values(SORT).includes(sort) || !Object.values(SORT_DIRECTION).includes(direction)) return null;
    return { sort, direction };
};

export {
    cloneMetadata,
    getSortFromMetadata,
    sortEntries,
};
