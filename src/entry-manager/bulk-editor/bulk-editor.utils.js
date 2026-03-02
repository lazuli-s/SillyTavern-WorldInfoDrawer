






export const MULTISELECT_DROPDOWN_CLOSE_HANDLER = 'stwidCloseMultiselectDropdownMenu';

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
        setMultiselectDropdownOptionCheckboxState(checkbox, input.checked);
    });
    setChecked(checked);
    return {
        input,
        checkbox,
        setChecked,
    };
};

export const closeOpenMultiselectDropdownMenus = (excludeMenu = null)=>{
    for (const menu of document.querySelectorAll('.stwid--multiselectDropdownMenu.stwid--state-active')) {
        if (menu === excludeMenu) continue;
        const closeMenu = menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
        if (typeof closeMenu === 'function') {
            closeMenu();
            continue;
        }
        menu.classList.remove('stwid--state-active');
        const trigger = menu.parentElement?.querySelector('.stwid--multiselectDropdownButton');
        trigger?.setAttribute('aria-expanded', 'false');
    }
    
    for (const blocker of document.querySelectorAll('.stwid--blocker')) {
        const menu = blocker.querySelector('.stwid--listDropdownMenu');
        const closeMenu = menu?.[MULTISELECT_DROPDOWN_CLOSE_HANDLER];
        if (typeof closeMenu === 'function') {
            closeMenu();
            continue;
        }
        const trigger = document.querySelector('.stwid--listDropdownTrigger[aria-expanded="true"]');
        blocker.remove();
        trigger?.setAttribute('aria-expanded', 'false');
        trigger?.focus();
    }
};






export const wireMultiselectDropdown = (menu, menuButton, menuWrap)=>{
    const closeMenu = ()=>{
        if (!menu.classList.contains('stwid--state-active')) return;
        menu.classList.remove('stwid--state-active');
        menuButton?.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', handleOutsideClick);
    };
    const openMenu = ()=>{
        if (menu.classList.contains('stwid--state-active')) return;
        closeOpenMultiselectDropdownMenus(menu);
        menu.classList.add('stwid--state-active');
        menuButton?.setAttribute('aria-expanded', 'true');
        document.addEventListener('click', handleOutsideClick);
    };
    const handleOutsideClick = (event)=>{
        if (menuWrap.contains(event.target)) return;
        closeMenu();
    };
    menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER] = closeMenu;
    menu.addEventListener('click', (event)=>event.stopPropagation());
    menuButton.addEventListener('click', (event)=>{
        event.stopPropagation();
        if (menu.classList.contains('stwid--state-active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });
    return closeMenu;
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
                contentWrap.style.overflow = '';
                contentWrap.style.maxHeight = '';
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
