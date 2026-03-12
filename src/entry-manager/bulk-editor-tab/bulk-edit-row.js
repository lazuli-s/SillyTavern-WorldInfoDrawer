import { wrapRowContent } from '../entry-manager.utils.js';
import {
    buildBulkSelectSection,
    buildApplyAllSection,
    buildBulkProbabilitySection,
    buildBulkStickySection,
    buildBulkCooldownSection,
    buildBulkDelaySection,
    buildBulkStateSection,
    buildBulkStrategySection,
    buildBulkRecursionSection,
    buildBulkBudgetSection,
} from './bulk-edit-row.sections.js';
import { buildBulkPositionSection } from './bulk-edit-row.position.js';
import { buildBulkOrderSection } from './bulk-edit-row.order.js';

function createBulkEditRowRoot() {
    const row = document.createElement('div');
    row.classList.add('stwid--bulkEditRow');
    return row;
}

function appendBulkSelectSection(row, {
    dom,
    getEntryManagerRows,
    isEntryManagerRowSelected,
    setAllEntryManagerRowSelected,
    updateEntryManagerSelectAllButton,
}) {
    const { selectContainer, refreshSelectionCount } = buildBulkSelectSection({
        dom,
        getEntryManagerRows,
        isEntryManagerRowSelected,
        setAllEntryManagerRowSelected,
        updateEntryManagerSelectAllButton,
    });
    row.append(selectContainer);
    return refreshSelectionCount;
}

function appendBulkEditSections(row, {
    dom,
    cache,
    isEntryManagerRowSelected,
    saveWorldInfo,
    buildSavePayload,
    getStrategyOptions,
    applyEntryManagerStrategyFilterToRow,
    getPositionOptions,
    applyEntryManagerPositionFilterToRow,
    isOutletPosition,
    getOutletOptions,
    applyEntryManagerOutletFilterToRow,
    syncEntryManagerOutletFilters,
    filterIndicatorRefs,
    applyEntryManagerRecursionFilterToRow,
    applyRegistry,
}) {
    const appendBulkSection = (buildSection, extraArgs = {}) => {
        const section = buildSection({
            dom,
            cache,
            isEntryManagerRowSelected,
            saveWorldInfo,
            buildSavePayload,
            applyRegistry,
            ...extraArgs,
        });
        row.append(section);
    };

    appendBulkSection(buildBulkStateSection);
    appendBulkSection(buildBulkStrategySection, {
        getStrategyOptions,
        applyEntryManagerStrategyFilterToRow,
    });

    const {
        positionContainer,
        depthContainer,
        outletContainer,
        cleanup,
    } = buildBulkPositionSection({
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
    });
    row.append(positionContainer, depthContainer, outletContainer);

    appendBulkSection(buildBulkOrderSection);
    appendBulkSection(buildBulkRecursionSection, {
        applyEntryManagerRecursionFilterToRow,
    });
    appendBulkSection(buildBulkBudgetSection);
    appendBulkSection(buildBulkProbabilitySection);
    appendBulkSection(buildBulkStickySection);
    appendBulkSection(buildBulkCooldownSection);
    appendBulkSection(buildBulkDelaySection);

    return cleanup;
}

function finalizeBulkEditRow(row, applyRegistry, refreshSelectionCount, cleanup) {
    row.append(buildApplyAllSection(applyRegistry));
    wrapRowContent(row);
    return { element: row, refreshSelectionCount, cleanup };
}

export function buildBulkEditRow({
    dom,
    cache,
    saveWorldInfo,
    buildSavePayload,
    isEntryManagerRowSelected,
    setAllEntryManagerRowSelected,
    updateEntryManagerSelectAllButton,
    getEntryManagerRows,
    getStrategyOptions,
    applyEntryManagerStrategyFilterToRow,
    getPositionOptions,
    applyEntryManagerPositionFilterToRow,
    isOutletPosition,
    getOutletOptions,
    applyEntryManagerOutletFilterToRow,
    syncEntryManagerOutletFilters,
    filterIndicatorRefs,
    applyEntryManagerRecursionFilterToRow,
}) {
    const row = createBulkEditRowRoot();
    const refreshSelectionCount = appendBulkSelectSection(row, {
        dom,
        getEntryManagerRows,
        isEntryManagerRowSelected,
        setAllEntryManagerRowSelected,
        updateEntryManagerSelectAllButton,
    });
    const applyRegistry = [];
    const cleanup = appendBulkEditSections(row, {
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        getStrategyOptions,
        applyEntryManagerStrategyFilterToRow,
        getPositionOptions,
        applyEntryManagerPositionFilterToRow,
        isOutletPosition,
        getOutletOptions,
        applyEntryManagerOutletFilterToRow,
        syncEntryManagerOutletFilters,
        filterIndicatorRefs,
        applyEntryManagerRecursionFilterToRow,
        applyRegistry,
    });

    return finalizeBulkEditRow(row, applyRegistry, refreshSelectionCount, cleanup);
}
