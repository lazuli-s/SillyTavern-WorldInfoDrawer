import {
    MULTISELECT_DROPDOWN_CLOSE_HANDLER,
    closeOpenMultiselectDropdownMenus,
    setTooltip,
} from '../utils.js';
import {
    APPLY_DIRTY_CLASS,
    createLabeledBulkContainer,
    createApplyButton,
    getSafeTbodyRows,
    getBulkTargets,
    saveUpdatedBooks,
} from './bulk-edit-row.helpers.js';

export function buildBulkPositionSection({
    dom,
    cache,
    isOrderHelperRowSelected,
    saveWorldInfo,
    buildSavePayload,
    getPositionOptions,
    applyOrderHelperPositionFilterToRow,
    isOutletPosition,
    getOutletOptions,
    applyOrderHelperOutletFilterToRow,
    syncOrderHelperOutletFilters,
    filterIndicatorRefs,
    applyRegistry,
}) {
    const positionContainer = createLabeledBulkContainer(
        'position',
        'Position',
        'Choose a position and apply it to all selected entries at once.',
    );

    const positionSelect = document.createElement('select');
    positionSelect.classList.add('stwid--input', 'text_pole', 'stwid--smallSelectTextPole');
    setTooltip(positionSelect, 'Position to apply to selected entries');
    for (const opt of getPositionOptions()) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        positionSelect.append(option);
    }
    const storedPosition = localStorage.getItem('stwid--bulk-position-value');
    if (storedPosition && [...positionSelect.options].some((opt)=>opt.value === storedPosition)) {
        positionSelect.value = storedPosition;
    }
    positionSelect.addEventListener('change', ()=>{
        localStorage.setItem('stwid--bulk-position-value', positionSelect.value);
    });
    positionContainer.append(positionSelect);

    const runApplyPosition = async () => {
        const value = positionSelect.value;
        if (!value) {
            toastr.warning('No position selected.');
            return;
        }
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();
        for (const { tr, bookName, uid, entryData } of targets) {
            books.add(bookName);
            entryData.position = value;
            const domPos = cache?.[bookName]?.dom?.entry?.[uid]?.position;
            if (domPos) domPos.value = value;
            applyOrderHelperPositionFilterToRow(tr, entryData);
        }
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyPosition.classList.remove(APPLY_DIRTY_CLASS);
    };
    const applyPosition = createApplyButton(
        'Apply selected position to all selected entries',
        runApplyPosition,
        applyRegistry,
    );
    positionSelect.addEventListener('change', () => applyPosition.classList.add(APPLY_DIRTY_CLASS));
    positionContainer.append(applyPosition);

    const depthContainer = createLabeledBulkContainer(
        'depth',
        'Depth',
        'Apply a Depth value to all selected entries at once. Depth controls how many messages back from the latest the trigger check looks (0 = last message). Leave blank to clear depth.',
    );

    const depthInput = document.createElement('input');
    depthInput.classList.add('stwid-compactInput', 'text_pole');
    depthInput.type = 'number';
    depthInput.min = '0';
    depthInput.max = '99999';
    depthInput.placeholder = '';
    setTooltip(depthInput, 'Depth value to apply to selected entries');
    const storedDepth = localStorage.getItem('stwid--bulk-depth-value');
    if (storedDepth !== null) depthInput.value = storedDepth;
    depthInput.addEventListener('change', ()=>{
        localStorage.setItem('stwid--bulk-depth-value', depthInput.value);
    });
    depthContainer.append(depthInput);

    const runApplyDepth = async () => {
        const rawValue = depthInput.value.trim();
        const parsedDepth = rawValue === '' ? undefined : parseInt(rawValue, 10);
        if (rawValue !== '' && (!Number.isInteger(parsedDepth) || parsedDepth < 0)) {
            toastr.warning('Depth must be a non-negative whole number, or blank to clear.');
            return;
        }
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();
        for (const { tr, bookName, entryData } of targets) {
            books.add(bookName);
            entryData.depth = parsedDepth;
            const rowDepth = tr.querySelector('[name="depth"]');
            if (rowDepth) rowDepth.value = parsedDepth !== undefined ? String(parsedDepth) : '';
        }
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyDepth.classList.remove(APPLY_DIRTY_CLASS);
    };
    const applyDepth = createApplyButton(
        'Apply depth value to all selected entries',
        runApplyDepth,
        applyRegistry,
    );
    depthInput.addEventListener('change', () => applyDepth.classList.add(APPLY_DIRTY_CLASS));
    depthContainer.append(applyDepth);

    const applyDepthContainerState = ()=>{
        const isDepth = positionSelect.value === '4';
        depthContainer.classList.toggle('stwid--state-disabled', !isDepth);
        depthInput.disabled = !isDepth;
    };
    positionSelect.addEventListener('change', applyDepthContainerState);
    applyDepthContainerState();

    const outletContainer = createLabeledBulkContainer(
        'outlet',
        'Outlet',
        'Apply an Outlet name to all selected entries at once. Only interactable when Position is set to Outlet.',
    );

    const outletDropdownWrap = document.createElement('div');
    outletDropdownWrap.classList.add('stwid--multiselectDropdownWrap');

    const outletInput = document.createElement('input');
    outletInput.classList.add('stwid--input', 'text_pole');
    outletInput.type = 'text';
    outletInput.placeholder = '(none)';
    setTooltip(outletInput, 'Outlet name to apply to selected entries');
    const storedOutlet = localStorage.getItem('stwid--bulk-outlet-value');
    if (storedOutlet !== null) outletInput.value = storedOutlet;

    const outletMenu = document.createElement('div');
    outletMenu.classList.add('stwid--multiselectDropdownMenu', 'stwid--menu');

    const buildOutletMenuOptions = ()=>{
        outletMenu.innerHTML = '';
        const filter = outletInput.value.toLowerCase();
        const allOptions = getOutletOptions();
        const visible = filter ? allOptions.filter((opt)=>opt.value.toLowerCase().includes(filter)) : allOptions;
        for (const opt of visible) {
            const optEl = document.createElement('div');
            optEl.classList.add('stwid--multiselectDropdownOption', 'stwid--menuItem');
            optEl.textContent = opt.value;
            if (opt.value === outletInput.value) optEl.classList.add('stwid--state-active');
            optEl.addEventListener('mousedown', (e)=>{
                e.preventDefault();
                outletInput.value = opt.value;
                localStorage.setItem('stwid--bulk-outlet-value', outletInput.value);
                closeOutletMenu();
            });
            outletMenu.append(optEl);
        }
    };
    const closeOutletMenu = ()=>{
        if (!outletMenu.classList.contains('stwid--state-active')) return;
        outletMenu.classList.remove('stwid--state-active');
        document.removeEventListener('click', handleOutletOutsideClick);
    };
    const openOutletMenu = ()=>{
        if (outletMenu.classList.contains('stwid--state-active')) return;
        closeOpenMultiselectDropdownMenus(outletMenu);
        outletMenu.classList.add('stwid--state-active');
        document.addEventListener('click', handleOutletOutsideClick);
    };
    const handleOutletOutsideClick = (event)=>{
        if (outletDropdownWrap.contains(event.target)) return;
        closeOutletMenu();
    };
    const cleanup = ()=>{
        closeOutletMenu();
        document.removeEventListener('click', handleOutletOutsideClick);
    };
    outletMenu[MULTISELECT_DROPDOWN_CLOSE_HANDLER] = closeOutletMenu;
    outletMenu.addEventListener('click', (event)=>event.stopPropagation());

    outletInput.addEventListener('focus', ()=>{
        buildOutletMenuOptions();
        if (outletMenu.children.length > 0) openOutletMenu();
    });
    outletInput.addEventListener('input', ()=>{
        buildOutletMenuOptions();
        if (outletMenu.children.length === 0) closeOutletMenu();
        else openOutletMenu();
        localStorage.setItem('stwid--bulk-outlet-value', outletInput.value);
    });
    outletInput.addEventListener('change', ()=>{
        localStorage.setItem('stwid--bulk-outlet-value', outletInput.value);
    });
    outletInput.addEventListener('keydown', (e)=>{
        if (e.key === 'Escape') {
            closeOutletMenu();
            outletInput.blur();
        }
    });

    outletDropdownWrap.append(outletInput, outletMenu);
    outletContainer.append(outletDropdownWrap);

    const runApplyOutlet = async () => {
        const value = outletInput.value.trim();
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isOrderHelperRowSelected);
        const books = new Set();

        for (const { tr, bookName, entryData } of targets) {
            books.add(bookName);
            entryData.outletName = value;
            const rowOutlet = tr.querySelector('[name="outletName"]');
            if (rowOutlet) rowOutlet.value = value;
        }

        syncOrderHelperOutletFilters();

        for (const { tr, entryData } of targets) {
            applyOrderHelperOutletFilterToRow(tr, entryData);
        }
        filterIndicatorRefs.outlet?.();
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyOutlet.classList.remove(APPLY_DIRTY_CLASS);
    };
    const applyOutlet = createApplyButton(
        'Apply outlet name to all selected entries',
        runApplyOutlet,
        applyRegistry,
    );
    outletInput.addEventListener('input', () => applyOutlet.classList.add(APPLY_DIRTY_CLASS));
    outletContainer.append(applyOutlet);

    const applyOutletContainerState = ()=>{
        const isOutlet = isOutletPosition(positionSelect.value);
        outletContainer.classList.toggle('stwid--state-disabled', !isOutlet);
        outletInput.disabled = !isOutlet;
    };
    positionSelect.addEventListener('change', applyOutletContainerState);
    applyOutletContainerState();

    return { positionContainer, depthContainer, outletContainer, cleanup };
}
