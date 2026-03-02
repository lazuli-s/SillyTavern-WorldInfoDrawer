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
    const select = (document.querySelector(worldEditorSelectSelector));
    if (!select) return false;
    const option = ([...select.children]).find((item)=>item.textContent == bookName);
    if (!option) return false;

    const previousValue = select.value;
    select.value = option.value;
    if (select.value !== option.value) return false;
    
    if (previousValue === option.value) return true;

    select.dispatchEvent(new Event('change', { bubbles:true }));
    
    await delay(50);
    if (select.value !== option.value) return false;

    
    
    
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


const clickCoreUiAction = async(possibleSelectors, { timeoutMs = 5000 } = {})=>{
    const selectors = Array.isArray(possibleSelectors) ? possibleSelectors : [possibleSelectors];
    const findButton = ()=>selectors
        .map((sel)=>document.querySelector(sel))
        .find((el)=>el instanceof HTMLElement);

    const ok = await waitForDom(()=>Boolean(findButton()), { timeoutMs });
    if (!ok) return false;
    const btn = (findButton());
    btn.click();
    return true;
};

export {
    CORE_UI_ACTION_SELECTORS,
    clickCoreUiAction,
    setSelectedBookInCoreUi,
    waitForDom,
};
