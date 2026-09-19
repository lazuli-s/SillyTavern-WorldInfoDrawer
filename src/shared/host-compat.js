// Host compatibility: which *other* extension's stylesheet is on the page.
//
// The only consumer is section 9 of style.css. A rule lives there because a
// different extension styles an element this drawer also lays out, and it is
// gated on the body class set here so the rule cannot reach a page where that
// extension is absent. This is detection, not measurement: the cost of getting
// it wrong is a rule that does nothing, never a rule that lays something out
// wrongly.
//
// The body-class mechanism is the one this extension already uses to carry host
// state (`body.stwid--` in src/drawer.js, `body.stwid--ams-disabled` in
// index.js), so nothing new is introduced here.

// The <link> Moonlit Echoes injects into <head> for its own theme stylesheet
// (its index.js, `toggleCss()`). The missing "e" in "Echos" is Moonlit's own
// spelling of its own id — it is not a typo here, and correcting it would
// silently turn the gate off forever.
//
// Key on this id and nothing else. Verified in the browser on 18-08-2026: with
// the Moonlit extension disabled, four of its <style> blocks
// (`moonlit-modern-styles`, `moonlit-tab-styles`, `moonlit-section-styles`,
// `moonlit-header-fix-style`) and all 23 of its `css-block-*` elements SURVIVE
// in the document, the `css-block-*` ones emptied of rules. A "does any Moonlit
// element exist" probe therefore reports a false positive and would leave the
// gate on for the rest of the page's life.
const MOONLIT_THEME_LINK_SELECTOR = 'link#MoonlitEchosTheme-style';

/** The class section 9 of style.css gates its Moonlit compensations on. */
const MOONLIT_HOST_CLASS = 'stwid--host-moonlit';

/**
 * Is Moonlit Echoes' theme stylesheet currently loaded?
 *
 * @param {Document} doc
 * @returns {boolean}
 */
const hasMoonlitTheme = (doc) => Boolean(doc.querySelector(MOONLIT_THEME_LINK_SELECTOR));

/**
 * Reads the page once and puts the host-compatibility classes on `<body>` to match.
 *
 * @param {Document} [doc]
 * @returns {boolean} whether Moonlit's theme stylesheet was found
 */
const applyHostCompatibilityClasses = (doc = document) => {
  const present = hasMoonlitTheme(doc);
  doc.body.classList.toggle(MOONLIT_HOST_CLASS, present);
  return present;
};

/**
 * Applies the classes now and keeps them true for the life of the page.
 *
 * Why this watches <head> rather than reading it once at boot: Moonlit's
 * settings drawer carries an "enabled" checkbox whose change handler calls
 * `toggleCss()`, which appends or removes that <link> in the live page with no
 * reload. A one-shot read would leave the gate on after a user unchecks it, and
 * the 2px it compensates for would become 2px of margin missing instead.
 * Disabling Moonlit as an *extension* does need a reload — that is the rarer of
 * the two ways off, and the one round 2 measured.
 *
 * The observer costs a `childList` watch on <head> and one `querySelector` per
 * batch of records. It is deliberately not debounced: the records already
 * arrive batched per microtask, and a gate left stale is a visible defect while
 * a redundant `querySelector` is not.
 *
 * @param {Document} [doc]
 * @returns {{ disconnect: () => void }} stops watching; the classes stay as last applied
 */
const initHostCompatibility = (doc = document) => {
  applyHostCompatibilityClasses(doc);
  const observer = new MutationObserver(() => applyHostCompatibilityClasses(doc));
  observer.observe(doc.head, { childList: true });
  return { disconnect: () => observer.disconnect() };
};

export {
  applyHostCompatibilityClasses,
  hasMoonlitTheme,
  initHostCompatibility,
  MOONLIT_HOST_CLASS,
};
