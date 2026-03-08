let context = null;

export const setWorldEntryContext = (value) => {
    context = value;
};

export const entryState = function(entry) {
    if (entry.constant === true) {
        return 'constant';
    } else if (entry.vectorized === true) {
        return 'vectorized';
    } else {
        return 'normal';
    }
};

function buildSelectionHelpToast() {
    const help = document.createElement('ul');
    help.classList.add('stwid--helpToast');
    const lines = [
        'Hold [SHIFT] while clicking to select a range of entries',
        'Drag the selected entries onto another book to move them to that book',
        'Hold [CTRL] while dragging entries to copy them to the targeted book',
        'Hold [CTRL] while dragging entries onto the same book to duplicate them',
        'Press [DEL] to delete the selected entries',
    ];
    for (const line of lines) {
        const li = document.createElement('li');
        li.textContent = line;
        help.append(li);
    }
    return help;
}

function selectEntryRange(startRow, endRow, entryList) {
    const start = [...entryList.children].indexOf(startRow);
    const end = [...entryList.children].indexOf(endRow);
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    for (let i = from; i <= to; i++) {
        const row = entryList.children[i];
        const uid = String(row.dataset.uid);
        if (!context.selectList.includes(uid)) {
            context.selectAdd(row);
            context.selectList.push(uid);
        }
    }
}

async function runEntryStateSave(action) {
    await action.save();
}

function buildEntrySelector({ entry, name, rowUid, world }) {
    const selectorButton = document.createElement('div');
    selectorButton.classList.add('stwid--selector');
    selectorButton.title = 'Click to select entry';
    selectorButton.addEventListener('click', (evt)=>{
        evt.preventDefault();
        if (context.selectFrom !== null && context.selectFrom != name) return;
        evt.stopPropagation();
        if (context.selectLast && evt.shiftKey) {
            selectEntryRange(context.selectLast, entry, world.dom.entryList);
            context.selectLast = entry;
            return;
        }

        if (context.selectFrom === null) {
            context.selectFrom = name;
            context.selectList = [];
            context.selectToast = toastr.info($(buildSelectionHelpToast()), 'WorldInfo Drawer', {
                timeOut: 0,
                extendedTimeOut: 0,
                escapeHtml: false,
            });
        }

        if (context.selectList.includes(rowUid)) {
            context.selectRemove(entry);
            context.selectList.splice(context.selectList.indexOf(rowUid), 1);
            if (context.selectLast == entry) context.selectLast = null;
            if (context.selectList.length == 0) {
                context.selectEnd();
            }
            return;
        }

        context.selectAdd(entry);
        context.selectList.push(rowUid);
        context.selectLast = entry;
    });

    const icon = document.createElement('div');
    icon.classList.add('stwid--icon');
    icon.classList.add('fa-solid', 'fa-square');
    selectorButton.append(icon);
    return selectorButton;
}

function buildEntryBody({ world, worldEntry }) {
    const body = document.createElement('div');
    body.classList.add('stwid--body');

    const comment = document.createElement('div');
    world.dom.entry[worldEntry.uid].comment = comment;
    comment.classList.add('stwid--comment');
    comment.textContent = worldEntry.comment;
    body.append(comment);

    const key = document.createElement('div');
    world.dom.entry[worldEntry.uid].key = key;
    key.classList.add('stwid--key');
    key.textContent = worldEntry.key.join(', ');
    body.append(key);

    return body;
}

function buildEntryStatusControls({ entryName, world, worldEntry }) {
    const status = document.createElement('div');
    status.classList.add('stwid--status');
    status.addEventListener('click', (evt)=>{
        evt.stopPropagation();
    });

    let isSavingState = false;
    const saveEntryState = ()=>typeof context.enqueueEntryStateSave === 'function'
        ? context.enqueueEntryStateSave(entryName)
        : context.saveWorldInfo(entryName, context.buildSavePayload(entryName), true);

    const isEnabledTemplate = document.querySelector('#entry_edit_template [name="entryKillSwitch"]');
    const isEnabled = isEnabledTemplate?.cloneNode(true);
    if (isEnabled) {
        world.dom.entry[worldEntry.uid].isEnabled = isEnabled;
        isEnabled.classList.add('stwid--enabled');
        isEnabled.title = 'Enable/disable this entry';
        isEnabled.setAttribute('aria-label', 'Enable or disable this entry');

        const applyEnabledIcon = (disabled)=>{
            isEnabled.classList.toggle('fa-toggle-off', Boolean(disabled));
            isEnabled.classList.toggle('fa-toggle-on', !Boolean(disabled));
        };

        applyEnabledIcon(worldEntry.disable);
        isEnabled.addEventListener('click', async()=>{
            if (isSavingState) return;

            const cachedEntry = context.cache[entryName].entries[worldEntry.uid];
            const prevDisabled = cachedEntry.disable;
            const nextDisabled = !prevDisabled;
            cachedEntry.disable = nextDisabled;
            applyEnabledIcon(nextDisabled);
            isSavingState = true;
            isEnabled.disabled = true;
            try {
                await runEntryStateSave({ save: saveEntryState });
            } catch {
                cachedEntry.disable = prevDisabled;
                applyEnabledIcon(prevDisabled);
                toastr.error('Failed to save entry state. Changes were not persisted.');
            } finally {
                isSavingState = false;
                isEnabled.disabled = false;
            }
        });
        status.append(isEnabled);
    }

    const strategyTemplate = document.querySelector('#entry_edit_template [name="entryStateSelector"]');
    const strategySelect = strategyTemplate?.cloneNode(true);
    if (strategySelect) {
        world.dom.entry[worldEntry.uid].strategy = strategySelect;
        strategySelect.classList.add('stwid--strategy');
        strategySelect.title = 'Entry strategy';
        strategySelect.setAttribute('aria-label', 'Entry strategy');
        strategySelect.value = entryState(worldEntry);
        strategySelect.addEventListener('change', async()=>{
            if (isSavingState) return;

            const cachedEntry = context.cache[entryName].entries[worldEntry.uid];
            const prevConstant = cachedEntry.constant;
            const prevVectorized = cachedEntry.vectorized;
            switch (strategySelect.value) {
                case 'constant': {
                    cachedEntry.constant = true;
                    cachedEntry.vectorized = false;
                    break;
                }
                case 'normal': {
                    cachedEntry.constant = false;
                    cachedEntry.vectorized = false;
                    break;
                }
                case 'vectorized': {
                    cachedEntry.constant = false;
                    cachedEntry.vectorized = true;
                    break;
                }
            }
            isSavingState = true;
            strategySelect.disabled = true;
            try {
                await runEntryStateSave({ save: saveEntryState });
            } catch {
                cachedEntry.constant = prevConstant;
                cachedEntry.vectorized = prevVectorized;
                strategySelect.value = entryState({ constant: prevConstant, vectorized: prevVectorized });
                toastr.error('Failed to save entry strategy. Changes were not persisted.');
            } finally {
                isSavingState = false;
                strategySelect.disabled = false;
            }
        });
        status.append(strategySelect);
    }

    return status;
}

function attachEntryInteractionHandlers({ entry, entryName, rowUid, worldEntry }) {
    let clickToken;
    entry.addEventListener('click', async()=>{
        const token = context.uuidv4();
        clickToken = token;
        await context.editorPanel.openEntryEditor({
            entry: worldEntry,
            entryDom: entry,
            name: entryName,
            isTokenCurrent: () => clickToken === token,
        });
    });

    entry.addEventListener('pointerdown', (evt)=>{
        if (evt.button !== 0) return;
        if (context.selectFrom !== entryName) return;
        if (!context.selectList?.includes?.(rowUid)) return;
        entry.setAttribute('draggable', 'true');
    });
}

export const renderEntry = async(worldEntry, name, before = null)=>{
    const world = context.cache[name];
    const rowUid = String(worldEntry.uid);
    world.dom.entry[worldEntry.uid] = {};
    const entry = document.createElement('div'); {
        world.dom.entry[worldEntry.uid].root = entry;
        entry.classList.add('stwid--entry');
        entry.dataset.uid = rowUid;
        entry.addEventListener('selectstart', (evt)=>evt.preventDefault());
        entry.addEventListener('dragstart', (evt)=>{
            if (context.selectFrom === null || !context.selectList?.includes(rowUid)) {
                evt.preventDefault();
                return;
            }
            context.dom.books.classList.add('stwid--state-dragging');
            evt.dataTransfer.setData('text/plain', entry.textContent);
        });
        entry.append(buildEntrySelector({ entry, name, rowUid, world }));
        entry.append(buildEntryBody({ world, worldEntry }));
        entry.append(buildEntryStatusControls({ entryName: name, world, worldEntry }));
        const actions = document.createElement('div'); {
            actions.classList.add('stwid--actions');
            entry.append(actions);
        }
        attachEntryInteractionHandlers({ entry, entryName: name, rowUid, worldEntry });

        if (before) before.insertAdjacentElement('beforebegin', entry);
        else world.dom.entryList.append(entry);
        return entry;
    }
};
