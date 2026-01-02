const dom = {
    drawer: {
        /**@type {HTMLElement} */
        body: undefined,
    },
    /**@type {HTMLElement} */
    books: undefined,
    /**@type {HTMLElement} */
    editor: undefined,
    /**@type {HTMLButtonElement} */
    collapseAllToggle: undefined,
    /**@type {HTMLElement} */
    activationToggle: undefined,
    order: {
        /**@type {HTMLElement} */
        toggle: undefined,
        /**@type {HTMLInputElement} */
        start: undefined,
        /**@type {HTMLInputElement} */
        step: undefined,
        direction: {
            /**@type {HTMLInputElement} */
            up: undefined,
            /**@type {HTMLInputElement} */
            down: undefined,
        },
        filter: {
            /**@type {HTMLElement} */
            root: undefined,
            /**@type {HTMLElement} */
            preview: undefined,
        },
        /**@type {HTMLElement} */
        selectAll: undefined,
        /**@type {HTMLSelectElement} */
        sortSelect: undefined,
        /**@type {{[book:string]:{[uid:string]:HTMLElement}}} */
        entries: {},
        /**@type {HTMLElement} */
        tbody: undefined,
    },
};

const cache = {};

/**@type {{name:string, uid:string}} */
let currentEditor;

const getCurrentEditor = ()=>currentEditor;
const setCurrentEditor = (value)=>{
    currentEditor = value;
};

export {
    cache,
    dom,
    getCurrentEditor,
    setCurrentEditor,
};
