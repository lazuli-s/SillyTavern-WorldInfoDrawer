// COMPAT-01 exception: SillyTavern.getContext() does not expose debounce, so this
// module intentionally imports the host utility directly from the most specific path.
import { debounce } from '../../../../utils.js';

const DESKTOP_SPLITTER_STORAGE_KEY = 'stwid--splitter-size';
const MOBILE_SPLITTER_STORAGE_KEY = 'stwid--splitter-size-mobile';
const LEGACY_DESKTOP_SPLITTER_STORAGE_KEY = 'stwid--list-width';
const LEGACY_MOBILE_SPLITTER_STORAGE_KEY = 'stwid--list-height';
const MOBILE_LAYOUT_BREAKPOINT = 1000;
const MIN_LIST_WIDTH = 150;
const MIN_EDITOR_WIDTH = 300;
const MIN_LIST_HEIGHT = 150;
const MIN_EDITOR_HEIGHT = 150;

const isMobileLayout = ()=>window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT;

const getStoredSplitterSize = (primaryKey, legacyKey)=>{
    const primaryValue = Number.parseInt(localStorage.getItem(primaryKey) ?? '', 10);
    if (!Number.isNaN(primaryValue)) return primaryValue;

    const legacyValue = Number.parseInt(localStorage.getItem(legacyKey) ?? '', 10);
    if (Number.isNaN(legacyValue)) return Number.NaN;

    localStorage.setItem(primaryKey, String(Math.round(legacyValue)));
    return legacyValue;
};

const saveSplitterSize = (primaryKey, legacyKey, value)=>{
    const roundedValue = String(Math.round(value));
    localStorage.setItem(primaryKey, roundedValue);

    localStorage.setItem(legacyKey, roundedValue);
};

export function initSplitter(body, list) {
    let restoreSplitterForCurrentLayout = ()=>{};

    const splitter = document.createElement('div'); {
        splitter.classList.add('stwid--splitter');
        body.append(splitter);

        const splitterH = document.createElement('div'); {
            splitterH.classList.add('stwid--splitter-h');
            body.append(splitterH);
        }

        let appliedListWidth = MIN_LIST_WIDTH;
        let appliedListHeight = MIN_LIST_HEIGHT;
        let lastLayoutIsMobile = isMobileLayout();

        const clamp = (value, min, max)=>Math.min(Math.max(value, min), max);
        const getDesktopMaxWidth = ()=>{
            const splitterWidth = splitter.getBoundingClientRect().width || 6;
            const bodyWidth = body.getBoundingClientRect().width;
            return Math.max(MIN_LIST_WIDTH, bodyWidth - splitterWidth - MIN_EDITOR_WIDTH);
        };
        const getMobileMaxHeight = ()=>{
            const splitterHeight = splitterH.getBoundingClientRect().height || 6;
            const bodyHeight = body.getBoundingClientRect().height;
            return Math.max(MIN_LIST_HEIGHT, bodyHeight - splitterHeight - MIN_EDITOR_HEIGHT);
        };
        const getDefaultDesktopWidth = ()=>{
            const preferred = Math.round(body.getBoundingClientRect().width * 0.34) || 300;
            return clamp(preferred, MIN_LIST_WIDTH, getDesktopMaxWidth());
        };
        const getDefaultMobileHeight = ()=>{
            const preferred = Math.round(body.getBoundingClientRect().height * 0.4) || 260;
            return clamp(preferred, MIN_LIST_HEIGHT, getMobileMaxHeight());
        };
        const applyListWidth = (value)=>{
            const clamped = Math.max(MIN_LIST_WIDTH, value);
            const width = `${clamped}px`;
            if (clamped === appliedListWidth && list.style.flexBasis === width && list.style.width === width && !list.style.height) return clamped;
            if (list.style.height) list.style.height = '';
            if (list.style.flexBasis !== width) list.style.flexBasis = width;
            if (list.style.width !== width) list.style.width = width;
            return clamped;
        };
        const applyListHeight = (value)=>{
            const clamped = Math.max(MIN_LIST_HEIGHT, value);
            const height = `${clamped}px`;
            if (clamped === appliedListHeight && list.style.height === height && !list.style.width && !list.style.flexBasis) return clamped;
            if (list.style.width) list.style.width = '';
            if (list.style.flexBasis) list.style.flexBasis = '';
            if (list.style.height !== height) list.style.height = height;
            return clamped;
        };
        const applyDesktopWidthWithBounds = (value)=>{
            const bounded = clamp(value, MIN_LIST_WIDTH, getDesktopMaxWidth());
            appliedListWidth = applyListWidth(bounded);
            return appliedListWidth;
        };
        const applyMobileHeightWithBounds = (value)=>{
            const bounded = clamp(value, MIN_LIST_HEIGHT, getMobileMaxHeight());
            appliedListHeight = applyListHeight(bounded);
            return appliedListHeight;
        };
        const applyOrientationDefault = (mobileLayout)=>{
            if (mobileLayout) {
                const defaultHeight = applyMobileHeightWithBounds(getDefaultMobileHeight());
                saveSplitterSize(MOBILE_SPLITTER_STORAGE_KEY, LEGACY_MOBILE_SPLITTER_STORAGE_KEY, defaultHeight);
                return;
            }
            const defaultWidth = applyDesktopWidthWithBounds(getDefaultDesktopWidth());
            saveSplitterSize(DESKTOP_SPLITTER_STORAGE_KEY, LEGACY_DESKTOP_SPLITTER_STORAGE_KEY, defaultWidth);
        };
        const reapplyBoundsForCurrentLayout = (mobileLayout)=>{
            if (mobileLayout) {
                const previousHeight = appliedListHeight;
                const nextHeight = applyMobileHeightWithBounds(previousHeight);
                if (nextHeight !== previousHeight) {
                    saveSplitterSize(MOBILE_SPLITTER_STORAGE_KEY, LEGACY_MOBILE_SPLITTER_STORAGE_KEY, nextHeight);
                }
                return;
            }

            const previousWidth = appliedListWidth;
            const nextWidth = applyDesktopWidthWithBounds(previousWidth);
            if (nextWidth !== previousWidth) {
                saveSplitterSize(DESKTOP_SPLITTER_STORAGE_KEY, LEGACY_DESKTOP_SPLITTER_STORAGE_KEY, nextWidth);
            }
        };

        restoreSplitterForCurrentLayout = ()=>{
            if (isMobileLayout()) {
                const storedHeight = getStoredSplitterSize(MOBILE_SPLITTER_STORAGE_KEY, LEGACY_MOBILE_SPLITTER_STORAGE_KEY);
                if (Number.isNaN(storedHeight)) {
                    applyOrientationDefault(true);
                    return;
                }
                applyMobileHeightWithBounds(storedHeight);
                return;
            }

            const storedWidth = getStoredSplitterSize(DESKTOP_SPLITTER_STORAGE_KEY, LEGACY_DESKTOP_SPLITTER_STORAGE_KEY);
            if (Number.isNaN(storedWidth)) {
                applyOrientationDefault(false);
                return;
            }
            applyDesktopWidthWithBounds(storedWidth);
        };

        splitter.addEventListener('pointerdown', (evt)=>{
            if (isMobileLayout()) return;
            evt.preventDefault();
            splitter.setPointerCapture(evt.pointerId);
            const startX = evt.clientX;
            const startWidth = list.getBoundingClientRect().width;
            appliedListWidth = startWidth;
            const maxWidth = getDesktopMaxWidth();
            let pendingWidth = startWidth;
            let rafId = null;
            const queueWidthApply = (value)=>{
                pendingWidth = value;
                if (rafId !== null) return;
                rafId = requestAnimationFrame(()=>{
                    rafId = null;
                    appliedListWidth = applyDesktopWidthWithBounds(pendingWidth);
                });
            };
            const onMove = (moveEvt)=>{
                const delta = moveEvt.clientX - startX;
                const nextWidth = Math.min(Math.max(MIN_LIST_WIDTH, startWidth + delta), maxWidth);
                queueWidthApply(nextWidth);
            };

            const cleanupDrag = (endEvt)=>{
                try {
                    splitter.releasePointerCapture(endEvt.pointerId);
                } catch {

                }

                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onCancel);
                splitter.removeEventListener('lostpointercapture', onLostCapture);

                if (rafId !== null) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                    appliedListWidth = applyDesktopWidthWithBounds(pendingWidth);
                }

                saveSplitterSize(DESKTOP_SPLITTER_STORAGE_KEY, LEGACY_DESKTOP_SPLITTER_STORAGE_KEY, appliedListWidth);
            };

            const onUp = (upEvt)=>cleanupDrag(upEvt);
            const onCancel = (cancelEvt)=>cleanupDrag(cancelEvt);
            const onLostCapture = (lostEvt)=>cleanupDrag(lostEvt);

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onCancel);
            splitter.addEventListener('lostpointercapture', onLostCapture);
        });

        splitterH.addEventListener('pointerdown', (evt)=>{
            if (!isMobileLayout()) return;
            evt.preventDefault();
            splitterH.setPointerCapture(evt.pointerId);
            const startY = evt.clientY;
            const startHeight = list.getBoundingClientRect().height;
            appliedListHeight = startHeight;
            const maxHeight = getMobileMaxHeight();
            let pendingHeight = startHeight;
            let rafId = null;
            const queueHeightApply = (value)=>{
                pendingHeight = value;
                if (rafId !== null) return;
                rafId = requestAnimationFrame(()=>{
                    rafId = null;
                    appliedListHeight = applyMobileHeightWithBounds(pendingHeight);
                });
            };
            const onMove = (moveEvt)=>{
                const delta = moveEvt.clientY - startY;
                const nextHeight = Math.min(Math.max(MIN_LIST_HEIGHT, startHeight + delta), maxHeight);
                queueHeightApply(nextHeight);
            };

            const cleanupDrag = (endEvt)=>{
                try {
                    splitterH.releasePointerCapture(endEvt.pointerId);
                } catch {

                }

                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onCancel);
                splitterH.removeEventListener('lostpointercapture', onLostCapture);

                if (rafId !== null) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                    appliedListHeight = applyMobileHeightWithBounds(pendingHeight);
                }

                saveSplitterSize(MOBILE_SPLITTER_STORAGE_KEY, LEGACY_MOBILE_SPLITTER_STORAGE_KEY, appliedListHeight);
            };

            const onUp = (upEvt)=>cleanupDrag(upEvt);
            const onCancel = (cancelEvt)=>cleanupDrag(cancelEvt);
            const onLostCapture = (lostEvt)=>cleanupDrag(lostEvt);

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onCancel);
            splitterH.addEventListener('lostpointercapture', onLostCapture);
        });

        const onLayoutResize = debounce(()=>{
            const isMobile = isMobileLayout();
            if (isMobile === lastLayoutIsMobile) {
                reapplyBoundsForCurrentLayout(isMobile);
                return;
            }
            lastLayoutIsMobile = isMobile;
            restoreSplitterForCurrentLayout();
        }, 120);
        window.addEventListener('resize', onLayoutResize);
        globalThis.addEventListener?.('beforeunload', ()=>{
            window.removeEventListener('resize', onLayoutResize);
        }, { once:true });
    }

    return restoreSplitterForCurrentLayout;
}
