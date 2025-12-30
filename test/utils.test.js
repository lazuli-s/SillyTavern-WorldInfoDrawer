import { describe, it, expect } from "vitest";
import { safeToSorted, createDeferred } from "../src/utils.js";

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
});

describe("createDeferred", () => {
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
