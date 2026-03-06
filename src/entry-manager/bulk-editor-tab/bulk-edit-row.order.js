import { setTooltip } from '../utils.js';
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

    const runApplyOrder = async () => {
        await withApplyButtonLock(applyOrder, async()=>{
            const start = Number.parseInt(dom.order.start.value, 10);
            const step = Number.parseInt(dom.order.step.value, 10);
            if (!Number.isInteger(start) || start <= 0) {
                toastr.warning('Start must be a positive whole number.');
                return;
            }
            if (!Number.isInteger(step) || step <= 0) {
                toastr.warning('Spacing must be a positive whole number.');
                return;
            }
            const rows = getSafeTbodyRows(dom);
            if (!rows) return;

            const up = dom.order.direction.up.checked;
            const targets = getBulkTargets(rows, cache, isEntryManagerRowSelected, { reverse: up });
            let order = start;
            const books = new Set();
            for (let i = 0; i < targets.length; i++) {
                const { tr, bookName, entryData } = targets[i];
                books.add(bookName);
                entryData.order = order;
                const orderInput = tr.querySelector('[name="order"]');
                if (orderInput) orderInput.value = order.toString();
                order += step;
                if ((i + 1) % BULK_APPLY_BATCH_SIZE === 0) {
                    await new Promise((resolve)=>setTimeout(resolve, 0));
                }
            }
            await saveUpdatedBooks(books, saveWorldInfo, buildSavePayload);
            applyOrder.classList.remove(APPLY_DIRTY_CLASS);
        });
    };

    const applyOrder = createApplyButton(
        'Apply current row order to the Order field',
        runApplyOrder,
        applyRegistry,
    );

    const startSpacingPair = document.createElement('div');
    startSpacingPair.classList.add('stwid--orderStartSpacingPair');

    const startLbl = document.createElement('label');
    startLbl.classList.add('stwid--inputWrap');
    setTooltip(startLbl, 'Starting Order value');
    startLbl.append('Start: ');
    const start = document.createElement('input');
    dom.order.start = start;
    start.classList.add('stwid-compactInput', 'text_pole');
    start.type = 'number';
    start.min = '1';
    start.max = MAX_ORDER_INPUT;
    start.value = localStorage.getItem('stwid--order-start') ?? '100';
    start.addEventListener('change', ()=>{
        localStorage.setItem('stwid--order-start', start.value);
    });
    startLbl.append(start);
    startSpacingPair.append(startLbl);

    const stepLbl = document.createElement('label');
    stepLbl.classList.add('stwid--inputWrap');
    setTooltip(stepLbl, 'Spacing between Order values');
    stepLbl.append('Spacing: ');
    const step = document.createElement('input');
    dom.order.step = step;
    step.classList.add('stwid-compactInput', 'text_pole');
    step.type = 'number';
    step.min = '1';
    step.max = MAX_ORDER_INPUT;
    step.value = localStorage.getItem('stwid--order-step') ?? '10';
    step.addEventListener('change', ()=>{
        localStorage.setItem('stwid--order-step', step.value);
    });
    stepLbl.append(step);
    startSpacingPair.append(stepLbl);

    orderContainer.append(startSpacingPair);
    dom.order.start.addEventListener('change', () => applyOrder.classList.add(APPLY_DIRTY_CLASS));
    dom.order.step.addEventListener('change', () => applyOrder.classList.add(APPLY_DIRTY_CLASS));

    const directionGroup = document.createElement('div');
    directionGroup.classList.add('stwid--inputWrap');
    setTooltip(directionGroup, 'Direction used when applying Order values');
    directionGroup.append('Direction: ');
    const directionRadioGroupName = 'stwid--order-direction';
    const radioToggleWrap = document.createElement('div');
    radioToggleWrap.classList.add('stwid--toggleWrap');
    const upDirection = buildDirectionRadio(
        directionRadioGroupName,
        'up',
        'up',
        'Start from the bottom row',
        'stwid--order-direction',
        applyOrder,
    );
    dom.order.direction.up = upDirection.radioInput;
    radioToggleWrap.append(upDirection.directionRow);
    const downDirection = buildDirectionRadio(
        directionRadioGroupName,
        'down',
        'down',
        'Start from the top row',
        'stwid--order-direction',
        applyOrder,
    );
    dom.order.direction.down = downDirection.radioInput;
    radioToggleWrap.append(downDirection.directionRow);
    directionGroup.append(radioToggleWrap);
    orderContainer.append(directionGroup);

    orderContainer.append(applyOrder);
    return orderContainer;
}
