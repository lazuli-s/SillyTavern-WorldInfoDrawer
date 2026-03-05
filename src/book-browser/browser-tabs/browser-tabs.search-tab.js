export const mountSearchTabContent = ({
    tabContentsById,
    searchRow,
})=>{
    const searchTabContent = tabContentsById.get('search');
    if (!searchTabContent) return;
    searchTabContent.append(searchRow);
};
