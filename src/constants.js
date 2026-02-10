/** @readonly */
/** @enum {string} */
export const SORT = {
    /** Alphabetical by entry title */
    TITLE: 'title',
    /** Numeric position value */
    POSITION: 'position',
    /** Numeric depth value */
    DEPTH: 'depth',
    /** By numeric order value */
    ORDER: 'order',
    /** By numeric UID */
    UID: 'uid',
    /** Alphabetical by trigger/keywords */
    TRIGGER: 'trigger',
    /** By token/word count */
    LENGTH: 'length',
    /** By custom display index */
    CUSTOM: 'custom',
    /** Alphabetical by entry comment (title/memo) */
    ALPHABETICAL: 'alphabetical',
    /** According to prompt depth (position-depth-order) */
    PROMPT: 'prompt',
};
/** @readonly */
/** @enum {string} */
export const SORT_DIRECTION = {
    /** Alphabetical by entry comment (title/memo) */
    ASCENDING: 'ascending',
    /** According to prompt depth (position-depth-order) */
    DESCENDING: 'descending',
};

// ── Order Helper table schema ─────────────────────────────────────────────────
// These constants are the single source of truth for column definitions and
// recursion option labels shared across orderHelperRender.* slice files.
// Keep ORDER_HELPER_TOGGLE_COLUMNS in sync with ORDER_HELPER_DEFAULT_COLUMNS
// in orderHelperState.js.

/** Columns that can be shown/hidden via the Column Visibility dropdown.
 *  Fixed columns (select, drag, enabled, entry) are always visible and not listed here. */
export const ORDER_HELPER_TOGGLE_COLUMNS = [
    { key: 'strategy',        label: 'Strategy' },
    { key: 'position',        label: 'Position' },
    { key: 'depth',           label: 'Depth' },
    { key: 'outlet',          label: 'Outlet' },
    { key: 'group',           label: 'Inclusion Group' },
    { key: 'order',           label: 'Order' },
    { key: 'sticky',          label: 'Sticky' },
    { key: 'cooldown',        label: 'Cooldown' },
    { key: 'delay',           label: 'Delay' },
    { key: 'automationId',    label: 'Automation ID' },
    { key: 'trigger',         label: 'Trigger %' },
    { key: 'recursion',       label: 'Recursion' },
    { key: 'budget',          label: 'Budget' },
    { key: 'characterFilter', label: 'Character Filter' },
];

/** Full ordered column list for the table header.
 *  Prepends the always-visible fixed columns before the toggleable ones. */
export const ORDER_HELPER_TABLE_COLUMNS = [
    { key: 'select',  label: '' },
    { key: 'drag',    label: '' },
    { key: 'enabled', label: '' },
    { key: 'entry',   label: 'Entry' },
    ...ORDER_HELPER_TOGGLE_COLUMNS,
];

/** Columns rendered as numeric inputs (tighter layout, right-aligned). */
export const ORDER_HELPER_NUMBER_COLUMN_KEYS = new Set([
    'depth',
    'order',
    'sticky',
    'cooldown',
    'delay',
    'automationId',
    'trigger',
]);

/** Recursion option definitions shared between the header filter menu and per-row cell. */
export const ORDER_HELPER_RECURSION_OPTIONS = [
    { value: 'excludeRecursion',    label: 'Non-recursable' },
    { value: 'preventRecursion',    label: 'Prevent further recursion' },
    { value: 'delayUntilRecursion', label: 'Delay until recursion' },
];
