






export const MULTISELECT_DROPDOWN_CLOSE_HANDLER = 'stwidCloseMultiselectDropdownMenu';
const CSS_STATE_ACTIVE = 'stwid--state-active';
const ARIA_EXPANDED_ATTR = 'aria-expanded';

export const setTooltip = (element, text, { ariaLabel = null } = {})=>{
    if (!element) return;
    if (typeof text !== 'string' || text.trim() === '') return;
    element.title = text;
    const effectiveAriaLabel = typeof ariaLabel === 'string' ? ariaLabel : null;
    const label = effectiveAriaLabel ?? text.replace(/\s*---\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (label) {
        element.setAttribute('aria-label', label);
    }
};

export const setMultiselectDropdownOptionCheckboxState = (checkbox, isChecked)=>{
    if (!checkbox) return;
    checkbox.classList.toggle('fa-square-check', Boolean(isChecked));
    checkbox.classList.toggle('fa-square', !isChecked);
};

export const createMultiselectDropdownCheckbox = (checked = false)=>{
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.tabIndex = -1;
    input.classList.add('stwid--multiselectDropdownOptionInput');
    const checkbox = document.createElement('i');
    checkbox.classList.add('fa-solid', 'fa-fw', 'stwid--multiselectDropdownOptionCheckbox');
    const setChecked = (isChecked)=>{
        input.checked = Boolean(isChecked);
        setMultiselectDropdownOptionCheckboxState(checkbox, input.checked);
    };
    input.addEventListener('change', ()=>{
        setChecked(input.checked);
    });
    setChecked(checked);
    return {
        input,
        checkbox,
        setChecked,
    };
};

export const closeOpenMultiselectDropdownMenus = (excludeMenu = null)=>{
    for (const menu of document.querySelectorAll(`.stwid--multiselectDropdownMenu.${CSS_STATE_ACTIVE}`)) {
        if (menu === excludeMenu) continue;
        const closeMenu = menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
        if (typeof closeMenu === 'function') {
            closeMenu();
            continue;
        }
        menu.classList.remove(CSS_STATE_ACTIVE);
        const trigger = menu.parentElement?.querySelector('.stwid--multiselectDropdownButton');
        trigger?.setAttribute(ARIA_EXPANDED_ATTR, 'false');
    }
    
    for (const blocker of document.querySelectorAll('.stwid--blocker')) {
        const menu = blocker.querySelector('.stwid--listDropdownMenu');
        const closeMenu = menu?.[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
        if (typeof closeMenu === 'function') {
            closeMenu();
            continue;
        }
        const trigger = document.querySelector(`.stwid--listDropdownTrigger[${ARIA_EXPANDED_ATTR}="true"]`);
        blocker.remove();
        trigger?.setAttribute(ARIA_EXPANDED_ATTR, 'false');
        trigger?.focus();
    }
};






export const wireMultiselectDropdown = (menu, menuButton, menuWrap)=>{
    const handleOutsideClick = (event)=>{
        if (menuWrap.contains(event.target)) return;
        closeMenu();
    };
    const handleEscapeKey = (event)=>{
        if (event.key === 'Escape') {
            closeMenu();
        }
    };
    const closeMenu = ()=>{
        if (!menu.classList.contains(CSS_STATE_ACTIVE)) return;
        menu.classList.remove(CSS_STATE_ACTIVE);
        menuButton?.setAttribute(ARIA_EXPANDED_ATTR, 'false');
        document.removeEventListener('click', handleOutsideClick, true);
        document.removeEventListener('keydown', handleEscapeKey);
    };
    const openMenu = ()=>{
        if (menu.classList.contains(CSS_STATE_ACTIVE)) return;
        closeOpenMultiselectDropdownMenus(menu);
        menu.classList.add(CSS_STATE_ACTIVE);
        menuButton?.setAttribute(ARIA_EXPANDED_ATTR, 'true');
        document.addEventListener('click', handleOutsideClick, true);
        document.addEventListener('keydown', handleEscapeKey);
    };
    menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER] = closeMenu;
    menu.addEventListener('click', (event)=>event.stopPropagation());
    menuButton.addEventListener('click', (event)=>{
        event.stopPropagation();
        if (menu.classList.contains(CSS_STATE_ACTIVE)) {
            closeMenu();
        } else {
            openMenu();
        }
    });
    return closeMenu;
};

const resetContentWrapAfterExpand = (contentWrap)=>{
    contentWrap.style.overflow = '';
    contentWrap.style.maxHeight = '';
};

export const wireCollapseRow = (rowTitle, row, contentWrap, chevron, { initialCollapsed = false } = {})=>{
    const applyCollapsedState = (collapsed)=>{
        row.dataset.collapsed = String(collapsed);
        row.classList.toggle('stwid--collapsed', collapsed);
        chevron.classList.toggle('fa-chevron-down', !collapsed);
        chevron.classList.toggle('fa-chevron-right', collapsed);
    };

    rowTitle.addEventListener('click', ()=>{
        const isCollapsed = row.dataset.collapsed === 'true';
        if (isCollapsed) {
            applyCollapsedState(false);
            contentWrap.style.overflow = 'hidden';
            contentWrap.style.maxHeight = '1000px';
            contentWrap.addEventListener('transitionend', ()=>{
                resetContentWrapAfterExpand(contentWrap);
            }, { once: true });
        } else {
            closeOpenMultiselectDropdownMenus();
            contentWrap.style.overflow = 'hidden';
            contentWrap.style.maxHeight = contentWrap.scrollHeight + 'px';
            void contentWrap.offsetHeight;
            contentWrap.style.maxHeight = '0';
            applyCollapsedState(true);
        }
    });

    if (initialCollapsed) {
        applyCollapsedState(true);
        contentWrap.style.overflow = 'hidden';
        contentWrap.style.maxHeight = '0';
    } else {
        applyCollapsedState(false);
    }
};

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

export const formatCharacterFilter = (entry)=>{
    const filter = entry?.characterFilter;
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return [];
    const lines = [];
    if (Array.isArray(filter.names) && filter.names.length > 0) {
        lines.push(...filter.names.map((name)=>({
            icon: filter.isExclude ? 'fa-user-slash' : 'fa-user-plus',
            mode: filter.isExclude ? 'exclude' : 'include',
            label: name,
        })));
    }
    if (Array.isArray(filter.tags) && filter.tags.length > 0) {
        const tags = globalThis.SillyTavern?.getContext?.().tags ?? [];
        const tagNames = tags.length
            ? tags.filter((tag)=>filter.tags.includes(tag.id)).map((tag)=>tag.name)
            : filter.tags.map((tag)=>String(tag));
        if (tagNames.length > 0) {
            lines.push(...tagNames.map((tag)=>({
                icon: 'fa-tag',
                mode: filter.isExclude ? 'exclude' : 'include',
                label: tag,
            })));
        }
    }
    if (!lines.length) {
        return [];
    }
    return lines;
};
