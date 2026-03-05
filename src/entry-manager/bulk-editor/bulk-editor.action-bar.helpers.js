export function wrapRowContent(row) {
    const contentWrap = document.createElement('div');
    contentWrap.classList.add('stwid--rowContentWrap');
    while (row.firstChild) {
        contentWrap.append(row.firstChild);
    }
    row.append(contentWrap);
    row.dataset.collapsed = 'false';
    row.classList.remove('stwid--collapsed');
    return contentWrap;
}
