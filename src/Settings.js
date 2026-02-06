import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';
import { SORT, SORT_DIRECTION } from './constants.js';

export { SORT, SORT_DIRECTION } from './constants.js';

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

    constructor() {
        Object.assign(this, extension_settings.worldInfoDrawer ?? {});
        extension_settings.worldInfoDrawer = this;

        if (!Object.values(SORT).includes(this.sortLogic)) {
            this.sortLogic = SORT.TITLE;
        }
        if (!Object.values(SORT_DIRECTION).includes(this.sortDirection)) {
            this.sortDirection = SORT_DIRECTION.ASCENDING;
        }
        if (typeof this.useBookSorts !== 'boolean') {
            this.useBookSorts = true;
        }
    }

    toJSON() {
        return {
            sortLogic: this.sortLogic,
            sortDirection: this.sortDirection,
            useBookSorts: this.useBookSorts,
        };
    }

    save() {
        saveSettingsDebounced();
    }
}
