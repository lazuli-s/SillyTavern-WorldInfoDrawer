# CSS Responsive — Rule Examples

Before/after CSS snippets for every rule ID.

---

## RESP — Responsive Units

### RESP-01: Use fluid units for panel widths and heights

```css
/* FAIL — fixed width on a panel */
.stwid--list {
  width: 320px;
}

/* PASS — fluid width, shrinks with the viewport */
.stwid--list {
  width: 30%;
}
```

```css
/* FAIL — fixed height on a scrollable container */
.stwid--entry-list {
  height: 600px;
  overflow-y: auto;
}

/* PASS — fills available space */
.stwid--entry-list {
  height: 100%;
  overflow-y: auto;
}
```

### RESP-02: Fixed pixel widths must include max-width: 100%

```css
/* FAIL — 400px can overflow a 375px phone screen */
.stwid--filter-row {
  width: 400px;
}

/* PASS — can't exceed the viewport */
.stwid--filter-row {
  width: 400px;
  max-width: 100%;
}
```

### RESP-03: Don't use fixed min-width on major layout regions

```css
/* FAIL — forces list to stay 280px wide, breaks mobile */
.stwid--list {
  min-width: 280px;
}

/* PASS — allows shrinking inside the flex container */
.stwid--list {
  min-width: 0;
}
```

---

## BRK — Breakpoints

### BRK-01: Use ST-mirrored breakpoint values only

```css
/* FAIL — 700px is not a ST breakpoint */
@media screen and (max-width: 700px) {
  .stwid--list { width: 100%; }
}

/* PASS — matches ST's primary mobile threshold */
@media screen and (max-width: 1000px) {
  .stwid--list { width: 100%; }
}
```

### BRK-02: Every new row-direction flex container needs a mobile block

```css
/* FAIL — missing mobile override */
.stwid--drawer {
  display: flex;
  flex-direction: row;
}

/* PASS — mobile override present */
.stwid--drawer {
  display: flex;
  flex-direction: row;
}

@media screen and (max-width: 1000px) {
  .stwid--drawer {
    flex-direction: column;
  }
}
```

### BRK-03: Never use min-width media queries

```css
/* FAIL — mobile-first syntax, inconsistent with ST */
@media screen and (min-width: 1001px) {
  .stwid--list { width: 30%; }
}

/* PASS — desktop-first syntax, matching ST */
.stwid--list {
  width: 30%;
}

@media screen and (max-width: 1000px) {
  .stwid--list { width: 100%; }
}
```

### BRK-04: Place @media blocks directly after their source section

```css
/* FAIL — media block at end of file, far from its source */

/* ... 500 lines of other CSS ... */

@media screen and (max-width: 1000px) {
  .stwid--drawer { flex-direction: column; }
  .stwid--list { width: 100%; }
}

/* PASS — media block immediately follows Section 1 */

/* 1) Drawer */
.stwid--drawer {
  display: flex;
  flex-direction: row;
}

@media screen and (max-width: 1000px) {
  .stwid--drawer { flex-direction: column; }
}

/* 2) List Panel */
/* ... */
```

---

## OVF — Overflow

### OVF-01: Never allow horizontal overflow at the drawer level

```css
/* FAIL — wide child can push drawer past viewport */
.stwid--drawer {
  display: flex;
}

/* PASS — clip at the drawer boundary */
.stwid--drawer {
  display: flex;
  overflow-x: hidden;
}
```

### OVF-02: Wide tables need a scrollable wrapper, not overflow on the table

```css
/* FAIL — overflow on the table itself */
.stwid--orderTable {
  overflow-x: auto;
}

/* PASS — overflow on the container div */
.stwid--orderTableWrap {
  overflow-x: auto;
}

.stwid--orderTable {
  min-width: max-content; /* table stays at its natural width */
}
```

### OVF-03: Long text must not silently widen its container

```css
/* FAIL — long entry title can push the list panel wider */
.stwid--entry-title {
  font-size: 0.9em;
}

/* PASS — clamp with ellipsis */
.stwid--entry-title {
  font-size: 0.9em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

## LAY — Layout

### LAY-01: Side-by-side flex containers must stack on mobile

```css
/* FAIL — no mobile override */
#WorldInfo .stwid--body {
  display: flex;
  flex-direction: row;
}

/* PASS */
#WorldInfo .stwid--body {
  display: flex;
  flex-direction: row;
}

@media screen and (max-width: 1000px) {
  #WorldInfo .stwid--body {
    flex-direction: column;
  }
}
```

### LAY-02: List and editor panels become full-width on mobile

```css
/* FAIL — fixed panel widths remain on mobile */
.stwid--list { width: 30%; }
.stwid--editor { flex: 1; }

/* PASS — both panels fill full width on mobile */
.stwid--list { width: 30%; }
.stwid--editor { flex: 1; }

@media screen and (max-width: 1000px) {
  .stwid--list {
    width: 100%;
    max-width: none;
  }

  .stwid--editor {
    width: 100%;
  }
}
```

### LAY-03: Hide the vertical splitter on mobile

```css
/* The vertical (left/right) splitter is meaningless when panels stack */

@media screen and (max-width: 1000px) {
  .stwid--splitter {
    display: none;
  }

  /* The horizontal mobile splitter is shown via a separate element */
  .stwid--splitter-h {
    display: block;
  }
}

/* On desktop: hide the horizontal splitter */
.stwid--splitter-h {
  display: none;
}
```

### LAY-04: Control rows must wrap on mobile

```css
/* FAIL — controls clip off-screen on narrow widths */
.stwid--sortingRow {
  display: flex;
  flex-direction: row;
}

/* PASS — controls wrap to the next line */
.stwid--sortingRow {
  display: flex;
  flex-direction: row;
}

@media screen and (max-width: 1000px) {
  .stwid--sortingRow {
    flex-wrap: wrap;
  }
}
```

### LAY-05: Order Helper table uses a scrollable wrapper on mobile

```css
/* PASS — horizontal scroll on the wrapper, not the table */
@media screen and (max-width: 1000px) {
  .stwid--orderTableWrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .stwid--orderHelper {
    width: 100%;
    max-width: none;
  }
}
```
