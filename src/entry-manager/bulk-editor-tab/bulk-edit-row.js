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
    const row = document.createElement('div');
    row.classList.add('stwid--bulkEditRow');

    const { selectContainer, refreshSelectionCount } = buildBulkSelectSection({
        dom,
        getEntryManagerRows,
        isEntryManagerRowSelected,
        setAllEntryManagerRowSelected,
        updateEntryManagerSelectAllButton,
    });
    row.append(selectContainer);

    const applyRegistry = [];

    row.append(buildBulkStateSection({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkStrategySection({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        getStrategyOptions,
        applyEntryManagerStrategyFilterToRow,
        applyRegistry,
    }));

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

    row.append(buildBulkOrderSection({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));

    row.append(buildBulkRecursionSection({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyEntryManagerRecursionFilterToRow,
        applyRegistry,
    }));
    row.append(buildBulkBudgetSection({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkProbabilitySection({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkStickySection({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkCooldownSection({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));
    row.append(buildBulkDelaySection({
        dom,
        cache,
        isEntryManagerRowSelected,
        saveWorldInfo,
        buildSavePayload,
        applyRegistry,
    }));

    row.append(buildApplyAllSection(applyRegistry));

    wrapRowContent(row);

    return { element: row, refreshSelectionCount, cleanup };
}
