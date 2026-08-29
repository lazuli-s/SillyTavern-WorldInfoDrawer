// COMPAT-01 exception: SillyTavern.getContext() does not expose debounce, so this
// module intentionally imports the host utility directly (via the shared adapter).
import { debounce } from './shared/st-host.js';

const DESKTOP_SPLITTER_STORAGE_KEY = 'stwid--splitter-size';
const LEGACY_DESKTOP_SPLITTER_STORAGE_KEY = 'stwid--list-width';
const MOBILE_LAYOUT_BREAKPOINT = 1000;
const MIN_LIST_WIDTH = 150;
const MIN_EDITOR_WIDTH = 300;
const SPLITTER_THICKNESS_FALLBACK_PX = 6;

const isMobileLayout = () => window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// The host keeps #WorldInfo hidden until the drawer opens, so panels inside it
// measure 0px on every axis. Measuring or persisting sizes in that state writes
// degenerate values over the user's saved width; the restore is re-run by the
// drawer-open observer once real sizes exist.
const isListRendered = (listEl) => listEl.getBoundingClientRect().width > 0;

const getStoredSplitterSize = (primaryKey, legacyKey) => {
  const primaryValue = Number.parseInt(localStorage.getItem(primaryKey) ?? '', 10);
  if (!Number.isNaN(primaryValue)) return primaryValue;

  const legacyValue = Number.parseInt(localStorage.getItem(legacyKey) ?? '', 10);
  if (Number.isNaN(legacyValue)) return Number.NaN;

  localStorage.setItem(primaryKey, String(Math.round(legacyValue)));
  return legacyValue;
};

const saveSplitterSize = (primaryKey, legacyKey, value) => {
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

function getMaxListSizeForLayout(bodyEl, splitterEl, minListSize, minEditorSize) {
  const splitterThickness =
    splitterEl.getBoundingClientRect().width || SPLITTER_THICKNESS_FALLBACK_PX;
  const bodySize = bodyEl.getBoundingClientRect().width;
  const maxSize = bodySize - splitterThickness - minEditorSize;
  if (maxSize >= minListSize) return maxSize;
  return Math.max(0, maxSize);
}

function getDefaultListSizeForLayout(bodyEl, ratio, fallbackPx, minListSize, getMaxListSize) {
  const preferred = Math.round(bodyEl.getBoundingClientRect().width * ratio) || fallbackPx;
  return clamp(preferred, minListSize, getMaxListSize());
}

function applyListSizeCss(value, minValue, appliedValue, list) {
  const clamped = Number.isFinite(value) ? value : minValue;
  const sizeValue = `${clamped}px`;

  if (
    clamped === appliedValue &&
    list.style.flexBasis === sizeValue &&
    list.style.width === sizeValue &&
    !list.style.height
  ) {
    return clamped;
  }
  if (list.style.height) list.style.height = '';
  if (list.style.flexBasis !== sizeValue) list.style.flexBasis = sizeValue;
  if (list.style.width !== sizeValue) list.style.width = sizeValue;
  return clamped;
}

// Desktop drag writes inline width/flex-basis/height onto the list panel. Those inline
// values outrank the mobile stylesheet rule (.stwid--list { width: 100% }), so they must be
// cleared when the layout crosses into mobile or the panel keeps a stale desktop width.
// Idempotent: clearing already-empty styles is harmless on repeated resize events.
function clearListSizeCssForMobile(list) {
  if (list.style.width) list.style.width = '';
  if (list.style.flexBasis) list.style.flexBasis = '';
  if (list.style.height) list.style.height = '';
}

function applyListSizeWithBounds(value, minValue, getMaxSize, applyListSize, setAppliedValue) {
  const bounded = clamp(value, minValue, getMaxSize());
  const appliedValue = applyListSize(bounded);
  setAppliedValue(appliedValue);
  return appliedValue;
}

// Tears down exactly the listeners one drag session registered. Split out of
// the session helper so both stay under the 50-line guideline; the pending-frame
// flush stays with the session because it mutates the shared `rafId`.
function removeSplitterDragListeners(splitterEl, handlers, endEvt) {
  try {
    splitterEl.releasePointerCapture(endEvt.pointerId);
  } catch {}

  window.removeEventListener('pointermove', handlers.onMove);
  window.removeEventListener('pointerup', handlers.onUp);
  window.removeEventListener('pointercancel', handlers.onCancel);
  splitterEl.removeEventListener('lostpointercapture', handlers.onLostCapture);
}

// One pointerdown starts one drag session: it owns the per-drag state
// (`pendingSize`/`rafId`), the frame-scheduled apply, and removes exactly the
// listeners it registers here.
function beginSplitterDragSession({
  splitterEl,
  getStartCoord,
  startCoord,
  startSize,
  minSize,
  maxSize,
  applyWithBounds,
  saveAppliedSize,
  setAppliedSize,
}) {
  let pendingSize = startSize;
  let rafId = null;

  const queueApply = (value) => {
    pendingSize = value;
    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      setAppliedSize(applyWithBounds(pendingSize));
    });
  };

  const onMove = (moveEvt) => {
    const delta = getStartCoord(moveEvt) - startCoord;
    const nextSize = Math.min(Math.max(minSize, startSize + delta), maxSize);
    queueApply(nextSize);
  };

  const cleanupSplitterDrag = (endEvt) => {
    removeSplitterDragListeners(splitterEl, { onMove, onUp, onCancel, onLostCapture }, endEvt);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      setAppliedSize(applyWithBounds(pendingSize));
    }

    saveAppliedSize();
  };

  const onUp = (upEvt) => cleanupSplitterDrag(upEvt);
  const onCancel = (cancelEvt) => cleanupSplitterDrag(cancelEvt);
  const onLostCapture = (lostEvt) => cleanupSplitterDrag(lostEvt);

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  splitterEl.addEventListener('lostpointercapture', onLostCapture);
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
  const createPointerDownHandler = () =>
    function onSplitterPointerDown(evt) {
      if (!shouldHandleDrag()) return;
      evt.preventDefault();
      splitterEl.setPointerCapture(evt.pointerId);

      // The synchronous snapshot must precede delegation: a pointermove can
      // fire between registration and the first scheduled frame.
      const startCoord = getStartCoord(evt);
      const startSize = getStartSize();
      setAppliedSize(startSize);
      const maxSize = getMaxSize();

      beginSplitterDragSession({
        splitterEl,
        getStartCoord,
        startCoord,
        startSize,
        minSize,
        maxSize,
        applyWithBounds,
        saveAppliedSize,
        setAppliedSize,
      });
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
    shouldHandleDrag: () => !isMobileLayout(),
    getStartCoord: (evt) => evt.clientX,
    getStartSize: () => list.getBoundingClientRect().width,
    minSize: MIN_LIST_WIDTH,
    getMaxSize: getDesktopMaxWidth,
    applyWithBounds: applyDesktopWidthWithBounds,
    saveAppliedSize: () => {
      saveSplitterSize(
        DESKTOP_SPLITTER_STORAGE_KEY,
        LEGACY_DESKTOP_SPLITTER_STORAGE_KEY,
        getAppliedListWidth(),
      );
    },
    setAppliedSize: setAppliedListWidth,
  });
}

function attachLayoutResizeHandler(
  getLastLayoutIsMobile,
  setLastLayoutIsMobile,
  reapplyBoundsForCurrentLayout,
  restoreSplitterForCurrentLayout,
) {
  const onLayoutResize = debounce(() => {
    const isMobile = isMobileLayout();
    if (isMobile === getLastLayoutIsMobile()) {
      reapplyBoundsForCurrentLayout(isMobile);
      return;
    }

    setLastLayoutIsMobile(isMobile);
    restoreSplitterForCurrentLayout();
  }, 120);

  window.addEventListener('resize', onLayoutResize);
  globalThis.addEventListener?.(
    'beforeunload',
    () => {
      window.removeEventListener('resize', onLayoutResize);
    },
    { once: true },
  );
}

function createSplitterSizingHelpers(body, list, desktopSplitter) {
  let appliedListWidth = MIN_LIST_WIDTH;

  const getDesktopMaxWidth = () =>
    getMaxListSizeForLayout(body, desktopSplitter, MIN_LIST_WIDTH, MIN_EDITOR_WIDTH);

  const getDefaultDesktopWidth = () =>
    getDefaultListSizeForLayout(body, 0.34, 300, MIN_LIST_WIDTH, getDesktopMaxWidth);

  const applyListWidth = (value) => applyListSizeCss(value, MIN_LIST_WIDTH, appliedListWidth, list);

  const setAppliedListWidth = (value) => {
    appliedListWidth = value;
  };

  const applyDesktopWidthWithBounds = (value) =>
    applyListSizeWithBounds(
      value,
      MIN_LIST_WIDTH,
      getDesktopMaxWidth,
      applyListWidth,
      setAppliedListWidth,
    );

  const applyOrientationDefault = () => {
    const defaultWidth = applyDesktopWidthWithBounds(getDefaultDesktopWidth());
    saveSplitterSize(
      DESKTOP_SPLITTER_STORAGE_KEY,
      LEGACY_DESKTOP_SPLITTER_STORAGE_KEY,
      defaultWidth,
    );
  };

  const reapplyBoundsForCurrentLayout = (mobileLayout) => {
    if (mobileLayout) return;
    if (!isListRendered(list)) return;

    const previousWidth = appliedListWidth;
    const nextWidth = applyDesktopWidthWithBounds(previousWidth);
    if (nextWidth !== previousWidth) {
      saveSplitterSize(
        DESKTOP_SPLITTER_STORAGE_KEY,
        LEGACY_DESKTOP_SPLITTER_STORAGE_KEY,
        nextWidth,
      );
    }
  };

  return {
    getDesktopMaxWidth,
    getDefaultDesktopWidth,
    applyDesktopWidthWithBounds,
    applyOrientationDefault,
    reapplyBoundsForCurrentLayout,
    getAppliedListWidth: () => appliedListWidth,
    setAppliedListWidth,
  };
}

function createRestoreSplitterForCurrentLayout({
  list,
  applyOrientationDefault,
  applyDesktopWidthWithBounds,
}) {
  return function restoreSplitterForCurrentLayout() {
    if (isMobileLayout()) {
      clearListSizeCssForMobile(list);
      return;
    }
    if (!isListRendered(list)) return;

    const storedWidth = getStoredSplitterSize(
      DESKTOP_SPLITTER_STORAGE_KEY,
      LEGACY_DESKTOP_SPLITTER_STORAGE_KEY,
    );
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
  const restoreSplitterForCurrentLayout = createRestoreSplitterForCurrentLayout({
    list,
    ...sizingHelpers,
  });

  attachDesktopSplitterDragHandlers({
    desktopSplitter,
    list,
    getDesktopMaxWidth: sizingHelpers.getDesktopMaxWidth,
    applyDesktopWidthWithBounds: sizingHelpers.applyDesktopWidthWithBounds,
    getAppliedListWidth: sizingHelpers.getAppliedListWidth,
    setAppliedListWidth: sizingHelpers.setAppliedListWidth,
  });

  attachLayoutResizeHandler(
    () => lastLayoutIsMobile,
    (value) => {
      lastLayoutIsMobile = value;
    },
    sizingHelpers.reapplyBoundsForCurrentLayout,
    restoreSplitterForCurrentLayout,
  );

  return restoreSplitterForCurrentLayout;
}
