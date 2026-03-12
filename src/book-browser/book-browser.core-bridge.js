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

const DEFAULT_DOM_WAIT_TIMEOUT_MS = 5000;

const waitForDom = (condition, { timeoutMs = DEFAULT_DOM_WAIT_TIMEOUT_MS, root = document } = {})=>new Promise((resolve)=>{
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
    
    
    
    observer.observe(root === document ? document.documentElement : (root), {
        childList: true,
        subtree: true,
        attributes: true,
    });

    const timer = setTimeout(()=>finish(false), timeoutMs);
});


const setSelectedBookInCoreUi = async(bookName, {
    waitForWorldInfoUpdate = null,
    delay,
    worldEditorSelectSelector = '#world_editor_select',
})=>{
    const worldEditorSelect = (document.querySelector(worldEditorSelectSelector));
    if (!worldEditorSelect) return false;
    const matchedBookOption = ([...worldEditorSelect.children]).find((item)=>item.textContent == bookName);
    if (!matchedBookOption) return false;

    const previousValue = worldEditorSelect.value;
    worldEditorSelect.value = matchedBookOption.value;
    if (worldEditorSelect.value !== matchedBookOption.value) return false;
    
    if (previousValue === matchedBookOption.value) return true;

    worldEditorSelect.dispatchEvent(new Event('change', { bubbles:true }));
    
    await delay(50);
    if (worldEditorSelect.value !== matchedBookOption.value) return false;

    
    
    
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


const clickCoreUiAction = async(possibleSelectors, { timeoutMs = DEFAULT_DOM_WAIT_TIMEOUT_MS } = {})=>{
    const selectors = Array.isArray(possibleSelectors) ? possibleSelectors : [possibleSelectors];
    const findButton = ()=>selectors
        .map((sel)=>document.querySelector(sel))
        .find((el)=>el instanceof HTMLElement);

    const ok = await waitForDom(()=>Boolean(findButton()), { timeoutMs });
    if (!ok) return false;
    const actionButton = (findButton());
    actionButton.click();
    return true;
};

export {
    CORE_UI_ACTION_SELECTORS,
    clickCoreUiAction,
    setSelectedBookInCoreUi,
    waitForDom,
};
