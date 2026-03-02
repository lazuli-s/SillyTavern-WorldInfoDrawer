export const initEditorPanel = ({
    dom,
    activationBlock,
    activationBlockParent,
    renderTemplateAsync,
    getWorldEntry,
    buildSavePayload,
    cache,
    setCurrentEditor,
    getSelectFrom,
    selectEnd,
}) => {
    // Tracks whether the currently-open editor has user changes that may not yet
    // have been saved back into the world-info data model.
    // Used to avoid "auto-refresh" rebuilds that would discard typed input.
    let isEditorDirty = false;
    /**@type {{name:string, uid:string}|null}*/
    let currentEditorKey = null;
    /**@type {HTMLElement|null} */
    // F05: Track the single active entry row so clearEntryHighlights() can target it
    // directly instead of scanning every rendered entry in the cache.
    let activeEntryDom = null;

    const markEditorClean = (name, uid)=>{
        // F01: Use uid == null (not !uid) so UID 0 is accepted as valid.
        if (!name || uid == null) return;
        currentEditorKey = { name, uid };
        isEditorDirty = false;
    };

    const markEditorDirtyIfCurrent = ()=>{
        // If the editor is currently showing activation settings or order helper,
        // we treat it as not-dirty from the entry-editor perspective.
        if (!currentEditorKey) return;
        isEditorDirty = true;
    };

    // Only consider keydown inside typical editable controls.
    const shouldMarkDirtyOnKeydown = (evt)=>{
        // Ignore key combos that are commonly non-editing/navigation.
        if (evt.ctrlKey || evt.metaKey || evt.altKey) return false;
        const k = evt.key;
        const nonEditingKeys = new Set([
            'Shift',
            'Control',
            'Alt',
            'Meta',
            'CapsLock',
            'Tab',
            'Escape',
            'Enter',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'PageUp',
            'PageDown',
            'Home',
            'End',
        ]);
        if (nonEditingKeys.has(k)) return false;

        const target = /** @type {HTMLElement|null} */ (evt.target instanceof HTMLElement ? evt.target : null);
        if (!target) return false;
        return Boolean(target.closest('input, textarea, [contenteditable=""], [contenteditable="true"]'));
    };

    // F07: Named handler references so cleanup() can remove them by reference.
    const onEditorInput = markEditorDirtyIfCurrent;
    const onEditorChange = markEditorDirtyIfCurrent;

    // Event delegation: any typing in the editor marks it dirty.
    // (We use capture to catch events early, even if inner templates stopPropagation.)
    const onEditorKeydown = (evt)=>{
        if (shouldMarkDirtyOnKeydown(evt)) {
            markEditorDirtyIfCurrent();
        }
    };

    const onEditorPointerdown = (evt)=>{
        // Conservative: any pointer interaction with mutable form elements marks dirty.
        // This reduces the chance of background refreshes discarding edits.
        // F06: Narrowed to direct data-entry elements only — excludes `button` and
        // `.checkbox` which can match purely presentational controls and produce
        // false-positive dirty flags that block mode switches.
        const target = /** @type {HTMLElement|null} */ (evt.target instanceof HTMLElement ? evt.target : null);
        if (!target) return;
        if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) {
            markEditorDirtyIfCurrent();
        }
    };

    dom.editor?.addEventListener?.('input', onEditorInput, true);
    dom.editor?.addEventListener?.('change', onEditorChange, true);
    dom.editor?.addEventListener?.('keydown', onEditorKeydown, true);
    dom.editor?.addEventListener?.('pointerdown', onEditorPointerdown, true);

    // F05: Clear only the previously tracked active row rather than iterating every
    // rendered entry in the cache — O(1) instead of O(total entries).
    const clearEntryHighlights = () => {
        if (activeEntryDom) {
            activeEntryDom.classList.remove('stwid--state-active');
            activeEntryDom = null;
        }
    };

    const clearEditor = ({ resetCurrent = true } = {}) => {
        dom.editor.innerHTML = '';
        if (resetCurrent) {
            setCurrentEditor(null);
            currentEditorKey = null;
            isEditorDirty = false;
        }
    };

    const hideActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        dom.activationToggle.classList.remove('stwid--state-active');
        activationBlockParent.append(activationBlock);
        clearEditor({ resetCurrent: false });
        setCurrentEditor(null);
        currentEditorKey = null;
        isEditorDirty = false;
    };

    const renderActivationSettings = () => {
        clearEditor({ resetCurrent: false });
        if (dom.order.toggle.classList.contains('stwid--state-active')) {
            dom.order.toggle.click();
        }
        clearEntryHighlights();
        const h4 = document.createElement('h4'); {
            h4.textContent = 'Global World Info/Lorebook activation settings';
            dom.editor.append(h4);
        }
        dom.editor.append(activationBlock);
    };

    const showActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        dom.activationToggle.classList.add('stwid--state-active');
        setCurrentEditor(null);
        currentEditorKey = null;
        isEditorDirty = false;
        renderActivationSettings();
    };

    const toggleActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        const isActive = dom.activationToggle.classList.toggle('stwid--state-active');
        setCurrentEditor(null);
        currentEditorKey = null;
        isEditorDirty = false;
        if (isActive) {
            renderActivationSettings();
        } else {
            activationBlockParent.append(activationBlock);
            clearEditor({ resetCurrent: false });
        }
    };

    const resetEditorState = () => {
        if (dom.activationToggle.classList.contains('stwid--state-active')) {
            hideActivationSettings();
        } else {
            clearEditor();
        }
        clearEntryHighlights();
    };

    const appendUnfocusButton = () => {
        const unfocus = document.createElement('div'); {
            unfocus.classList.add('stwid--unfocusToggle');
            unfocus.classList.add('menu_button');
            unfocus.classList.add('fa-solid', 'fa-fw', 'fa-compress');
            unfocus.title = 'Unfocus';
            unfocus.addEventListener('click', () => {
                dom.editor.classList.toggle('stwid--focus');
            });
            dom.editor.append(unfocus);
        }
    };

    const appendFocusButton = (editDom) => {
        const focusContainer = editDom.querySelector('label[for="content"] > small > span > span')
            ?? editDom.querySelector('label[for="content "] > small > span > span');
        if (!focusContainer) return;
        const btn = document.createElement('div'); {
            btn.classList.add('stwid--focusToggle');
            btn.classList.add('menu_button');
            btn.classList.add('fa-solid', 'fa-fw', 'fa-expand');
            btn.title = 'Focus';
            btn.addEventListener('click', () => {
                dom.editor.classList.toggle('stwid--focus');
            });
            focusContainer.append(btn);
        }
    };

    const openEntryEditor = async ({ entry, entryDom, name, isTokenCurrent }) => {
        // Fast-path: if this click is already stale, bail before we do any work.
        // This prevents upstream template rendering/fetching from running for clicks
        // that are no longer the "latest" selection.
        if (!isTokenCurrent?.()) return;
        if (getSelectFrom()) selectEnd();

        // F02: Close activation/order panels before async work begins, but do NOT
        // touch dirty state or row highlights yet — those only commit on success.
        if (dom.activationToggle.classList.contains('stwid--state-active')) {
            hideActivationSettings();
        }
        if (dom.order.toggle.classList.contains('stwid--state-active')) {
            dom.order.toggle.click();
        }
        // Defer clearEditor until new content is ready — keeps the old entry visible
        // during async fetches, eliminating the blank-state flash between entries.

        // The header template is relatively cheap, but still async; avoid awaiting it
        // if a newer click has already superseded this one.
        if (!isTokenCurrent()) return;
        const headerTemplate = await renderTemplateAsync('worldInfoKeywordHeaders');
        if (!isTokenCurrent()) return;
        const header = document.createRange()
            .createContextualFragment(headerTemplate)
            .querySelector('#WIEntryHeaderTitlesPC');

        // getWorldEntry is the expensive step (template render + DOM construction).
        // Guard it so rapid clicking doesn't queue up wasted work.
        if (!isTokenCurrent()) return;
        const payload = buildSavePayload(name);
        const payloadEntry = payload?.entries?.[entry.uid];
        if (!payloadEntry) return;
        const editDom = (await getWorldEntry(name, payload, payloadEntry))[0];
        const drawerToggle = editDom?.querySelector?.('.inline-drawer');
        if (drawerToggle) {
            $(drawerToggle).trigger('inline-drawer-toggle');
        }
        if (!isTokenCurrent()) return;
        appendFocusButton(editDom);

        // Swap atomically: clear old entry and fill with new in one synchronous block.
        clearEditor({ resetCurrent: false });
        // F04: Apply highlight only after successful async completion — prevents
        // stale-token and missing-payload aborts from leaving the list highlight
        // desynced from the editor content currently on screen.
        clearEntryHighlights();
        entryDom.classList.add('stwid--state-active');
        activeEntryDom = entryDom; // F05: record new active row for O(1) future clears
        appendUnfocusButton();
        if (header) dom.editor.append(header);
        dom.editor.append(editDom);

        // initScrollHeight runs inside getWorldEntry before the element is in the DOM,
        // so scrollHeight is 0 and height correction does nothing. Fix heights now that
        // the textareas are live in the document.
        editDom.querySelectorAll('.keyprimarytextpole, .keysecondarytextpole').forEach(el => {
            el.style.height = '0px';
            el.style.height = `${el.scrollHeight + 3}px`;
        });

        setCurrentEditor({ name, uid: entry.uid });
        // F02: markEditorClean deferred to here — only committed after the DOM swap
        // succeeds. Stale-token / missing-payload aborts leave prior dirty state intact.
        markEditorClean(name, entry.uid);
    };

    const isDirty = (name, uid)=>{
        // F01: Use uid == null (not !uid) so UID 0 is accepted as valid.
        if (!name || uid == null) return false;
        return Boolean(isEditorDirty && currentEditorKey?.name === name && currentEditorKey?.uid === uid);
    };

    const markClean = (name, uid)=>{
        // F01: Use uid == null (not !uid) so UID 0 is accepted as valid.
        if (!name || uid == null) return;
        if (currentEditorKey?.name !== name || currentEditorKey?.uid !== uid) return;
        isEditorDirty = false;
    };

    // F07: Teardown path — removes all four capture listeners registered
    // during initEditorPanel. Caller (drawer.js) should invoke this on beforeunload
    // or whenever the editor panel is being disposed/re-initialized.
    const cleanup = ()=>{
        dom.editor?.removeEventListener?.('input', onEditorInput, true);
        dom.editor?.removeEventListener?.('change', onEditorChange, true);
        dom.editor?.removeEventListener?.('keydown', onEditorKeydown, true);
        dom.editor?.removeEventListener?.('pointerdown', onEditorPointerdown, true);
    };

    return {
        cleanup,
        clearEditor,
        clearEntryHighlights,
        hideActivationSettings,
        showActivationSettings,
        toggleActivationSettings,
        resetEditorState,
        openEntryEditor,
        // Dirty-state helpers for updateWIChange guards.
        isDirty,
        markClean,
    };
};