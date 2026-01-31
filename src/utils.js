import { SORT, SORT_DIRECTION } from './constants.js';

/**
 * Sort options available to dropdowns. Each tuple is
 * [Label, Sort Logic, Sort Direction].
 * @type {[string, SORT, SORT_DIRECTION][]}
 */
const SORT_OPTIONS = [
    ['Custom', SORT.CUSTOM, SORT_DIRECTION.ASCENDING],
    ['Title A-Z', SORT.TITLE, SORT_DIRECTION.ASCENDING],
    ['Title Z-A', SORT.TITLE, SORT_DIRECTION.DESCENDING],
    ['Position ↗', SORT.POSITION, SORT_DIRECTION.ASCENDING],
    ['Position ↘', SORT.POSITION, SORT_DIRECTION.DESCENDING],
    ['Depth ↗', SORT.DEPTH, SORT_DIRECTION.ASCENDING],
    ['Depth ↘', SORT.DEPTH, SORT_DIRECTION.DESCENDING],
    ['Order ↗', SORT.ORDER, SORT_DIRECTION.ASCENDING],
    ['Order ↘', SORT.ORDER, SORT_DIRECTION.DESCENDING],
    ['UID ↗', SORT.UID, SORT_DIRECTION.ASCENDING],
    ['UID ↘', SORT.UID, SORT_DIRECTION.DESCENDING],
    ['Trigger ↗', SORT.TRIGGER, SORT_DIRECTION.ASCENDING],
    ['Trigger ↘', SORT.TRIGGER, SORT_DIRECTION.DESCENDING],
    ['Tokens ↗', SORT.LENGTH, SORT_DIRECTION.ASCENDING],
    ['Tokens ↘', SORT.LENGTH, SORT_DIRECTION.DESCENDING],
    ['Prompt ↗', SORT.PROMPT, SORT_DIRECTION.ASCENDING],
    ['Prompt ↘', SORT.PROMPT, SORT_DIRECTION.DESCENDING],
];

/**
 * Creates a deferred promise that can be resolved or rejected externally.
 * @returns {{ promise: Promise<unknown>, resolve: (value?: unknown) => void, reject: (reason?: any) => void }}
 */
const createDeferred = ()=>{
    /**@type {(value?: unknown) => void}*/
    let resolve;
    /**@type {(reason?: any) => void}*/
    let reject;
    const promise = new Promise((res, rej)=>{
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

const safeToSorted = (array, comparator)=>typeof array.toSorted === 'function'
    ? array.toSorted(comparator)
    : array.slice().sort(comparator);

const getSortLabel = (sort, direction)=>SORT_OPTIONS.find(([, s, d])=>s === sort && d === direction)?.[0];

const appendSortOptions = (select, currentSort, currentDirection)=>{
    for (const [label, sort, direction] of SORT_OPTIONS) {
        const opt = document.createElement('option');
        opt.value = JSON.stringify({ sort, direction });
        opt.textContent = label;
        opt.selected = sort == currentSort && direction == currentDirection;
        select.append(opt);
    }
};

export {
    appendSortOptions,
    createDeferred,
    getSortLabel,
    safeToSorted,
};
