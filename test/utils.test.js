import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendSortOptions,
  createDeferred,
  safeToSorted,
} from "../src/utils.js";
import { SORT, SORT_DIRECTION } from "../src/constants.js";

describe("appendSortOptions", () => {
  let originalDocument;

  afterEach(() => {
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
    vi.restoreAllMocks();
  });

  it("appends options and marks the matching sort+direction as selected", () => {
    originalDocument = globalThis.document;
    const select = {
      options: [],
      append(option) {
        this.options.push(option);
      },
    };

    globalThis.document = {
      createElement: vi.fn(() => ({
        value: "",
        textContent: "",
        selected: false,
      })),
    };

    appendSortOptions(select, SORT.UID, SORT_DIRECTION.DESCENDING);

    expect(select.options.length).toBeGreaterThan(0);

    const selected = select.options.filter((option) => option.selected);
    expect(selected).toHaveLength(1);

    const selectedValue = JSON.parse(selected[0].value);
    expect(selectedValue).toEqual({
      sort: SORT.UID,
      direction: SORT_DIRECTION.DESCENDING,
    });
  });
});

describe("safeToSorted", () => {
  it("sorts numbers and does NOT change the original array", () => {
    const original = [3, 1, 2];

    const sorted = safeToSorted(original, (a, b) => a - b);

    expect(sorted).toEqual([1, 2, 3]);
    expect(original).toEqual([3, 1, 2]); // original unchanged
  });

  it("works with objects too", () => {
    const original = [{ n: 2 }, { n: 1 }, { n: 3 }];

    const sorted = safeToSorted(original, (a, b) => a.n - b.n);

    expect(sorted.map((x) => x.n)).toEqual([1, 2, 3]);
    expect(original.map((x) => x.n)).toEqual([2, 1, 3]); // original unchanged
  });

  it("handles empty arrays", () => {
    const arr = [];
    const result = safeToSorted(arr, () => 0);
    expect(result).toEqual([]);
  });

  it("handles arrays with one element", () => {
    const arr = [42];
    const result = safeToSorted(arr, () => 0);
    expect(result).toEqual([42]);
  });

  it("uses slice().sort fallback when toSorted is unavailable on the array instance", () => {
    const arr = [3, 2, 1];
    arr.toSorted = undefined;

    const result = safeToSorted(arr, (a, b) => a - b);

    expect(result).toEqual([1, 2, 3]);
    expect(arr).toEqual([3, 2, 1]);
  });
});

describe("createDeferred", () => {
  it("returns a promise with externally controlled resolve/reject functions", () => {
    const d = createDeferred();

    expect(typeof d.resolve).toBe("function");
    expect(typeof d.reject).toBe("function");
    expect(d.promise).toBeInstanceOf(Promise);
  });

  it("lets you resolve a promise from the outside", async () => {
    const d = createDeferred();

    d.resolve("ok");

    await expect(d.promise).resolves.toBe("ok");
  });

  it("lets you reject a promise from the outside", async () => {
    const d = createDeferred();

    d.reject(new Error("nope"));

    await expect(d.promise).rejects.toThrow("nope");
  });
});
