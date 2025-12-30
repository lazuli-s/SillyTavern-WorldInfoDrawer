import { describe, it, expect } from "vitest";
import { getSortLabel } from "../src/utils.js";
import { SORT, SORT_DIRECTION } from "../src/constants.js";

describe("getSortLabel", () => {
  it("returns the correct label for a valid sort/direction", () => {
    const label = getSortLabel(SORT.TITLE, SORT_DIRECTION.ASCENDING);
    expect(label).toBe("Title A-Z");
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
