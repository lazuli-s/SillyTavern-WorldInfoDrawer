import {
    MULTISELECT_DROPDOWN_CLOSE_HANDLER,
    closeOpenMultiselectDropdownMenus,
    setTooltip,
} from '../entry-manager.utils.js';
import {
    APPLY_DIRTY_CLASS,
    createLabeledBulkContainer,
    createApplyButton,
    getSafeTbodyRows,
    getBulkTargets,
    saveUpdatedBooks,
} from './bulk-edit-row.helpers.js';

const STORAGE_KEY_BULK_POSITION = 'stwid--bulk-position-value';
const STORAGE_KEY_BULK_DEPTH = 'stwid--bulk-depth-value';
const STORAGE_KEY_BULK_OUTLET = 'stwid--bulk-outlet-value';
const STATE_ACTIVE_CLASS = 'stwid--state-active';

function runBulkApplyForSelectedEntries({
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyButton,
    perTargetUpdate,
    afterTargetsUpdate,
}) {
    return async function runBulkApply() {
        const rows = getSafeTbodyRows(dom);
        if (!rows) return;
        const targets = getBulkTargets(rows, cache, isEntryManagerRowSelected);
        const books = new Set();
        for (const target of targets) {
            books.add(target.bookName);
            perTargetUpdate(target);
        }
        afterTargetsUpdate?.(targets);
        await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
        applyButton.classList.remove(APPLY_DIRTY_CLASS);
    };
}

function buildBulkPositionControls({
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    getPositionOptions,
    applyEntryManagerPositionFilterToRow,
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
    for (const positionOption of getPositionOptions()) {
        const option = document.createElement('option');
        option.value = positionOption.value;
        option.textContent = positionOption.label;
        positionSelect.append(option);
    }
    const storedPosition = localStorage.getItem(STORAGE_KEY_BULK_POSITION);
    if (storedPosition && [...positionSelect.options].some((option)=>option.value === storedPosition)) {
        positionSelect.value = storedPosition;
    }
    positionSelect.addEventListener('change', ()=>{
        localStorage.setItem(STORAGE_KEY_BULK_POSITION, positionSelect.value);
    });
    positionContainer.append(positionSelect);

    let applyPosition;
    const runApplyPosition = async () => {
        const value = positionSelect.value;
        if (!value) {
            toastr.warning('No position selected.');
            return;
        }

        await runBulkApplyForSelectedEntries({
            dom,
            cache,
            isEntryManagerRowSelected,
            saveWorldInfo,
            buildSavePayload,
            applyButton: applyPosition,
            perTargetUpdate: ({ tr, bookName, uid, entryData }) => {
                entryData.position = value;
                const domPos = cache?.[bookName]?.dom?.entry?.[uid]?.position;
                if (domPos) domPos.value = value;
                applyEntryManagerPositionFilterToRow(tr, entryData);
            },
        })();
    };
    applyPosition = createApplyButton(
        'Apply selected position to all selected entries',
        runApplyPosition,
        applyRegistry,
    );
    positionSelect.addEventListener('change', () => applyPosition.classList.add(APPLY_DIRTY_CLASS));
    positionContainer.append(applyPosition);

    return { positionContainer, positionSelect, applyPosition };
}

function buildBulkDepthControls({
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    positionSelect,
    applyRegistry,
}) {
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
    const storedDepth = localStorage.getItem(STORAGE_KEY_BULK_DEPTH);
    if (storedDepth !== null) depthInput.value = storedDepth;
    depthInput.addEventListener('change', ()=>{
        localStorage.setItem(STORAGE_KEY_BULK_DEPTH, depthInput.value);
    });
    depthContainer.append(depthInput);

    let applyDepth;
    const runApplyDepth = async () => {
        const rawValue = depthInput.value.trim();
        const parsedDepth = rawValue === '' ? undefined : parseInt(rawValue, 10);
        if (rawValue !== '' && (!Number.isInteger(parsedDepth) || parsedDepth < 0)) {
            toastr.warning('Depth must be a non-negative whole number, or blank to clear.');
            return;
        }

        await runBulkApplyForSelectedEntries({
            dom,
            cache,
            isEntryManagerRowSelected,
            saveWorldInfo,
            buildSavePayload,
            applyButton: applyDepth,
            perTargetUpdate: ({ tr, entryData }) => {
                entryData.depth = parsedDepth;
                const rowDepth = tr.querySelector('[name="depth"]');
                if (rowDepth) rowDepth.value = parsedDepth !== undefined ? String(parsedDepth) : '';
            },
        })();
    };
    applyDepth = createApplyButton(
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

    return { depthContainer };
}

function buildBulkOutletControls({
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    positionSelect,
    isOutletPosition,
    getOutletOptions,
    applyEntryManagerOutletFilterToRow,
    syncEntryManagerOutletFilters,
    filterIndicatorRefs,
    applyRegistry,
}) {
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
    const storedOutlet = localStorage.getItem(STORAGE_KEY_BULK_OUTLET);
    if (storedOutlet !== null) outletInput.value = storedOutlet;

    const outletMenu = document.createElement('div');
    outletMenu.classList.add('stwid--multiselectDropdownMenu', 'stwid--menu');

    const closeOutletMenu = ()=>{
        if (!outletMenu.classList.contains(STATE_ACTIVE_CLASS)) return;
        outletMenu.classList.remove(STATE_ACTIVE_CLASS);
        document.removeEventListener('click', handleOutletOutsideClick);
    };
    const handleOutletOutsideClick = (event)=>{
        if (outletDropdownWrap.contains(event.target)) return;
        closeOutletMenu();
    };
    const openOutletMenu = ()=>{
        if (outletMenu.classList.contains(STATE_ACTIVE_CLASS)) return;
        closeOpenMultiselectDropdownMenus(outletMenu);
        outletMenu.classList.add(STATE_ACTIVE_CLASS);
        document.addEventListener('click', handleOutletOutsideClick);
    };
    const buildOutletMenuOptions = ()=>{
        outletMenu.innerHTML = '';
        const filter = outletInput.value.toLowerCase();
        const allOptions = getOutletOptions();
        const visible = filter ? allOptions.filter((option)=>option.value.toLowerCase().includes(filter)) : allOptions;
        for (const option of visible) {
            const optEl = document.createElement('div');
            optEl.classList.add('stwid--multiselectDropdownOption', 'stwid--menuItem');
            optEl.textContent = option.value;
            if (option.value === outletInput.value) optEl.classList.add(STATE_ACTIVE_CLASS);
            optEl.addEventListener('mousedown', (event)=>{
                event.preventDefault();
                outletInput.value = option.value;
                localStorage.setItem(STORAGE_KEY_BULK_OUTLET, outletInput.value);
                closeOutletMenu();
            });
            outletMenu.append(optEl);
        }
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
        localStorage.setItem(STORAGE_KEY_BULK_OUTLET, outletInput.value);
    });
    outletInput.addEventListener('change', ()=>{
        localStorage.setItem(STORAGE_KEY_BULK_OUTLET, outletInput.value);
    });
    outletInput.addEventListener('keydown', (event)=>{
        if (event.key === 'Escape') {
            closeOutletMenu();
            outletInput.blur();
        }
    });

    outletDropdownWrap.append(outletInput, outletMenu);
    outletContainer.append(outletDropdownWrap);

    let applyOutlet;
    const runApplyOutlet = async () => {
        const value = outletInput.value.trim();
        await runBulkApplyForSelectedEntries({
            dom,
            cache,
            isEntryManagerRowSelected,
            saveWorldInfo,
            buildSavePayload,
            applyButton: applyOutlet,
            perTargetUpdate: ({ tr, entryData }) => {
                entryData.outletName = value;
                const rowOutlet = tr.querySelector('[name="outletName"]');
                if (rowOutlet) rowOutlet.value = value;
            },
            afterTargetsUpdate: (targets) => {
                syncEntryManagerOutletFilters();
                for (const { tr, entryData } of targets) {
                    applyEntryManagerOutletFilterToRow(tr, entryData);
                }
                filterIndicatorRefs.outlet?.();
            },
        })();
    };
    applyOutlet = createApplyButton(
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

    return { outletContainer, cleanup };
}

export function buildBulkPositionSection({
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    getPositionOptions,
    applyEntryManagerPositionFilterToRow,
    isOutletPosition,
    getOutletOptions,
    applyEntryManagerOutletFilterToRow,
    syncEntryManagerOutletFilters,
    filterIndicatorRefs,
    applyRegistry,
}) {
    const { positionContainer, positionSelect } = buildBulkPositionControls({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        getPositionOptions,
        applyEntryManagerPositionFilterToRow,
        applyRegistry,
    });
    const { depthContainer } = buildBulkDepthControls({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        positionSelect,
        applyRegistry,
    });
    const { outletContainer, cleanup } = buildBulkOutletControls({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        positionSelect,
        isOutletPosition,
        getOutletOptions,
        applyEntryManagerOutletFilterToRow,
        syncEntryManagerOutletFilters,
        filterIndicatorRefs,
        applyRegistry,
    });

    return { positionContainer, depthContainer, outletContainer, cleanup };
}
