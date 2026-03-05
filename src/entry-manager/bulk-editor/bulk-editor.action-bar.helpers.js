import { wireCollapseRow } from './bulk-editor.utils.js';

export function createCollapsibleRowTitle(titleText) {
    const rowTitle = document.createElement('div');
    rowTitle.classList.add('stwid--RowTitle');
    rowTitle.textContent = titleText;

    const collapseChevron = document.createElement('i');
    collapseChevron.classList.add('fa-solid', 'fa-fw', 'fa-chevron-down', 'stwid--collapseChevron');
    rowTitle.prepend(collapseChevron);
    rowTitle.classList.add('stwid--collapsibleTitle');

    return { rowTitle, collapseChevron };
}

export function wrapRowContent(row, rowTitle, collapseChevron, initialCollapsed) {
    const contentWrap = document.createElement('div');
    contentWrap.classList.add('stwid--rowContentWrap');
    while (row.children.length > 1) {
        contentWrap.append(row.children[1]);
    }
    row.append(contentWrap);
    wireCollapseRow(rowTitle, row, contentWrap, collapseChevron, { initialCollapsed });
    return contentWrap;
}
