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

export const renderEntry = async(e, name, before = null)=>{
    const world = context.cache[name];
    const rowUid = String(e.uid);
    world.dom.entry[e.uid] = {};
    const entry = document.createElement('div'); {
        world.dom.entry[e.uid].root = entry;
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
        const sel = document.createElement('div'); {
            sel.classList.add('stwid--selector');
            sel.title = 'Click to select entry';
            sel.addEventListener('click', (evt)=>{
                evt.preventDefault();
                
                if (context.selectFrom !== null && context.selectFrom != name) return;
                evt.stopPropagation();
                if (context.selectLast && evt.shiftKey) {
                    
                    const start = [...world.dom.entryList.children].indexOf(context.selectLast);
                    const end = [...world.dom.entryList.children].indexOf(entry);
                    const from = Math.min(start, end);
                    const to = Math.max(start, end);
                    for (let i = from; i <= to; i++) {
                        const el = world.dom.entryList.children[i];
                        const uid = String(el.dataset.uid);
                        if (!context.selectList.includes(uid)) {
                            context.selectAdd(el);
                            context.selectList.push(uid);
                        }
                    }
                    context.selectLast = entry;
                } else {
                    if (context.selectFrom === null) {
                        context.selectFrom = name;
                        
                        context.selectList = [];
                        const help = document.createElement('ul'); {
                            help.classList.add('stwid--helpToast');
                            const lines = [
                                'Hold [SHIFT] while clicking to select a range of entries',
                                'Drag the selected entries onto another book to move them to that book',
                                'Hold [CTRL] while dragging entries to copy them to the targeted book',
                                'Hold [CTRL] while dragging entries onto the same book to duplicate them',
                                'Press [DEL] to delete the selected entries',
                            ];
                            for (const line of lines) {
                                const  li = document.createElement('li'); {
                                    li.textContent = line;
                                    help.append(li);
                                }
                            }
                        }
                        context.selectToast = toastr.info($(help), 'WorldInfo Drawer', {
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
                    } else {
                        context.selectAdd(entry);
                        context.selectList.push(rowUid);
                        context.selectLast = entry;
                    }
                }
            });
            const i = document.createElement('div'); {
                i.classList.add('stwid--icon');
                i.classList.add('fa-solid', 'fa-square');
                sel.append(i);
            }
            entry.append(sel);
        }
        const body = document.createElement('div'); {
            body.classList.add('stwid--body');
            const comment = document.createElement('div'); {
                world.dom.entry[e.uid].comment = comment;
                comment.classList.add('stwid--comment');
                comment.textContent = e.comment;
                body.append(comment);
            }
            const key = document.createElement('div'); {
                world.dom.entry[e.uid].key = key;
                key.classList.add('stwid--key');
                key.textContent = e.key.join(', ');
                body.append(key);
            }
            entry.append(body);
        }
        const status = document.createElement('div'); {
            status.classList.add('stwid--status');
            
            status.addEventListener('click', (evt)=>{
                evt.stopPropagation();
            });
            
            let isSavingState = false;
            const saveEntryState = ()=>typeof context.enqueueEntryStateSave === 'function'
                ? context.enqueueEntryStateSave(name)
                : context.saveWorldInfo(name, context.buildSavePayload(name), true);
            const isEnabledTemplate = document.querySelector('#entry_edit_template [name="entryKillSwitch"]');
            const isEnabled = (isEnabledTemplate?.cloneNode(true));
            
            if (isEnabled) {
                world.dom.entry[e.uid].isEnabled = isEnabled;
                isEnabled.classList.add('stwid--enabled');
                isEnabled.title = 'Enable/disable this entry';
                isEnabled.setAttribute('aria-label', 'Enable or disable this entry');

                const applyEnabledIcon = (disabled)=>{
                    isEnabled.classList.toggle('fa-toggle-off', Boolean(disabled));
                    isEnabled.classList.toggle('fa-toggle-on', !Boolean(disabled));
                };

                applyEnabledIcon(e.disable);
                isEnabled.addEventListener('click', async()=>{
                    
                    if (isSavingState) return;
                    
                    const prevDisabled = context.cache[name].entries[e.uid].disable;
                    const nextDisabled = !prevDisabled;
                    context.cache[name].entries[e.uid].disable = nextDisabled;
                    applyEnabledIcon(nextDisabled);
                    isSavingState = true;
                    isEnabled.disabled = true;
                    try {
                        await saveEntryState();
                    } catch {
                        
                        context.cache[name].entries[e.uid].disable = prevDisabled;
                        applyEnabledIcon(prevDisabled);
                        toastr.error('Failed to save entry state. Changes were not persisted.');
                    } finally {
                        isSavingState = false;
                        isEnabled.disabled = false;
                    }
                });
                status.append(isEnabled);
            }
            const stratTemplate = document.querySelector('#entry_edit_template [name="entryStateSelector"]');
            const strat = (stratTemplate?.cloneNode(true));
            
            if (strat) {
                world.dom.entry[e.uid].strategy = strat;
                strat.classList.add('stwid--strategy');
                strat.title = 'Entry strategy';
                strat.setAttribute('aria-label', 'Entry strategy');
                strat.value = entryState(e);
                strat.addEventListener('change', async()=>{
                    
                    if (isSavingState) return;
                    
                    const prevConstant = context.cache[name].entries[e.uid].constant;
                    const prevVectorized = context.cache[name].entries[e.uid].vectorized;
                    const value = strat.value;
                    switch (value) {
                        case 'constant': {
                            context.cache[name].entries[e.uid].constant = true;
                            context.cache[name].entries[e.uid].vectorized = false;
                            break;
                        }
                        case 'normal': {
                            context.cache[name].entries[e.uid].constant = false;
                            context.cache[name].entries[e.uid].vectorized = false;
                            break;
                        }
                        case 'vectorized': {
                            context.cache[name].entries[e.uid].constant = false;
                            context.cache[name].entries[e.uid].vectorized = true;
                            break;
                        }
                    }
                    isSavingState = true;
                    strat.disabled = true;
                    try {
                        await saveEntryState();
                    } catch {
                        
                        context.cache[name].entries[e.uid].constant = prevConstant;
                        context.cache[name].entries[e.uid].vectorized = prevVectorized;
                        strat.value = entryState({ constant: prevConstant, vectorized: prevVectorized });
                        toastr.error('Failed to save entry strategy. Changes were not persisted.');
                    } finally {
                        isSavingState = false;
                        strat.disabled = false;
                    }
                });
                status.append(strat);
            }
            entry.append(status);
        }
        const actions = document.createElement('div'); {
            actions.classList.add('stwid--actions');
            entry.append(actions);
        }
        
        let clickToken;
        entry.addEventListener('click', async(evt)=>{
            const token = context.uuidv4();
            clickToken = token;
            await context.editorPanel.openEntryEditor({
                entry: e,
                entryDom: entry,
                name,
                isTokenCurrent: () => clickToken === token,
            });
        });

        
        
        
        
        entry.addEventListener('pointerdown', (evt)=>{
            if (evt.button !== 0) return; 
            if (context.selectFrom !== name) return;
            if (!context.selectList?.includes?.(rowUid)) return;
            
            
            entry.setAttribute('draggable', 'true');
        });

        if (before) before.insertAdjacentElement('beforebegin', entry);
        else world.dom.entryList.append(entry);
        return entry;
    }
};
