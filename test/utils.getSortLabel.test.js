import { describe, it, expect } from "vitest";
import { getSortLabel } from "../src/utils.js";
import { SORT, SORT_DIRECTION } from "../src/constants.js";

describe("getSortLabel", () => {
  it("returns expected labels for core sort modes", () => {
    expect(getSortLabel(SORT.CUSTOM, SORT_DIRECTION.ASCENDING)).toBe("Custom");
    expect(getSortLabel(SORT.TITLE, SORT_DIRECTION.ASCENDING)).toBe("Title A-Z");
    expect(getSortLabel(SORT.TITLE, SORT_DIRECTION.DESCENDING)).toBe("Title Z-A");
  });

  it("returns labels for numeric fields in both directions", () => {
    expect(getSortLabel(SORT.POSITION, SORT_DIRECTION.ASCENDING)).toMatch(
      /^Position /,
    );
    expect(getSortLabel(SORT.POSITION, SORT_DIRECTION.DESCENDING)).toMatch(
      /^Position /,
    );
    expect(getSortLabel(SORT.DEPTH, SORT_DIRECTION.ASCENDING)).toMatch(
      /^Depth /,
    );
    expect(getSortLabel(SORT.ORDER, SORT_DIRECTION.DESCENDING)).toMatch(
      /^Order /,
    );
    expect(getSortLabel(SORT.UID, SORT_DIRECTION.ASCENDING)).toMatch(/^UID /);
    expect(getSortLabel(SORT.LENGTH, SORT_DIRECTION.DESCENDING)).toMatch(
      /^Tokens /,
    );
  });

  it("returns undefined for unknown sort", () => {
    const label = getSortLabel("nope", SORT_DIRECTION.ASCENDING);
    expect(label).toBeUndefined();
  });

  it("returns undefined for unknown direction", () => {
    const label = getSortLabel(SORT.TITLE, "nope");
    expect(label).toBeUndefined();
  });
});
