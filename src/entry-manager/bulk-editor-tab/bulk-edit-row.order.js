import { setTooltip } from '../entry-manager.utils.js';
import {
    BULK_APPLY_BATCH_SIZE,
    APPLY_DIRTY_CLASS,
    createLabeledBulkContainer,
    createApplyButton,
    buildDirectionRadio,
    getSafeTbodyRows,
    getBulkTargets,
    saveUpdatedBooks,
    withApplyButtonLock,
} from './bulk-edit-row.helpers.js';

const MAX_ORDER_INPUT = '10000';
const ORDER_DIRECTION_GROUP = 'stwid--order-direction';
const ORDER_START_STORAGE_KEY = 'stwid--order-start';
const ORDER_STEP_STORAGE_KEY = 'stwid--order-step';

async function maybeYieldToEventLoop(index, batchSize) {
    if ((index + 1) % batchSize !== 0) {
        return;
    }
    await new Promise((resolve)=>setTimeout(resolve, 0));
}

function buildPersistedNumberInput({
    labelText,
    tooltipText,
    storageKey,
    defaultValue,
    maxValue,
    onDirty,
}) {
    const label = document.createElement('label');
    label.classList.add('stwid--inputWrap');
    setTooltip(label, tooltipText);
    label.append(`${labelText}: `);

    const inputEl = document.createElement('input');
    inputEl.classList.add('stwid-compactInput', 'text_pole');
    inputEl.type = 'number';
    inputEl.min = '1';
    inputEl.max = maxValue;
    inputEl.value = localStorage.getItem(storageKey) ?? defaultValue;
    inputEl.addEventListener('change', ()=>{
        localStorage.setItem(storageKey, inputEl.value);
    });
    if (typeof onDirty === 'function') {
        inputEl.addEventListener('change', onDirty);
    }

    label.append(inputEl);
    return { label, inputEl };
}

function createRunApplyOrder({
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyOrder,
}) {
    return async function runApplyOrder() {
        const applyButton = typeof applyOrder === 'function' ? applyOrder() : applyOrder;
        await withApplyButtonLock(applyButton, async()=>{
            const startValue = Number.parseInt(dom.order.start.value, 10);
            const stepValue = Number.parseInt(dom.order.step.value, 10);
            if (!Number.isInteger(startValue) || startValue <= 0) {
                toastr.warning('Start must be a positive whole number.');
                return;
            }
            if (!Number.isInteger(stepValue) || stepValue <= 0) {
                toastr.warning('Spacing must be a positive whole number.');
                return;
            }

            const rows = getSafeTbodyRows(dom);
            if (!rows) return;

            const shouldReverseTargets = dom.order.direction.up.checked;
            const targets = getBulkTargets(rows, cache, isEntryManagerRowSelected, { reverse: shouldReverseTargets });
            let order = startValue;
            const books = new Set();
            for (let i = 0; i < targets.length; i++) {
                const { tr: entryRowEl, bookName, entryData } = targets[i];
                books.add(bookName);
                entryData.order = order;
                const orderInput = entryRowEl.querySelector('[name="order"]');
                if (orderInput) {
                    orderInput.value = order.toString();
                }
                order += stepValue;
                await maybeYieldToEventLoop(i, BULK_APPLY_BATCH_SIZE);
            }
            await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
            applyButton.classList.remove(APPLY_DIRTY_CLASS);
        });
    };
}

function buildOrderStartSpacingControls({ dom, applyOrder }) {
    const startSpacingPair = document.createElement('div');
    startSpacingPair.classList.add('stwid--orderStartSpacingPair');

    const markApplyButtonDirty = () => applyOrder.classList.add(APPLY_DIRTY_CLASS);
    const { label: startLabel, inputEl: startInputEl } = buildPersistedNumberInput({
        labelText: 'Start',
        tooltipText: 'Starting Order value',
        storageKey: ORDER_START_STORAGE_KEY,
        defaultValue: '100',
        maxValue: MAX_ORDER_INPUT,
        onDirty: markApplyButtonDirty,
    });
    dom.order.start = startInputEl;
    startSpacingPair.append(startLabel);

    const { label: stepLabel, inputEl: stepInputEl } = buildPersistedNumberInput({
        labelText: 'Spacing',
        tooltipText: 'Spacing between Order values',
        storageKey: ORDER_STEP_STORAGE_KEY,
        defaultValue: '10',
        maxValue: MAX_ORDER_INPUT,
        onDirty: markApplyButtonDirty,
    });
    dom.order.step = stepInputEl;
    startSpacingPair.append(stepLabel);

    return startSpacingPair;
}

function buildOrderDirectionControls({ dom, applyOrder }) {
    const directionGroup = document.createElement('div');
    directionGroup.classList.add('stwid--inputWrap');
    setTooltip(directionGroup, 'Direction used when applying Order values');
    directionGroup.append('Direction: ');

    const radioToggleWrap = document.createElement('div');
    radioToggleWrap.classList.add('stwid--toggleWrap');
    const upDirection = buildDirectionRadio(
        ORDER_DIRECTION_GROUP,
        'up',
        'up',
        'Start from the bottom row',
        ORDER_DIRECTION_GROUP,
        applyOrder,
    );
    dom.order.direction.up = upDirection.radioInput;
    radioToggleWrap.append(upDirection.directionRow);

    const downDirection = buildDirectionRadio(
        ORDER_DIRECTION_GROUP,
        'down',
        'down',
        'Start from the top row',
        ORDER_DIRECTION_GROUP,
        applyOrder,
    );
    dom.order.direction.down = downDirection.radioInput;
    radioToggleWrap.append(downDirection.directionRow);

    directionGroup.append(radioToggleWrap);
    return directionGroup;
}

export function buildBulkOrderSection({
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    applyRegistry,
}) {
    const orderContainer = createLabeledBulkContainer(
        'order',
        'Order',
        'Assign sequential Order numbers to selected entries using the start value, spacing, and direction below.',
    );

    let applyOrder;
    const runApplyOrder = createRunApplyOrder({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyOrder: () => applyOrder,
    });

    applyOrder = createApplyButton(
        'Apply current row order to the Order field',
        runApplyOrder,
        applyRegistry,
    );

    const startSpacingPair = buildOrderStartSpacingControls({ dom, applyOrder });
    orderContainer.append(startSpacingPair);

    const directionGroup = buildOrderDirectionControls({ dom, applyOrder });
    orderContainer.append(directionGroup);

    orderContainer.append(applyOrder);
    return orderContainer;
}
