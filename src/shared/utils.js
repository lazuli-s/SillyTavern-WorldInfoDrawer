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
const createDeferred = () => {
    /**@type {(value?: unknown) => void}*/
    let resolve;
    /**@type {(reason?: any) => void}*/
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

const safeToSorted = (array, comparator) => typeof array.toSorted === 'function'
    ? array.toSorted(comparator)
    : array.slice().sort(comparator);

const getSortLabel = (sort, direction) => SORT_OPTIONS.find(([, s, d]) => s === sort && d === direction)?.[0];

const appendSortOptions = (select, currentSort, currentDirection) => {
    for (const [label, sort, direction] of SORT_OPTIONS) {
        const opt = document.createElement('option');
        opt.value = JSON.stringify({ sort, direction });
        opt.textContent = label;
        opt.selected = sort == currentSort && direction == currentDirection;
        select.append(opt);
    }
};

let slashCommandParserCtor = null;
let slashCommandParserCtorResolved = false;
const getSlashCommandParserCtor = async () => {
    if (slashCommandParserCtorResolved) return slashCommandParserCtor;

    const runtimeCtor = globalThis.SlashCommandParser;
    if (typeof runtimeCtor === 'function') {
        slashCommandParserCtor = runtimeCtor;
        slashCommandParserCtorResolved = true;
        return slashCommandParserCtor;
    }

    // Fallback for ST versions that do not expose the parser constructor globally.
    try {
        const module = await import('../../../../../slash-commands/SlashCommandParser.js');
        slashCommandParserCtor = typeof module?.SlashCommandParser === 'function'
            ? module.SlashCommandParser
            : null;
    } catch (error) {
        console.error('Failed to resolve SlashCommandParser', error);
        slashCommandParserCtor = null;
    }
    slashCommandParserCtorResolved = true;
    return slashCommandParserCtor;
};

const executeSlashCommand = async (command) => {
    try {
        const SlashCommandParser = await getSlashCommandParserCtor();
        if (typeof SlashCommandParser !== 'function') {
            console.error('Failed to execute slash command: SlashCommandParser is unavailable.');
            return false;
        }

        const parser = new SlashCommandParser();
        const closure = parser.parse(command);
        if (!closure || typeof closure.execute !== 'function') {
            console.error('Failed to execute slash command: parser returned an invalid command closure.');
            return false;
        }

        await closure.execute();
        return true;
    } catch (error) {
        console.error('Failed to execute slash command', error);
        return false;
    }
};

/**
 * Parses a potentially non-boolean setting value tolerantly.
 * Accepts native booleans, the strings "true"/"false", and the numbers 1/0.
 * Returns `defaultValue` for all other unrecognized inputs, ensuring the
 * caller's intended default is preserved even when serialization coerces types.
 * @param {*} value
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
const parseBooleanSetting = (value, defaultValue) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1) return true;
    if (value === 'false' || value === 0) return false;
    return defaultValue;
};

const getOutletPositionValue = () => document.querySelector('#entry_edit_template [name="position"] option[data-i18n="Outlet"]')?.value;

const isOutletPosition = (position) => {
    const outletValue = getOutletPositionValue();
    if (outletValue === undefined) return false;
    return String(position) === String(outletValue);
};

export {
    appendSortOptions,
    createDeferred,
    executeSlashCommand,
    getOutletPositionValue,
    getSortLabel,
    isOutletPosition,
    parseBooleanSetting,
    safeToSorted,
};
