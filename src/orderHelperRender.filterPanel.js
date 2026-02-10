/**
 * Builds the Order Helper script-filter panel DOM element.
 *
 * @param {{
 *   dom: object,
 *   orderHelperState: object,
 *   getOrderHelperEntries: function,
 *   setOrderHelperRowFilterState: function,
 *   SlashCommandParser: object,
 *   debounce: function,
 *   hljs: object,
 *   isTrueBoolean: function,
 * }} ctx
 * @returns {HTMLElement} The filter panel element to append to the body container.
 */
export function buildFilterPanel({
    dom,
    orderHelperState,
    getOrderHelperEntries,
    setOrderHelperRowFilterState,
    SlashCommandParser,
    debounce,
    hljs,
    isTrueBoolean,
}) {
    const filter = document.createElement('div');
    dom.order.filter.root = filter;
    filter.classList.add('stwid--filter');

    const main = document.createElement('div'); {
        main.classList.add('stwid--main');
        const hint = document.createElement('div'); {
            hint.classList.add('stwid--hint');
            const bookContextHint = orderHelperState.book
                ? `<br>Book context: <code>${orderHelperState.book}</code> (entries are scoped to this book).`
                : '';
            hint.innerHTML = `
                Script will be called for each entry in all active books.
                Every entry for which the script returns <code>true</code> will be kept.
                Other entries will be filtered out.
                <br>
                Use <code>{{var::entry}}</code> to access the entry and its properties (look
                right for available fields).
                ${bookContextHint}
            `;
            main.append(hint);
        }

        // Phase 3: errorEl lives outside the inp block for clearer reading order.
        // It is appended here so it appears between the hint and the script editor.
        // showFilterError (defined inside the inp block) holds a reference to it.
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
                inp.classList.add('stwid--input');
                inp.classList.add('text_pole');
                inp.name = 'filter';
                inp.value = localStorage.getItem('stwid--order-filter') ?? defaultFilter;

                // Phase 2: filterStack prevents stale async results from overwriting the UI.
                // Each compile run pushes its closure; when a newer run starts before this
                // one finishes, the old one checks filterStack.at(-1) !== closure and exits
                // early without touching row state.
                let filterStack = [];

                const updateScroll = ()=>{
                    const scrollTop = inp.scrollTop;
                    syntax.scrollTop = scrollTop;
                };
                const updateScrollDebounced = debounce(()=>updateScroll(), 150);

                // Show filter compile/runtime errors inline (non-toastr) to avoid spam.
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
                    if (!dom.order.filter.root.classList.contains('stwid--active')) return;

                    const closure = new (await SlashCommandParser.getScope())();
                    filterStack.push(closure);

                    const clone = inp.value;
                    const script = `return async function orderHelperFilter(data) {${clone}}();`;

                    try {
                        await closure.compile(script);

                        const entries = getOrderHelperEntries(orderHelperState.book, true);

                        // Start optimistic: mark all rows as "kept" by the script, then flip to filtered
                        // when the script result is not truthy.
                        for (const e of entries) {
                            const row = dom.order.entries[e.book][e.data.uid];
                            setOrderHelperRowFilterState(row, 'stwidFilterScript', true);
                        }

                        for (const e of entries) {
                            closure.scope.setVariable('entry', JSON.stringify(Object.assign({ book:e.book }, e.data)));
                            const result = (await closure.execute()).pipe;

                            // If a newer closure was queued, abort without touching UI further.
                            if (filterStack.at(-1) !== closure) {
                                return;
                            }

                            const row = dom.order.entries[e.book][e.data.uid];
                            setOrderHelperRowFilterState(row, 'stwidFilterScript', !isTrueBoolean(result));
                        }

                        showFilterError(null);
                    } catch (error) {
                        // Keep previous filter results (avoid "everything" flipping due to transient errors)
                        // and surface the error to the user.
                        const msg = error instanceof Error ? error.message : String(error);
                        showFilterError(`Filter error: ${msg}`);
                    } finally {
                        const idx = filterStack.indexOf(closure);
                        if (idx !== -1) filterStack.splice(idx, 1);
                    }
                };
                const updateListDebounced = debounce(()=>updateList(), 1000);
                inp.addEventListener('input', () => {
                    syntax.innerHTML = hljs.highlight(`${inp.value}${inp.value.slice(-1) == '\n' ? ' ' : ''}`, { language:'stscript', ignoreIllegals:true })?.value;
                    updateScrollDebounced();
                    updateListDebounced();
                });
                inp.addEventListener('scroll', ()=>{
                    updateScrollDebounced();
                });
                inp.style.color = 'transparent';
                inp.style.background = 'transparent';
                inp.style.setProperty('text-shadow', 'none', 'important');
                syntax.innerHTML = hljs.highlight(`${inp.value}${inp.value.slice(-1) == '\n' ? ' ' : ''}`, { language:'stscript', ignoreIllegals:true })?.value;
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
