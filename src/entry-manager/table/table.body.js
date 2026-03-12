import { setTooltip, formatCharacterFilter } from '../entry-manager.utils.js';
import { ENTRY_MANAGER_RECURSION_OPTIONS } from '../../shared/constants.js';

const TEXT_POLE_CLASS = 'text_pole';
const STATE_FILTERED_CLASS = 'stwid--state-filtered';
const ORDER_INPUT_TIGHT_CLASS = 'stwid--orderInputTight';


function createBookSaveSerializer(saveWorldInfo, buildSavePayload) {
    
    const inFlightByBook = new Map();
    
    const pendingByBook = new Set();

    async function runSave(bookName) {
        do {
            pendingByBook.delete(bookName);
            try {
                await saveWorldInfo(bookName, buildSavePayload(bookName), true);
            } catch (err) {
                console.error('[WorldInfoDrawer] Entry Manager save failed for book:', bookName, err);
            }
        } while (pendingByBook.has(bookName));
        inFlightByBook.delete(bookName);
    }

    
    return async function enqueueSave(bookName) {
        if (inFlightByBook.has(bookName)) {
            pendingByBook.add(bookName);
            await inFlightByBook.get(bookName);
        } else {
            const p = runSave(bookName);
            inFlightByBook.set(bookName, p);
            await p;
        }
    };
}


function buildNumberInputCell({ col, name, tooltip, max = '99999', getValue, onSave }) {
    const td = document.createElement('td');
    td.setAttribute('data-col', col);
    td.classList.add('stwid--orderTable--NumberColumns');
    const inputEl = document.createElement('input');
    inputEl.classList.add('stwid--input', TEXT_POLE_CLASS);
    inputEl.name = name;
    setTooltip(inputEl, tooltip);
    inputEl.min = '0';
    inputEl.max = max;
    inputEl.type = 'number';
    inputEl.value = getValue() ?? '';
    inputEl.addEventListener('change', async()=>{
        const value = parseInt(inputEl.value);
        await onSave(Number.isFinite(value) ? value : undefined);
    });
    td.append(inputEl);
    return td;
}

function buildTextInput({ name, tooltip, getValue, onChange }) {
    const inputEl = document.createElement('input');
    inputEl.classList.add('stwid--input', TEXT_POLE_CLASS, ORDER_INPUT_TIGHT_CLASS);
    inputEl.name = name;
    setTooltip(inputEl, tooltip);
    inputEl.type = 'text';
    inputEl.value = getValue() ?? '';
    inputEl.addEventListener('change', async()=>{
        await onChange(inputEl.value);
    });
    return inputEl;
}

function getEntryEditTemplates() {
    const entryEditTemplate = document.querySelector('#entry_edit_template');
    const enabledToggleTemplate = entryEditTemplate?.querySelector('[name="entryKillSwitch"]');
    const strategyTemplate = entryEditTemplate?.querySelector('[name="entryStateSelector"]');
    const positionTemplate = entryEditTemplate?.querySelector('[name="position"]');
    if (!enabledToggleTemplate || !strategyTemplate || !positionTemplate) {
        throw new Error('[WorldInfoDrawer] Missing entry edit template controls for Entry Manager render.');
    }
    return { enabledToggleTemplate, strategyTemplate, positionTemplate };
}

function buildMoveButton({ iconClass, tooltipText }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('stwid--orderMoveButton');
    setTooltip(button, tooltipText);
    const icon = document.createElement('i');
    icon.classList.add('fa-solid', 'fa-fw', iconClass);
    button.append(icon);
    return button;
}

function moveRowAndSyncCustomOrder({ row, direction, mode, dom, getVisibleEntryManagerRows, updateCustomOrderFromDom }) {
    const visibleRows = getVisibleEntryManagerRows();
    if (!visibleRows.length || row.classList.contains(STATE_FILTERED_CLASS)) return;

    let targetRow;
    if (mode === 'jump') {
        targetRow = direction === 'up'
            ? visibleRows[0]
            : visibleRows[visibleRows.length - 1];
        if (!targetRow || targetRow === row) return;
    } else {
        const index = visibleRows.indexOf(row);
        if (index === -1) return;
        targetRow = direction === 'up'
            ? visibleRows[index - 1]
            : visibleRows[index + 1];
        if (!targetRow) return;
    }

    if (direction === 'up') {
        dom.order.tbody.insertBefore(row, targetRow);
    } else {
        targetRow.insertAdjacentElement('afterend', row);
    }
    void updateCustomOrderFromDom();
}

function moveRowByOneStepInFilteredList({ row, direction, dom, getVisibleEntryManagerRows, updateCustomOrderFromDom }) {
    moveRowAndSyncCustomOrder({
        row,
        direction,
        mode: 'step',
        dom,
        getVisibleEntryManagerRows,
        updateCustomOrderFromDom,
    });
}

function createMoveButton({
    row,
    direction,
    iconClass,
    title,
    jumpTitle,
    dom,
    getVisibleEntryManagerRows,
    updateCustomOrderFromDom,
}) {
    const button = buildMoveButton({
        iconClass,
        tooltipText: `${title}. Double-click to jump to ${jumpTitle}`,
    });
    let clickTimer;
    button.addEventListener('click', (event)=>{
        event.preventDefault();
        event.stopPropagation();
        if (clickTimer) {
            window.clearTimeout(clickTimer);
        }
        clickTimer = window.setTimeout(()=>{
            moveRowByOneStepInFilteredList({
                row,
                direction,
                dom,
                getVisibleEntryManagerRows,
                updateCustomOrderFromDom,
            });
        }, 250);
    });
    button.addEventListener('dblclick', (event)=>{
        event.preventDefault();
        event.stopPropagation();
        if (clickTimer) {
            window.clearTimeout(clickTimer);
            clickTimer = null;
        }
        moveRowAndSyncCustomOrder({
            row,
            direction,
            mode: 'jump',
            dom,
            getVisibleEntryManagerRows,
            updateCustomOrderFromDom,
        });
    });
    return button;
}

function setupEntryManagerSorting({
    tbody,
    dom,
    cache,
    enqueueSave,
    setEntryManagerSort,
    SORT,
    SORT_DIRECTION,
    getSortableDelay,
    $,
    getEntryManagerRows,
}) {
    const getVisibleEntryManagerRows = ()=> {
        const rows = getEntryManagerRows();
        return rows.filter((row)=>!row.classList.contains(STATE_FILTERED_CLASS));
    };

    const updateCustomOrderFromDom = async()=> {
        if (!dom.order.tbody) return;
        setEntryManagerSort(SORT.CUSTOM, SORT_DIRECTION.ASCENDING);
        const rows = [...dom.order.tbody.querySelectorAll('tr')];
        const booksUpdated = new Set();
        const nextIndexByBook = new Map();
        for (const row of rows) {
            const bookName = row.getAttribute('data-book');
            const uid = row.getAttribute('data-uid');
            if (!bookName || !uid) continue;
            if (!cache[bookName]?.entries) continue;
            const entry = cache[bookName].entries[uid];
            if (!entry) continue;
            const nextIndex = nextIndexByBook.get(bookName) ?? 0;
            entry.extensions ??= {};
            if (entry.extensions.display_index !== nextIndex) {
                entry.extensions.display_index = nextIndex;
                booksUpdated.add(bookName);
            }
            nextIndexByBook.set(bookName, nextIndex + 1);
        }
        for (const bookName of booksUpdated) {
            await enqueueSave(bookName);
        }
    };

    $(tbody).sortable({
        delay: getSortableDelay(),
        update: async()=> {
            await updateCustomOrderFromDom();
        },
    });

    return { getVisibleEntryManagerRows, updateCustomOrderFromDom };
}

function buildRecursionOptionRow({ entryRow, tr, key, label, cache, enqueueSave, applyEntryManagerRecursionFilterToRow }) {
    const row = document.createElement('label');
    row.classList.add('stwid--small-check-row');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.classList.add('checkbox');
    setTooltip(input, label);
    input.checked = Boolean(entryRow.data[key]);
    input.addEventListener('change', async()=> {
        const entryData = cache[entryRow.book].entries[entryRow.data.uid];
        entryData[key] = input.checked;
        entryRow.data[key] = input.checked;
        applyEntryManagerRecursionFilterToRow(tr, entryData);
        await enqueueSave(entryRow.book);
    });
    row.append(input, label);
    return row;
}

function buildEntryManagerRow({
    entryRow,
    dom,
    cache,
    enqueueSave,
    focusWorldEntry,
    isEntryManagerRowSelected,
    setEntryManagerRowSelected,
    updateEntryManagerSelectAllButton,
    refreshSelectionCount,
    applyEntryManagerStrategyFilterToRow,
    applyEntryManagerPositionFilterToRow,
    applyEntryManagerRecursionFilterToRow,
    syncEntryManagerOutletFilters,
    syncEntryManagerAutomationIdFilters,
    syncEntryManagerGroupFilters,
    refreshOutletFilterIndicator,
    refreshAutomationIdFilterIndicator,
    refreshGroupFilterIndicator,
    applyEntryManagerOutletFilters,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilters,
    isOutletPosition,
    entryState,
    enabledToggleTemplate,
    strategyTemplate,
    positionTemplate,
    getVisibleEntryManagerRows,
    updateCustomOrderFromDom,
}) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-book', entryRow.book);
    tr.setAttribute('data-uid', entryRow.data.uid);
    tr.dataset.stwidFilterStrategy = 'false';
    tr.dataset.stwidFilterPosition = 'false';
    tr.dataset.stwidFilterRecursion = 'false';
    tr.dataset.stwidFilterOutlet = 'false';
    tr.dataset.stwidFilterAutomationId = 'false';
    tr.dataset.stwidFilterGroup = 'false';
    tr.dataset.stwidFilterScript = 'false';

    if (!dom.order.entries[entryRow.book]) {
        dom.order.entries[entryRow.book] = {};
    }
    dom.order.entries[entryRow.book][entryRow.data.uid] = tr;

    const select = document.createElement('td');
    select.setAttribute('data-col', 'select');
    const selectButton = document.createElement('div');
    selectButton.classList.add('stwid--orderSelect', 'fa-solid', 'fa-fw');
    setTooltip(selectButton, 'Include/exclude this row from Apply Order');
    const selectIcon = document.createElement('i');
    selectIcon.classList.add('fa-solid', 'fa-fw', 'stwid--icon');
    selectButton.append(selectIcon);
    selectButton.addEventListener('click', ()=>{
        setEntryManagerRowSelected(tr, !isEntryManagerRowSelected(tr));
        updateEntryManagerSelectAllButton();
        refreshSelectionCount?.();
    });
    select.append(selectButton);
    tr.append(select);

    const handle = document.createElement('td');
    handle.setAttribute('data-col', 'drag');
    const controls = document.createElement('div');
    controls.classList.add('stwid--orderMove');
    const upButton = createMoveButton({
        row: tr,
        direction: 'up',
        iconClass: 'fa-caret-up',
        title: 'Move up',
        jumpTitle: 'the top of the filtered list',
        dom,
        getVisibleEntryManagerRows,
        updateCustomOrderFromDom,
    });
    const downButton = createMoveButton({
        row: tr,
        direction: 'down',
        iconClass: 'fa-caret-down',
        title: 'Move down',
        jumpTitle: 'the bottom of the filtered list',
        dom,
        getVisibleEntryManagerRows,
        updateCustomOrderFromDom,
    });
    const dragHandle = document.createElement('div');
    dragHandle.classList.add('stwid--sortableHandle', 'fa-solid', 'fa-fw', 'fa-grip-lines');
    setTooltip(dragHandle, 'Drag to reorder rows');
    controls.append(upButton, dragHandle, downButton);
    handle.append(controls);
    tr.append(handle);

    const active = document.createElement('td');
    active.setAttribute('data-col', 'enabled');
    const enabledToggle = enabledToggleTemplate.cloneNode(true);
    enabledToggle.classList.add('stwid--enabled');
    setTooltip(enabledToggle, 'Enable/disable this entry');
    const applyEnabledIcon = (el, disabled)=>{
        el.classList.toggle('fa-toggle-off', Boolean(disabled));
        el.classList.toggle('fa-toggle-on', !Boolean(disabled));
    };
    applyEnabledIcon(enabledToggle, entryRow.data.disable);
    enabledToggle.addEventListener('click', async()=>{
        const entryData = cache[entryRow.book].entries[entryRow.data.uid];
        const nextDisabled = !entryData.disable;
        entryData.disable = nextDisabled;
        entryRow.data.disable = nextDisabled;
        applyEnabledIcon(enabledToggle, nextDisabled);
        const listToggle = cache[entryRow.book].dom.entry?.[entryRow.data.uid]?.isEnabled;
        if (listToggle) {
            applyEnabledIcon(listToggle, nextDisabled);
        }
        await enqueueSave(entryRow.book);
    });
    active.append(enabledToggle);
    tr.append(active);

    const entryCell = document.createElement('td');
    entryCell.setAttribute('data-col', 'entry');
    const entryCellWrap = document.createElement('div');
    entryCellWrap.classList.add('stwid--colwrap', 'stwid--entry');
    const bookLabel = document.createElement('div');
    bookLabel.classList.add('stwid--book');
    const bookIcon = document.createElement('i');
    bookIcon.classList.add('fa-solid', 'fa-fw', 'fa-book-atlas');
    bookLabel.append(bookIcon);
    const bookText = document.createElement('span');
    bookText.textContent = entryRow.book;
    bookLabel.append(bookText);
    entryCellWrap.append(bookLabel);
    const commentLink = document.createElement('a');
    commentLink.classList.add('stwid--comment', 'stwid--commentLink');
    commentLink.href = `#world_entry/${encodeURIComponent(entryRow.data.uid)}`;
    commentLink.textContent = entryRow.data.comment ?? '';
    commentLink.addEventListener('click', (evt)=>{
        evt.preventDefault();
        focusWorldEntry(entryRow.book, entryRow.data.uid);
    });
    entryCellWrap.append(commentLink);
    const key = document.createElement('div');
    key.classList.add('stwid--key');
    key.textContent = entryRow.data.key.join(', ');
    entryCellWrap.append(key);
    entryCell.append(entryCellWrap);
    tr.append(entryCell);

    const strategy = document.createElement('td');
    strategy.setAttribute('data-col', 'strategy');
    const strategySelect = strategyTemplate.cloneNode(true);
    strategySelect.classList.add('stwid--strategy', 'stwid--smallSelectTextPole');
    setTooltip(strategySelect, 'Entry strategy');
    strategySelect.value = entryState(entryRow.data);
    strategySelect.addEventListener('change', async()=>{
        const value = strategySelect.value;
        cache[entryRow.book].dom.entry[entryRow.data.uid].strategy.value = value;
        switch (value) {
            case 'constant':
                cache[entryRow.book].entries[entryRow.data.uid].constant = true;
                cache[entryRow.book].entries[entryRow.data.uid].vectorized = false;
                break;
            case 'normal':
                cache[entryRow.book].entries[entryRow.data.uid].constant = false;
                cache[entryRow.book].entries[entryRow.data.uid].vectorized = false;
                break;
            case 'vectorized':
                cache[entryRow.book].entries[entryRow.data.uid].constant = false;
                cache[entryRow.book].entries[entryRow.data.uid].vectorized = true;
                break;
        }
        applyEntryManagerStrategyFilterToRow(tr, cache[entryRow.book].entries[entryRow.data.uid]);
        await enqueueSave(entryRow.book);
    });
    strategy.append(strategySelect);
    tr.append(strategy);

    let updateOutlet;
    const positionSelect = positionTemplate.cloneNode(true);
    const position = document.createElement('td');
    position.setAttribute('data-col', 'position');
    cache[entryRow.book].dom.entry[entryRow.data.uid].position = positionSelect;
    positionSelect.classList.add('stwid--position', 'stwid--smallSelectTextPole');
    setTooltip(positionSelect, 'Where this entry is inserted');
    positionSelect.value = entryRow.data.position;
    positionSelect.addEventListener('change', async()=>{
        const value = positionSelect.value;
        cache[entryRow.book].dom.entry[entryRow.data.uid].position.value = value;
        cache[entryRow.book].entries[entryRow.data.uid].position = value;
        entryRow.data.position = value;
        applyEntryManagerPositionFilterToRow(tr, cache[entryRow.book].entries[entryRow.data.uid]);
        updateOutlet?.();
        await enqueueSave(entryRow.book);
    });
    position.append(positionSelect);
    tr.append(position);

    tr.append(buildNumberInputCell({
        col: 'depth',
        name: 'depth',
        tooltip: 'Entry depth',
        getValue: ()=>entryRow.data.depth,
        onSave: async (value)=> {
            cache[entryRow.book].entries[entryRow.data.uid].depth = value;
            await enqueueSave(entryRow.book);
        },
    }));

    const outlet = document.createElement('td');
    outlet.setAttribute('data-col', 'outlet');
    const outletWrap = document.createElement('div');
    outletWrap.classList.add('stwid--colwrap', 'stwid--outlet');
    const outletInput = buildTextInput({
        name: 'outletName',
        tooltip: 'Outlet name (used for outlet positions)',
        getValue: ()=>cache[entryRow.book].entries[entryRow.data.uid].outletName ?? entryRow.data.outletName ?? '',
        onChange: async (nextValue)=>{
            cache[entryRow.book].entries[entryRow.data.uid].outletName = nextValue;
            entryRow.data.outletName = nextValue;
            syncEntryManagerOutletFilters();
            refreshOutletFilterIndicator();
            applyEntryManagerOutletFilters();
            await enqueueSave(entryRow.book);
            updateOutlet?.();
        },
    });
    updateOutlet = ()=> {
        const entryData = cache[entryRow.book].entries[entryRow.data.uid];
        const currentPosition = entryData.position ?? positionSelect.value;
        const outletName = entryData.outletName ?? entryRow.data.outletName ?? '';
        outletInput.value = outletName;
        outletWrap.hidden = !isOutletPosition(currentPosition);
    };
    updateOutlet();
    outletWrap.append(outletInput);
    outlet.append(outletWrap);
    tr.append(outlet);

    const group = document.createElement('td');
    group.setAttribute('data-col', 'group');
    const groupWrap = document.createElement('div');
    groupWrap.classList.add('stwid--colwrap', 'stwid--outlet', 'stwid--recursionOptions');
    const groupInput = buildTextInput({
        name: 'group',
        tooltip: 'Inclusion group name',
        getValue: ()=>cache[entryRow.book].entries[entryRow.data.uid].group ?? '',
        onChange: async (nextValue)=>{
            const entryData = cache[entryRow.book].entries[entryRow.data.uid];
            entryData.group = nextValue;
            entryRow.data.group = nextValue;
            syncEntryManagerGroupFilters();
            refreshGroupFilterIndicator();
            applyEntryManagerGroupFilters();
            await enqueueSave(entryRow.book);
        },
    });
    groupWrap.append(groupInput, document.createElement('br'));
    const prioritizeRow = document.createElement('label');
    prioritizeRow.classList.add('stwid--small-check-row');
    const prioritizeInput = document.createElement('input');
    prioritizeInput.type = 'checkbox';
    prioritizeInput.classList.add('checkbox');
    setTooltip(prioritizeInput, 'Prioritize this entry within its inclusion group');
    prioritizeInput.checked = Boolean(entryRow.data.groupOverride);
    prioritizeInput.addEventListener('change', async()=>{
        const entryData = cache[entryRow.book].entries[entryRow.data.uid];
        entryData.groupOverride = prioritizeInput.checked;
        entryRow.data.groupOverride = prioritizeInput.checked;
        await enqueueSave(entryRow.book);
    });
    prioritizeRow.append(prioritizeInput, 'Prioritize');
    groupWrap.append(prioritizeRow);
    group.append(groupWrap);
    tr.append(group);

    tr.append(buildNumberInputCell({
        col: 'order',
        name: 'order',
        tooltip: 'Order value',
        getValue: ()=>entryRow.data.order,
        onSave: async (value)=> {
            cache[entryRow.book].entries[entryRow.data.uid].order = value;
            await enqueueSave(entryRow.book);
        },
    }));
    tr.append(buildNumberInputCell({
        col: 'sticky',
        name: 'sticky',
        tooltip: 'Sticky duration',
        getValue: ()=>entryRow.data.sticky,
        onSave: async (value)=> {
            cache[entryRow.book].entries[entryRow.data.uid].sticky = value;
            await enqueueSave(entryRow.book);
        },
    }));
    tr.append(buildNumberInputCell({
        col: 'cooldown',
        name: 'cooldown',
        tooltip: 'Cooldown duration',
        getValue: ()=>entryRow.data.cooldown,
        onSave: async (value)=> {
            cache[entryRow.book].entries[entryRow.data.uid].cooldown = value;
            await enqueueSave(entryRow.book);
        },
    }));
    tr.append(buildNumberInputCell({
        col: 'delay',
        name: 'delay',
        tooltip: 'Delay before activation',
        getValue: ()=>entryRow.data.delay,
        onSave: async (value)=> {
            cache[entryRow.book].entries[entryRow.data.uid].delay = value;
            await enqueueSave(entryRow.book);
        },
    }));

    const automationId = document.createElement('td');
    automationId.setAttribute('data-col', 'automationId');
    automationId.classList.add('stwid--orderTable--NumberColumns');
    const automationIdInput = buildTextInput({
        name: 'automationId',
        tooltip: 'Automation ID',
        getValue: ()=>cache[entryRow.book].entries[entryRow.data.uid].automationId ?? entryRow.data.automationId ?? '',
        onChange: async (nextValue)=>{
            cache[entryRow.book].entries[entryRow.data.uid].automationId = nextValue;
            entryRow.data.automationId = nextValue;
            syncEntryManagerAutomationIdFilters();
            refreshAutomationIdFilterIndicator();
            applyEntryManagerAutomationIdFilters();
            await enqueueSave(entryRow.book);
        },
    });
    automationId.append(automationIdInput);
    tr.append(automationId);

    tr.append(buildNumberInputCell({
        col: 'trigger',
        name: 'selective_probability',
        tooltip: 'Trigger chance percentage',
        max: '100',
        getValue: ()=>entryRow.data.selective_probability,
        onSave: async (value)=> {
            cache[entryRow.book].entries[entryRow.data.uid].selective_probability = value;
            await enqueueSave(entryRow.book);
        },
    }));

    const recursion = document.createElement('td');
    recursion.setAttribute('data-col', 'recursion');
    const recursionWrap = document.createElement('div');
    recursionWrap.classList.add('stwid--recursionOptions');
    for (const { value, label } of ENTRY_MANAGER_RECURSION_OPTIONS) {
        recursionWrap.append(buildRecursionOptionRow({
            entryRow,
            tr,
            key: value,
            label,
            cache,
            enqueueSave,
            applyEntryManagerRecursionFilterToRow,
        }));
    }
    recursion.append(recursionWrap);
    tr.append(recursion);

    const budget = document.createElement('td');
    budget.setAttribute('data-col', 'budget');
    const budgetWrap = document.createElement('div');
    budgetWrap.classList.add('stwid--recursionOptions');
    const budgetRow = document.createElement('label');
    budgetRow.classList.add('stwid--small-check-row');
    const budgetInput = document.createElement('input');
    budgetInput.type = 'checkbox';
    budgetInput.classList.add('checkbox');
    setTooltip(budgetInput, 'Ignore World Info budget limit for this entry');
    budgetInput.checked = Boolean(entryRow.data.ignoreBudget);
    budgetInput.addEventListener('change', async()=> {
        const entryData = cache[entryRow.book].entries[entryRow.data.uid];
        entryData.ignoreBudget = budgetInput.checked;
        entryRow.data.ignoreBudget = budgetInput.checked;
        await enqueueSave(entryRow.book);
    });
    budgetRow.append(budgetInput, 'Ignore budget');
    budgetWrap.append(budgetRow);
    budget.append(budgetWrap);
    tr.append(budget);

    const characterFilter = document.createElement('td');
    characterFilter.setAttribute('data-col', 'characterFilter');
    const characterFilterWrap = document.createElement('div');
    characterFilterWrap.classList.add('stwid--colwrap', 'stwid--characterFilterOptions');
    const lines = formatCharacterFilter(entryRow.data);
    if (!lines.length) {
        characterFilterWrap.textContent = '';
    } else {
        for (const line of lines) {
            const row = document.createElement('div');
            row.classList.add('stwid--characterFilterRow', `stwid--characterFilterRow--${line.mode}`);
            const icon = document.createElement('i');
            icon.classList.add('fa-solid', 'fa-fw', line.icon);
            const text = document.createElement('span');
            text.textContent = line.label;
            row.append(icon, text);
            characterFilterWrap.append(row);
        }
    }
    characterFilter.append(characterFilterWrap);
    tr.append(characterFilter);

    setEntryManagerRowSelected(tr, true);
    return tr;
}


export function buildTableBody({
    entries,
    dom,
    cache,
    refreshOutletFilterIndicator,
    refreshAutomationIdFilterIndicator,
    refreshGroupFilterIndicator,
    isOutletPosition,
    saveWorldInfo,
    buildSavePayload,
    focusWorldEntry,
    isEntryManagerRowSelected,
    setEntryManagerRowSelected,
    updateEntryManagerSelectAllButton,
    refreshSelectionCount,
    applyEntryManagerStrategyFilterToRow,
    applyEntryManagerPositionFilterToRow,
    applyEntryManagerRecursionFilterToRow,
    applyEntryManagerStrategyFilters,
    applyEntryManagerRecursionFilters,
    applyEntryManagerOutletFilters,
    applyEntryManagerAutomationIdFilters,
    applyEntryManagerGroupFilters,
    syncEntryManagerOutletFilters,
    syncEntryManagerAutomationIdFilters,
    syncEntryManagerGroupFilters,
    entryState,
    getEntryManagerRows,
    setEntryManagerSort,
    SORT,
    SORT_DIRECTION,
    getSortableDelay,
    $,
}) {
    const tbody = document.createElement('tbody');
    dom.order.tbody = tbody;

    const enqueueSave = createBookSaveSerializer(saveWorldInfo, buildSavePayload);
    const { enabledToggleTemplate, strategyTemplate, positionTemplate } = getEntryEditTemplates();
    const { getVisibleEntryManagerRows, updateCustomOrderFromDom } = setupEntryManagerSorting({
        tbody,
        dom,
        cache,
        enqueueSave,
        setEntryManagerSort,
        SORT,
        SORT_DIRECTION,
        getSortableDelay,
        $,
        getEntryManagerRows,
    });

    for (const entryRow of entries) {
        tbody.append(buildEntryManagerRow({
            entryRow,
            dom,
            cache,
            enqueueSave,
            focusWorldEntry,
            isEntryManagerRowSelected,
            setEntryManagerRowSelected,
            updateEntryManagerSelectAllButton,
            refreshSelectionCount,
            applyEntryManagerStrategyFilterToRow,
            applyEntryManagerPositionFilterToRow,
            applyEntryManagerRecursionFilterToRow,
            syncEntryManagerOutletFilters,
            syncEntryManagerAutomationIdFilters,
            syncEntryManagerGroupFilters,
            refreshOutletFilterIndicator,
            refreshAutomationIdFilterIndicator,
            refreshGroupFilterIndicator,
            applyEntryManagerOutletFilters,
            applyEntryManagerAutomationIdFilters,
            applyEntryManagerGroupFilters,
            isOutletPosition,
            entryState,
            enabledToggleTemplate,
            strategyTemplate,
            positionTemplate,
            getVisibleEntryManagerRows,
            updateCustomOrderFromDom,
        }));
    }

    applyEntryManagerStrategyFilters();
    applyEntryManagerRecursionFilters();
    applyEntryManagerOutletFilters();
    applyEntryManagerAutomationIdFilters();
    applyEntryManagerGroupFilters();
    updateEntryManagerSelectAllButton();

    return tbody;
}

