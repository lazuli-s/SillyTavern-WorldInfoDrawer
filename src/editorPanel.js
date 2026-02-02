export const initEditorPanel = ({
    dom,
    activationBlock,
    activationBlockParent,
    renderTemplateAsync,
    getWorldEntry,
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

    const markEditorClean = (name, uid)=>{
        if (!name || !uid) return;
        currentEditorKey = { name, uid };
        isEditorDirty = false;
    };

    const markEditorDirtyIfCurrent = ()=>{
        // If the editor is currently showing activation settings or order helper,
        // we treat it as not-dirty from the entry-editor perspective.
        if (!currentEditorKey) return;
        isEditorDirty = true;
    };

    // Event delegation: any typing in the editor marks it dirty.
    // (We use capture to catch events early, even if inner templates stopPropagation.)
    dom.editor?.addEventListener?.('input', markEditorDirtyIfCurrent, true);
    dom.editor?.addEventListener?.('change', markEditorDirtyIfCurrent, true);

    // Some SillyTavern template controls / widgets may mutate state without emitting
    // input/change on elements we can easily observe. Make dirty tracking more conservative:
    // - keydown catches "typing" before an input event (or when value is managed elsewhere)
    // - pointerdown catches clicking toggles/checkbox-like widgets
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

        // Only consider keydown inside typical editable controls.
        const target = /** @type {HTMLElement|null} */ (evt.target instanceof HTMLElement ? evt.target : null);
        if (!target) return false;
        return Boolean(target.closest('input, textarea, [contenteditable=""], [contenteditable="true"]'));
    };

    dom.editor?.addEventListener?.('keydown', (evt)=>{
        if (shouldMarkDirtyOnKeydown(evt)) {
            markEditorDirtyIfCurrent();
        }
    }, true);

    dom.editor?.addEventListener?.('pointerdown', (evt)=>{
        // Conservative: any click within the entry editor could change state.
        // This reduces the chance of background refreshes discarding edits.
        const target = /** @type {HTMLElement|null} */ (evt.target instanceof HTMLElement ? evt.target : null);
        if (!target) return;
        if (target.closest('input, textarea, select, button, [contenteditable=""], [contenteditable="true"], .checkbox')) {
            markEditorDirtyIfCurrent();
        }
    }, true);
    const clearEntryHighlights = () => {
        for (const cb of Object.values(cache)) {
            for (const ce of Object.values(cb.dom.entry)) {
                ce.root.classList.remove('stwid--active');
            }
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
        dom.activationToggle.classList.remove('stwid--active');
        activationBlockParent.append(activationBlock);
        clearEditor({ resetCurrent: false });
        setCurrentEditor(null);
        currentEditorKey = null;
        isEditorDirty = false;
    };

    const showActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        dom.activationToggle.classList.add('stwid--active');
        setCurrentEditor(null);
        currentEditorKey = null;
        isEditorDirty = false;
        clearEditor({ resetCurrent: false });
        if (dom.order.toggle.classList.contains('stwid--active')) {
            dom.order.toggle.click();
        }
        clearEntryHighlights();
        const h4 = document.createElement('h4'); {
            h4.textContent = 'Global World Info/Lorebook activation settings';
            dom.editor.append(h4);
        }
        dom.editor.append(activationBlock);
    };

    const toggleActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        const isActive = dom.activationToggle.classList.toggle('stwid--active');
        setCurrentEditor(null);
        currentEditorKey = null;
        isEditorDirty = false;
        if (isActive) {
            clearEditor({ resetCurrent: false });
            if (dom.order.toggle.classList.contains('stwid--active')) {
                dom.order.toggle.click();
            }
            clearEntryHighlights();
            const h4 = document.createElement('h4'); {
                h4.textContent = 'Global World Info/Lorebook activation settings';
                dom.editor.append(h4);
            }
            dom.editor.append(activationBlock);
        } else {
            activationBlockParent.append(activationBlock);
            clearEditor({ resetCurrent: false });
        }
    };

    const resetEditorState = () => {
        if (dom.activationToggle.classList.contains('stwid--active')) {
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
        if (getSelectFrom()) selectEnd();
        clearEntryHighlights();
        // Switching entries always re-renders the editor; treat that as clean.
        markEditorClean(name, entry.uid);
        if (dom.activationToggle.classList.contains('stwid--active')) {
            hideActivationSettings();
        }
        if (dom.order.toggle.classList.contains('stwid--active')) {
            dom.order.toggle.click();
        }
        entryDom.classList.add('stwid--active');
        clearEditor({ resetCurrent: false });
        appendUnfocusButton();

        const header = document.createRange()
            .createContextualFragment(await renderTemplateAsync('worldInfoKeywordHeaders'))
            .querySelector('#WIEntryHeaderTitlesPC');
        if (header) {
            dom.editor.append(header);
        }

        const editDom = (await getWorldEntry(name, { entries: cache[name].entries }, cache[name].entries[entry.uid]))[0];
        const drawerToggle = editDom?.querySelector?.('.inline-drawer');
        if (drawerToggle) {
            $(drawerToggle).trigger('inline-drawer-toggle');
        }
        if (!isTokenCurrent()) return;
        appendFocusButton(editDom);
        dom.editor.append(editDom);
        setCurrentEditor({ name, uid: entry.uid });
        // Editor DOM is now in sync with the underlying entry snapshot.
        markEditorClean(name, entry.uid);
    };

    const isDirty = (name, uid)=>{
        if (!name || !uid) return false;
        return Boolean(isEditorDirty && currentEditorKey?.name === name && currentEditorKey?.uid === uid);
    };

    const markClean = (name, uid)=>{
        if (!name || !uid) return;
        if (currentEditorKey?.name !== name || currentEditorKey?.uid !== uid) return;
        isEditorDirty = false;
    };

    return {
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
