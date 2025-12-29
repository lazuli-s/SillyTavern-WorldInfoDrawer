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
    world.dom.entry[e.uid] = {};
    const entry = document.createElement('div'); {
        world.dom.entry[e.uid].root = entry;
        entry.classList.add('stwid--entry');
        entry.dataset.uid = e.uid;
        entry.addEventListener('selectstart', (evt)=>evt.preventDefault());
        entry.addEventListener('dragstart', (evt)=>{
            if (context.selectFrom === null || !context.selectList.includes(e)) {
                evt.preventDefault();
                return;
            }
            context.dom.books.classList.add('stwid--isDragging');
            evt.dataTransfer.setData('text/plain', entry.textContent);
        });
        const sel = document.createElement('div'); {
            sel.classList.add('stwid--selector');
            sel.title = 'Click to select entry';
            sel.addEventListener('click', (evt)=>{
                evt.preventDefault();
                // can only select from one book at a time
                if (context.selectFrom !== null && context.selectFrom != name) return;
                evt.stopPropagation();
                if (context.selectLast && evt.shiftKey) {
                    // range-select from last clicked entry
                    const start = [...world.dom.entryList.children].indexOf(context.selectLast);
                    const end = [...world.dom.entryList.children].indexOf(entry);
                    for (let i = Math.min(start, end); i <= end; i++) {
                        const el = world.dom.entryList.children[i];
                        const data = world.entries[el.dataset.uid];
                        if (!context.selectList.includes(data)) {
                            context.selectAdd(el);
                            context.selectList.push(data);
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
                    // regular single select
                    if (context.selectList.includes(e)) {
                        context.selectRemove(entry);
                        context.selectList.splice(context.selectList.indexOf(e), 1);
                        if (context.selectLast == entry) context.selectLast = null;
                        if (context.selectList.length == 0) {
                            context.selectEnd();
                        }
                    } else {
                        context.selectAdd(entry);
                        context.selectList.push(e);
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
                if (context.currentEditor?.name != name || context.currentEditor?.uid != e.uid) evt.stopPropagation();
            });
            const isEnabled = /**@type {HTMLSelectElement}*/(document.querySelector('#entry_edit_template [name="entryKillSwitch"]').cloneNode(true)); {
                world.dom.entry[e.uid].isEnabled = isEnabled;
                isEnabled.classList.add('stwid--enabled');
                if (e.disable) {
                    isEnabled.classList.toggle('fa-toggle-off');
                    isEnabled.classList.toggle('fa-toggle-on');
                }
                isEnabled.addEventListener('click', async()=>{
                    const dis = isEnabled.classList.toggle('fa-toggle-off');
                    isEnabled.classList.toggle('fa-toggle-on');
                    context.cache[name].entries[e.uid].disable = dis;
                    await context.saveWorldInfo(name, context.buildSavePayload(name), true);
                });
                status.append(isEnabled);
            }
            const strat = /**@type {HTMLSelectElement}*/(document.querySelector('#entry_edit_template [name="entryStateSelector"]').cloneNode(true)); {
                world.dom.entry[e.uid].strategy = strat;
                strat.classList.add('stwid--strategy');
                strat.value = entryState(e);
                strat.addEventListener('change', async()=>{
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
                    await context.saveWorldInfo(name, context.buildSavePayload(name), true);
                });
                status.append(strat);
            }
            entry.append(status);
        }
        const actions = document.createElement('div'); {
            actions.classList.add('stwid--actions');
            entry.append(actions);
        }
        /**@type {string} */
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
        if (before) before.insertAdjacentElement('beforebegin', entry);
        else world.dom.entryList.append(entry);
        return entry;
    }
};
