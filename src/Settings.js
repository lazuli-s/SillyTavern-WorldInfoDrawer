import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';


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

export class Settings {
    /**@type {Settings} */
    static #instance;
    static get instance() {
        if (!this.#instance) {
            this.#instance = new Settings();
        }
        return this.#instance;
    }
    /**@type {SORT} */
    sortLogic = SORT.TITLE;
    /**@type {SORT_DIRECTION} */
    sortDirection = SORT_DIRECTION.ASCENDING;
    /**@type {boolean} */
    useBookSorts = true;
    /**@type {{ [key: string]: number }} */
    orderHelperColumnWidths = {};

    constructor() {
        Object.assign(this, extension_settings.wordInfoDrawer ?? {});
        extension_settings.wordInfoDrawer = this;

        if (!Object.values(SORT).includes(this.sortLogic)) {
            this.sortLogic = SORT.TITLE;
        }
        if (!Object.values(SORT_DIRECTION).includes(this.sortDirection)) {
            this.sortDirection = SORT_DIRECTION.ASCENDING;
        }
        if (typeof this.useBookSorts !== 'boolean') {
            this.useBookSorts = true;
        }
        if (!this.orderHelperColumnWidths || typeof this.orderHelperColumnWidths !== 'object') {
            this.orderHelperColumnWidths = {};
        }
    }

    toJSON() {
        return {
            sortLogic: this.sortLogic,
            sortDirection: this.sortDirection,
            useBookSorts: this.useBookSorts,
            orderHelperColumnWidths: this.orderHelperColumnWidths,
        };
    }

    save() {
        saveSettingsDebounced();
    }
}
