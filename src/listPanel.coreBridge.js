const CORE_UI_ACTION_SELECTORS = Object.freeze({
    duplicateBook: Object.freeze([
        '#world_duplicate',
        '[id="world_duplicate"]',
    ]),
    deleteBook: Object.freeze([
        '#world_popup_delete',
        '[id="world_popup_delete"]',
    ]),
    renameBook: Object.freeze([
        '#world_popup_name_button',
    ]),
});

/**
 * Waits for a DOM condition to become true.
 * Uses a MutationObserver where possible to avoid fixed delays.
 *
 * @param {() => boolean} condition
 * @param {{ timeoutMs?: number, root?: ParentNode }} [options]
 * @returns {Promise<boolean>}
 */
const waitForDom = (condition, { timeoutMs = 5000, root = document } = {})=>new Promise((resolve)=>{
    if (condition()) {
        resolve(true);
        return;
    }

    let done = false;
    const finish = (value)=>{
        if (done) return;
        done = true;
        clearTimeout(timer);
        observer.disconnect();
        resolve(value);
    };

    const observer = new MutationObserver(()=>{
        if (condition()) finish(true);
    });
    // Assumption guardrail:
    // Core WI controls may appear asynchronously after state/selection changes.
    // Observe broadly so we respond to host DOM timing without brittle fixed delays.
    observer.observe(root === document ? document.documentElement : /**@type {Node}*/(root), {
        childList: true,
        subtree: true,
        attributes: true,
    });

    const timer = setTimeout(()=>finish(false), timeoutMs);
});

/**
 * Select a lorebook in core WI UI select to drive delegated actions.
 *
 * @param {string} bookName
 * @param {{ waitForWorldInfoUpdate?: (()=>Promise<unknown>)|null, delay: (ms:number)=>Promise<unknown>, worldEditorSelectSelector?: string }} options
 * @returns {Promise<boolean>}
 */
const setSelectedBookInCoreUi = async(bookName, {
    waitForWorldInfoUpdate = null,
    delay,
    worldEditorSelectSelector = '#world_editor_select',
})=>{
    const select = /**@type {HTMLSelectElement}*/(document.querySelector(worldEditorSelectSelector));
    if (!select) return false;
    const option = /**@type {HTMLOptionElement[]}*/([...select.children]).find((item)=>item.textContent == bookName);
    if (!option) return false;

    const previousValue = select.value;
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles:true }));

    // Wait for the selection to be reflected in the DOM/state.
    // We can't rely on fixed delays because ST may update asynchronously.
    // As a minimal robust check, wait until the select reports the new value
    // and at least one mutation occurs in the WI area (common after change).
    if (select.value !== option.value) return false;
    // If selection did not actually change (same value), still allow continuing.
    if (previousValue === option.value) return true;

    // Assumption guardrail:
    // Some host states do not emit WORLDINFO_UPDATED for selection switches.
    // Race event waiting with a short delay fallback to keep behavior stable.
    if (waitForWorldInfoUpdate) {
        await Promise.race([
            waitForWorldInfoUpdate(),
            delay(800),
        ]);
        return true;
    }
    await delay(200);
    return true;
};

/**
 * Click a core WI action button by trying one or more selectors.
 *
 * @param {string|string[]} possibleSelectors
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<boolean>}
 */
const clickCoreUiAction = async(possibleSelectors, { timeoutMs = 5000 } = {})=>{
    const selectors = Array.isArray(possibleSelectors) ? possibleSelectors : [possibleSelectors];
    const findButton = ()=>selectors
        .map((sel)=>document.querySelector(sel))
        .find((el)=>el instanceof HTMLElement);

    const ok = await waitForDom(()=>Boolean(findButton()), { timeoutMs });
    if (!ok) return false;
    const btn = /**@type {HTMLElement}*/(findButton());
    btn.click();
    return true;
};

export {
    CORE_UI_ACTION_SELECTORS,
    clickCoreUiAction,
    setSelectedBookInCoreUi,
    waitForDom,
};
