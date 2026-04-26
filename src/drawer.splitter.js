// COMPAT-01 exception: SillyTavern.getContext() does not expose debounce, so this
// module intentionally imports the host utility directly from the most specific path.
import { debounce } from '../../../../utils.js';

const DESKTOP_SPLITTER_STORAGE_KEY = 'stwid--splitter-size';
const LEGACY_DESKTOP_SPLITTER_STORAGE_KEY = 'stwid--list-width';
const MOBILE_LAYOUT_BREAKPOINT = 1000;
const MIN_LIST_WIDTH = 150;
const MIN_EDITOR_WIDTH = 300;
const SPLITTER_THICKNESS_FALLBACK_PX = 6;

const isMobileLayout = ()=>window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT;
const clamp = (value, min, max)=>Math.min(Math.max(value, min), max);

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

function createSplitters(body) {
    const desktopSplitter = document.createElement('div');
    desktopSplitter.classList.add('stwid--splitter');
    body.append(desktopSplitter);

    return { desktopSplitter };
}

function getMaxListSizeForLayout(bodyEl, splitterEl, minListSize, minEditorSize, measureAxis) {
    const splitterThickness = splitterEl.getBoundingClientRect()[measureAxis] || SPLITTER_THICKNESS_FALLBACK_PX;
    const bodySize = bodyEl.getBoundingClientRect()[measureAxis];
    const maxSize = bodySize - splitterThickness - minEditorSize;
    if (maxSize >= minListSize) return maxSize;
    return Math.max(0, maxSize);
}

function getDefaultListSizeForLayout(bodyEl, ratio, fallbackPx, minListSize, getMaxListSize, measureAxis) {
    const preferred = Math.round(bodyEl.getBoundingClientRect()[measureAxis] * ratio) || fallbackPx;
    return clamp(preferred, minListSize, getMaxListSize());
}

function applyListSizeCss(value, minValue, axis, appliedValue, list) {
    const clamped = Number.isFinite(value) ? value : minValue;
    const sizeValue = `${clamped}px`;

    if (axis === 'width') {
        if (clamped === appliedValue && list.style.flexBasis === sizeValue && list.style.width === sizeValue && !list.style.height) {
            return clamped;
        }
        if (list.style.height) list.style.height = '';
        if (list.style.flexBasis !== sizeValue) list.style.flexBasis = sizeValue;
        if (list.style.width !== sizeValue) list.style.width = sizeValue;
        return clamped;
    }

    if (clamped === appliedValue && list.style.height === sizeValue && !list.style.width && !list.style.flexBasis) {
        return clamped;
    }
    if (list.style.width) list.style.width = '';
    if (list.style.flexBasis) list.style.flexBasis = '';
    if (list.style.height !== sizeValue) list.style.height = sizeValue;
    return clamped;
}

function applyListSizeWithBounds(value, minValue, getMaxSize, applyListSize, setAppliedValue) {
    const bounded = clamp(value, minValue, getMaxSize());
    const appliedValue = applyListSize(bounded);
    setAppliedValue(appliedValue);
    return appliedValue;
}

function attachSplitterPointerDragHandlers({
    splitterEl,
    shouldHandleDrag,
    getStartCoord,
    getStartSize,
    minSize,
    getMaxSize,
    applyWithBounds,
    saveAppliedSize,
    setAppliedSize,
}) {
    const createPointerDownHandler = ()=>function onSplitterPointerDown(evt) {
        if (!shouldHandleDrag()) return;
        evt.preventDefault();
        splitterEl.setPointerCapture(evt.pointerId);

        const startCoord = getStartCoord(evt);
        const startSize = getStartSize();
        setAppliedSize(startSize);
        const maxSize = getMaxSize();

        let pendingSize = startSize;
        let rafId = null;

        const queueApply = (value)=>{
            pendingSize = value;
            if (rafId !== null) return;

            rafId = requestAnimationFrame(()=>{
                rafId = null;
                setAppliedSize(applyWithBounds(pendingSize));
            });
        };

        const onMove = (moveEvt)=>{
            const delta = getStartCoord(moveEvt) - startCoord;
            const nextSize = Math.min(Math.max(minSize, startSize + delta), maxSize);
            queueApply(nextSize);
        };

        const cleanupSplitterDrag = (endEvt)=>{
            try {
                splitterEl.releasePointerCapture(endEvt.pointerId);
            } catch {

            }

            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            splitterEl.removeEventListener('lostpointercapture', onLostCapture);

            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
                setAppliedSize(applyWithBounds(pendingSize));
            }

            saveAppliedSize();
        };

        const onUp = (upEvt)=>cleanupSplitterDrag(upEvt);
        const onCancel = (cancelEvt)=>cleanupSplitterDrag(cancelEvt);
        const onLostCapture = (lostEvt)=>cleanupSplitterDrag(lostEvt);

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        splitterEl.addEventListener('lostpointercapture', onLostCapture);
    };

    const pointerDownHandler = createPointerDownHandler();
    splitterEl.addEventListener('pointerdown', pointerDownHandler);
}

function attachDesktopSplitterDragHandlers({
    desktopSplitter,
    list,
    getDesktopMaxWidth,
    applyDesktopWidthWithBounds,
    getAppliedListWidth,
    setAppliedListWidth,
}) {
    attachSplitterPointerDragHandlers({
        splitterEl: desktopSplitter,
        shouldHandleDrag: ()=>!isMobileLayout(),
        getStartCoord: (evt)=>evt.clientX,
        getStartSize: ()=>list.getBoundingClientRect().width,
        minSize: MIN_LIST_WIDTH,
        getMaxSize: getDesktopMaxWidth,
        applyWithBounds: applyDesktopWidthWithBounds,
        saveAppliedSize: ()=>{
            saveSplitterSize(DESKTOP_SPLITTER_STORAGE_KEY, LEGACY_DESKTOP_SPLITTER_STORAGE_KEY, getAppliedListWidth());
        },
        setAppliedSize: setAppliedListWidth,
    });
}

function attachLayoutResizeHandler(getLastLayoutIsMobile, setLastLayoutIsMobile, reapplyBoundsForCurrentLayout, restoreSplitterForCurrentLayout) {
    const onLayoutResize = debounce(()=>{
        const isMobile = isMobileLayout();
        if (isMobile === getLastLayoutIsMobile()) {
            reapplyBoundsForCurrentLayout(isMobile);
            return;
        }

        setLastLayoutIsMobile(isMobile);
        restoreSplitterForCurrentLayout();
    }, 120);

    window.addEventListener('resize', onLayoutResize);
    globalThis.addEventListener?.('beforeunload', ()=>{
        window.removeEventListener('resize', onLayoutResize);
    }, { once:true });
}

function createSplitterSizingHelpers(body, list, desktopSplitter) {
    let appliedListWidth = MIN_LIST_WIDTH;

    const getDesktopMaxWidth = ()=>getMaxListSizeForLayout(
        body,
        desktopSplitter,
        MIN_LIST_WIDTH,
        MIN_EDITOR_WIDTH,
        'width',
    );

    const getDefaultDesktopWidth = ()=>getDefaultListSizeForLayout(
        body,
        0.34,
        300,
        MIN_LIST_WIDTH,
        getDesktopMaxWidth,
        'width',
    );

    const applyListWidth = (value)=>applyListSizeCss(value, MIN_LIST_WIDTH, 'width', appliedListWidth, list);

    const setAppliedListWidth = (value)=>{
        appliedListWidth = value;
    };

    const applyDesktopWidthWithBounds = (value)=>applyListSizeWithBounds(
        value,
        MIN_LIST_WIDTH,
        getDesktopMaxWidth,
        applyListWidth,
        setAppliedListWidth,
    );

    const applyOrientationDefault = ()=>{
        const defaultWidth = applyDesktopWidthWithBounds(getDefaultDesktopWidth());
        saveSplitterSize(DESKTOP_SPLITTER_STORAGE_KEY, LEGACY_DESKTOP_SPLITTER_STORAGE_KEY, defaultWidth);
    };

    const reapplyBoundsForCurrentLayout = (mobileLayout)=>{
        if (mobileLayout) return;

        const previousWidth = appliedListWidth;
        const nextWidth = applyDesktopWidthWithBounds(previousWidth);
        if (nextWidth !== previousWidth) {
            saveSplitterSize(DESKTOP_SPLITTER_STORAGE_KEY, LEGACY_DESKTOP_SPLITTER_STORAGE_KEY, nextWidth);
        }
    };

    return {
        getDesktopMaxWidth,
        getDefaultDesktopWidth,
        applyDesktopWidthWithBounds,
        applyOrientationDefault,
        reapplyBoundsForCurrentLayout,
        getAppliedListWidth: ()=>appliedListWidth,
        setAppliedListWidth,
    };
}

function createRestoreSplitterForCurrentLayout({
    applyOrientationDefault,
    applyDesktopWidthWithBounds,
}) {
    return function restoreSplitterForCurrentLayout() {
        if (isMobileLayout()) return;

        const storedWidth = getStoredSplitterSize(DESKTOP_SPLITTER_STORAGE_KEY, LEGACY_DESKTOP_SPLITTER_STORAGE_KEY);
        if (Number.isNaN(storedWidth)) {
            applyOrientationDefault();
            return;
        }

        applyDesktopWidthWithBounds(storedWidth);
    };
}

export function initSplitter(body, list) {
    const { desktopSplitter } = createSplitters(body);
    let lastLayoutIsMobile = isMobileLayout();

    const sizingHelpers = createSplitterSizingHelpers(body, list, desktopSplitter);
    const restoreSplitterForCurrentLayout = createRestoreSplitterForCurrentLayout(sizingHelpers);

    attachDesktopSplitterDragHandlers({
        desktopSplitter,
        list,
        getDesktopMaxWidth: sizingHelpers.getDesktopMaxWidth,
        applyDesktopWidthWithBounds: sizingHelpers.applyDesktopWidthWithBounds,
        getAppliedListWidth: sizingHelpers.getAppliedListWidth,
        setAppliedListWidth: sizingHelpers.setAppliedListWidth,
    });

    attachLayoutResizeHandler(
        ()=>lastLayoutIsMobile,
        (value)=>{
            lastLayoutIsMobile = value;
        },
        sizingHelpers.reapplyBoundsForCurrentLayout,
        restoreSplitterForCurrentLayout,
    );

    return restoreSplitterForCurrentLayout;
}
