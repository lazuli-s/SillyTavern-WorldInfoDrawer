export const mountVisibilityTabContent = ({
    tabContentsById,
    visibilityRow,
})=>{
    const visibilityTabContent = tabContentsById.get('visibility');
    if (!visibilityTabContent) return;
    visibilityTabContent.append(visibilityRow);
};
