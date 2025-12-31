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
