const ACTIVE_STATE_CLASS = 'stwid--state-active';
const FOCUS_CLASS = 'stwid--focus';

export const initEditorPanel = ({
    dom,
    activationBlock,
    activationBlockParent,
    renderTemplateAsync,
    getWorldEntry,
    buildSavePayload,
    setCurrentEditor,
    getSelectFrom,
    selectEnd,
}) => {
    
    
    
    let isEditorDirty = false;
    
    let currentEditorKey = null;
    
    
    
    let activeEntryDom = null;

    const markEditorClean = (name, uid)=>{
        
        if (!name || uid == null) return;
        currentEditorKey = { name, uid };
        isEditorDirty = false;
    };

    const markEditorDirtyIfCurrent = ()=>{
        
        
        if (!currentEditorKey) return;
        isEditorDirty = true;
    };

    
    const shouldMarkDirtyOnKeydown = (evt)=>{
        
        if (evt.ctrlKey || evt.metaKey || evt.altKey) return false;
        const pressedKey = evt.key;
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
        if (nonEditingKeys.has(pressedKey)) return false;

        const target =  (evt.target instanceof HTMLElement ? evt.target : null);
        if (!target) return false;
        return Boolean(target.closest('input, textarea, [contenteditable=""], [contenteditable="true"]'));
    };

    
    const onEditorInput = markEditorDirtyIfCurrent;
    const onEditorChange = markEditorDirtyIfCurrent;

    
    
    const onEditorKeydown = (evt)=>{
        if (shouldMarkDirtyOnKeydown(evt)) {
            markEditorDirtyIfCurrent();
        }
    };

    dom.editor?.addEventListener?.('input', onEditorInput, true);
    dom.editor?.addEventListener?.('change', onEditorChange, true);
    dom.editor?.addEventListener?.('keydown', onEditorKeydown, true);

    
    
    const clearEntryHighlights = () => {
        if (activeEntryDom) {
            activeEntryDom.classList.remove(ACTIVE_STATE_CLASS);
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

    const resetEditorOwnership = () => {
        setCurrentEditor(null);
        currentEditorKey = null;
        isEditorDirty = false;
    };

    const hideActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        dom.activationToggle.classList.remove(ACTIVE_STATE_CLASS);
        activationBlockParent.append(activationBlock);
        clearEditor({ resetCurrent: false });
        resetEditorOwnership();
    };

    const renderActivationSettings = () => {
        clearEditor({ resetCurrent: false });
        if (dom.order.toggle.classList.contains(ACTIVE_STATE_CLASS)) {
            dom.order.toggle.click();
        }
        clearEntryHighlights();
        const activationHeading = document.createElement('h4'); {
            activationHeading.textContent = 'Global World Info/Lorebook activation settings';
            dom.editor.append(activationHeading);
        }
        dom.editor.append(activationBlock);
    };

    const showActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        dom.activationToggle.classList.add(ACTIVE_STATE_CLASS);
        resetEditorOwnership();
        renderActivationSettings();
    };

    const toggleActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        const isActive = dom.activationToggle.classList.toggle(ACTIVE_STATE_CLASS);
        resetEditorOwnership();
        if (isActive) {
            renderActivationSettings();
        } else {
            activationBlockParent.append(activationBlock);
            clearEditor({ resetCurrent: false });
        }
    };

    const resetEditorState = () => {
        if (dom.activationToggle.classList.contains(ACTIVE_STATE_CLASS)) {
            hideActivationSettings();
        } else {
            clearEditor();
        }
        clearEntryHighlights();
    };

    const createFocusToggleButton = (toggleClass, iconClass, title) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', title);
        button.classList.add(toggleClass);
        button.classList.add('menu_button');
        button.classList.add('fa-solid', 'fa-fw', iconClass);
        button.title = title;
        button.addEventListener('click', () => {
            dom.editor.classList.toggle(FOCUS_CLASS);
        });
        return button;
    };

    const appendUnfocusButton = () => {
        const unfocus = createFocusToggleButton('stwid--unfocusToggle', 'fa-compress', 'Unfocus');
        dom.editor.append(unfocus);
    };

    const appendFocusButton = (editDom) => {
        const focusContainer = editDom.querySelector('label[for="content"] > small > span > span')
            ?? editDom.querySelector('label[for="content "] > small > span > span');
        if (!focusContainer) return;
        const btn = createFocusToggleButton('stwid--focusToggle', 'fa-expand', 'Focus');
        focusContainer.append(btn);
    };

    const wireAmsSection = (editDom, attempts = 0) => {
        const amsHeader = editDom.querySelector('.userSettingsInnerExpandable');
        const amsDrawer = amsHeader?.closest('.inline-drawer');
        if (!amsHeader || !amsDrawer) {
            if (attempts < 30) {
                requestAnimationFrame(() => wireAmsSection(editDom, attempts + 1));
            }
            return;
        }

        if (amsDrawer.dataset.stwidAmsWired === '1') return;
        amsDrawer.dataset.stwidAmsWired = '1';

        amsDrawer.classList.add('stwid--ams');
        amsDrawer.classList.remove('stwid--ams-open');
        amsDrawer.classList.remove('openDrawer');
        if (document.body.classList.contains('stwid--ams-disabled')) {
            amsDrawer.style.setProperty('display', 'none', 'important');
        } else {
            amsDrawer.style.removeProperty('display');
        }
        const icon = amsDrawer.querySelector('.inline-drawer-icon');
        if (icon) {
            icon.classList.remove('up', 'fa-circle-chevron-up');
            icon.classList.add('down', 'fa-circle-chevron-down');
        }

        amsHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = amsDrawer.classList.toggle('stwid--ams-open');
            if (icon) {
                icon.classList.toggle('up', isOpen);
                icon.classList.toggle('down', !isOpen);
                icon.classList.toggle('fa-circle-chevron-up', isOpen);
                icon.classList.toggle('fa-circle-chevron-down', !isOpen);
            }
        });
    };

    const closeCompetingPanels = () => {
        if (dom.activationToggle.classList.contains(ACTIVE_STATE_CLASS)) {
            hideActivationSettings();
        }
        if (dom.order.toggle.classList.contains(ACTIVE_STATE_CLASS)) {
            dom.order.toggle.click();
        }
    };

    const fetchEntryHeaderElement = async (isTokenCurrent) => {
        if (!isTokenCurrent()) return null;
        const headerTemplate = await renderTemplateAsync('worldInfoKeywordHeaders');
        if (!isTokenCurrent()) return null;
        return document.createRange()
            .createContextualFragment(headerTemplate)
            .querySelector('#WIEntryHeaderTitlesPC');
    };

    const fixTextpoleHeights = (editDom) => {
        editDom.querySelectorAll('.keyprimarytextpole, .keysecondarytextpole').forEach(textpoleTextarea => {
            textpoleTextarea.style.height = '0px';
            textpoleTextarea.style.height = `${textpoleTextarea.scrollHeight + 3}px`;
        });
    };

    const openEntryEditor = async ({ entry, entryDom, name, isTokenCurrent }) => {
        
        
        
        if (!isTokenCurrent?.()) return;
        if (getSelectFrom()) selectEnd();

        
        
        closeCompetingPanels();
        
        

        
        
        const header = await fetchEntryHeaderElement(isTokenCurrent);
        if (!isTokenCurrent()) return;

        
        
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

        
        clearEditor({ resetCurrent: false });
        
        
        
        clearEntryHighlights();
        entryDom.classList.add(ACTIVE_STATE_CLASS);
        activeEntryDom = entryDom; 
        appendUnfocusButton();
        if (header) dom.editor.append(header);
        dom.editor.append(editDom);
        wireAmsSection(editDom);

        
        
        
        fixTextpoleHeights(editDom);

        setCurrentEditor({ name, uid: entry.uid });
        
        
        markEditorClean(name, entry.uid);
    };

    const isDirty = (name, uid)=>{
        
        if (!name || uid == null) return false;
        return Boolean(isEditorDirty && currentEditorKey?.name === name && currentEditorKey?.uid === uid);
    };

    const markClean = (name, uid)=>{
        
        if (!name || uid == null) return;
        if (currentEditorKey?.name !== name || currentEditorKey?.uid !== uid) return;
        isEditorDirty = false;
    };

    
    
    
    const cleanup = ()=>{
        dom.editor?.removeEventListener?.('input', onEditorInput, true);
        dom.editor?.removeEventListener?.('change', onEditorChange, true);
        dom.editor?.removeEventListener?.('keydown', onEditorKeydown, true);
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
        
        isDirty,
        markClean,
    };
};
