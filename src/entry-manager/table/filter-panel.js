
export function buildFilterPanel({
    dom,
    entryManagerState,
    getEntryManagerEntries,
    setEntryManagerRowFilterState,
    SlashCommandParser,
    debounce,
    hljs,
    isTrueBoolean,
}) {
    const filter = document.createElement('div');
    dom.order.filter.root = filter;
    filter.classList.add('stwid--script-filter');

    const main = document.createElement('div'); {
        main.classList.add('stwid--main');
        const hint = document.createElement('div'); {
            hint.classList.add('stwid--hint');
            const bookContextHint = entryManagerState.book
                ? `<br>Book context: <code>${entryManagerState.book}</code> (entries are scoped to this book).`
                : '';
            hint.innerHTML = DOMPurify.sanitize(`
                Script will be called for each entry in all active books.
                Every entry for which the script returns <code>true</code> will be kept.
                Other entries will be filtered out.
                <br>
                Use <code>{{var::entry}}</code> to access the entry and its properties (look
                right for available fields).
                ${bookContextHint}
            `);
            main.append(hint);
        }

        
        
        
        const errorEl = document.createElement('div');
        errorEl.classList.add('stwid--orderFilterError');
        errorEl.hidden = true;
        main.append(errorEl);

        const script = document.createElement('div'); {
            script.classList.add('stwid--script');
            const syntax = document.createElement('pre'); {
                syntax.classList.add('stwid--syntax');
                script.append(syntax);
            }
            const overlay = document.createElement('div'); {
                overlay.classList.add('stwid--overlay');
                script.append(overlay);
            }
            const inp = document.createElement('textarea'); {
                const defaultFilter = '{{var::entry}}';
                const orderFilterStorageKey = 'stwid--order-filter';
                const storedFilter = localStorage.getItem(orderFilterStorageKey);
                inp.classList.add('stwid--input');
                inp.classList.add('text_pole');
                inp.name = 'filter';
                inp.value = storedFilter ?? defaultFilter;

                
                if (storedFilter == null) {
                    localStorage.setItem(orderFilterStorageKey, inp.value);
                }

                
                
                
                
                let filterStack = [];

                const updateScroll = ()=>{
                    const scrollTop = inp.scrollTop;
                    syntax.scrollTop = scrollTop;
                };
                const updateScrollDebounced = debounce(()=>updateScroll(), 150);
                const updateHighlight = ()=>{
                    const scriptText = `${inp.value}${inp.value.slice(-1) == '\n' ? ' ' : ''}`;
                    syntax.innerHTML = DOMPurify.sanitize(hljs.highlight(scriptText, { language:'stscript', ignoreIllegals:true })?.value ?? '');
                };
                const updateHighlightDebounced = debounce(()=>updateHighlight(), 100);
                const saveFilterDebounced = debounce(()=>localStorage.setItem(orderFilterStorageKey, inp.value), 200);
                const isActive = ()=>dom.order.filter.root?.classList.contains('stwid--state-active');

                
                const showFilterError = (message)=>{
                    if (!message) {
                        errorEl.hidden = true;
                        errorEl.textContent = '';
                        return;
                    }
                    errorEl.hidden = false;
                    errorEl.textContent = message;
                };

                const updateList = async()=>{
                    if (!isActive()) return;

                    const closure = new (await SlashCommandParser.getScope())();
                    filterStack.push(closure);

                    const clone = inp.value;
                    const script = `return async function entryManagerFilter(data) {${clone}}();`;

                    try {
                        await closure.compile(script);
                        if (!isActive()) return;

                        const entries = getEntryManagerEntries(entryManagerState.book, true);

                        
                        
                        for (const e of entries) {
                            const row = dom.order.entries?.[e.book]?.[e.data.uid];
                            if (!row) continue;
                            setEntryManagerRowFilterState(row, 'stwidFilterScript', true);
                        }

                        for (const e of entries) {
                            if (!isActive()) return;
                            closure.scope.setVariable('entry', JSON.stringify(Object.assign({ book:e.book }, e.data)));
                            const result = (await closure.execute()).pipe;

                            
                            if (filterStack.at(-1) !== closure) {
                                return;
                            }

                            const row = dom.order.entries?.[e.book]?.[e.data.uid];
                            if (!row) continue;
                            setEntryManagerRowFilterState(row, 'stwidFilterScript', !isTrueBoolean(result));
                        }

                        showFilterError(null);
                    } catch (error) {
                        
                        
                        const msg = error instanceof Error ? error.message : String(error);
                        showFilterError(`Filter error: ${msg}`);
                    } finally {
                        const idx = filterStack.indexOf(closure);
                        if (idx !== -1) filterStack.splice(idx, 1);
                    }
                };
                const updateListDebounced = debounce(()=>updateList(), 1000);
                inp.addEventListener('input', () => {
                    saveFilterDebounced();
                    updateHighlightDebounced();
                    updateScrollDebounced();
                    updateListDebounced();
                });
                inp.addEventListener('scroll', ()=>{
                    updateScrollDebounced();
                });
                inp.style.color = 'transparent';
                inp.style.background = 'transparent';
                inp.style.setProperty('text-shadow', 'none', 'important');
                updateHighlight();
                script.append(inp);
            }
            main.append(script);
        }
        filter.append(main);
    }

    const preview = document.createElement('div'); {
        dom.order.filter.preview = preview;
        preview.classList.add('stwid--preview');
        filter.append(preview);
    }

    return filter;
}


