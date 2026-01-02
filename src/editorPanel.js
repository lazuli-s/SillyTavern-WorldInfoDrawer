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
        }
    };

    const hideActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        dom.activationToggle.classList.remove('stwid--active');
        activationBlockParent.append(activationBlock);
        clearEditor({ resetCurrent: false });
        setCurrentEditor(null);
    };

    const showActivationSettings = () => {
        if (!activationBlock || !activationBlockParent) return;
        dom.activationToggle.classList.add('stwid--active');
        setCurrentEditor(null);
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
        const focusContainer = editDom.querySelector('label[for="content "] > small > span > span');
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

    const addEditorFieldLabels = (editDom) => {
        const header = editDom.querySelector('.inline-drawer-header');
        if (!header) return;
        const getHeaderFieldWrapper = (field) =>
            field.closest('.world_entry_form_control, .flex-container, .wi-entry-footer-text, .wi-entry-footer-text-container')
            ?? field.parentElement;
        const fieldTargets = [
            { label: 'Entry Title', selectors: ['[name="comment"]', '.WIEntryTitleAndStatus', '.WIEntryTitle', '[name="title"]', '[name="entryTitle"]'] },
            { label: 'Strategy', selectors: ['[name="entryStateSelector"]'] },
            { label: 'Position', selectors: ['[name="position"]'] },
            { label: 'Depth', selectors: ['[name="depth"]'] },
            { label: 'Order', selectors: ['[name="order"]'] },
            { label: 'Trigger %', selectors: ['[name="probability"]', '[name="trigger"]', '[name="triggerChance"]'] },
        ];

        for (const target of fieldTargets) {
            const field = target.selectors
                .map((selector) => header.querySelector(selector))
                .find(Boolean);
            if (!field) continue;
            const wrapper = getHeaderFieldWrapper(field);
            if (!wrapper || wrapper.querySelector(':scope > .stwid--fieldLabel')) continue;
            wrapper.classList.add('stwid--headerField');
            const label = document.createElement('div'); {
                label.classList.add('stwid--fieldLabel', 'small');
                label.textContent = target.label;
                wrapper.prepend(label);
            }
        }
    };

    const openEntryEditor = async ({ entry, entryDom, name, isTokenCurrent }) => {
        if (getSelectFrom()) selectEnd();
        clearEntryHighlights();
        if (dom.activationToggle.classList.contains('stwid--active')) {
            hideActivationSettings();
        }
        if (dom.order.toggle.classList.contains('stwid--active')) {
            dom.order.toggle.click();
        }
        entryDom.classList.add('stwid--active');
        clearEditor({ resetCurrent: false });
        appendUnfocusButton();
        dom.editor.append(
            document.createRange()
                .createContextualFragment(await renderTemplateAsync('worldInfoKeywordHeaders'))
                .querySelector('#WIEntryHeaderTitlesPC')
        );
        const editDom = (await getWorldEntry(name, { entries: cache[name].entries }, cache[name].entries[entry.uid]))[0];
        $(editDom.querySelector('.inline-drawer')).trigger('inline-drawer-toggle');
        if (!isTokenCurrent()) return;
        appendFocusButton(editDom);
        addEditorFieldLabels(editDom);
        dom.editor.append(editDom);
        setCurrentEditor({ name, uid: entry.uid });
    };

    return {
        clearEditor,
        clearEntryHighlights,
        hideActivationSettings,
        showActivationSettings,
        toggleActivationSettings,
        resetEditorState,
        openEntryEditor,
    };
};
