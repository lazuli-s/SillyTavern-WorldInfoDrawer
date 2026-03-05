export const mountSortingTabContent = ({
    tabContentsById,
    sortingRow,
})=>{
    const sortingTabContent = tabContentsById.get('sorting');
    if (!sortingTabContent) return;
    sortingTabContent.append(sortingRow);
};
