import { beforeEach, describe, expect, it } from "vitest";
import { CURRENT_STORE_KEY, migrate, readBlob, writeBlob } from "./storage";

describe("migrate", () => {
  it("passes a well-formed blob through unchanged", () => {
    expect(migrate({ price: 450000, ftb: true }, CURRENT_STORE_KEY)).toEqual({
      price: 450000,
      ftb: true,
    });
  });

  it("resets on a non-object", () => {
    // A corrupted or hand-edited value must not take the app down: the user loses stored inputs
    // and gets defaults, which is recoverable. Throwing here would break every page at once.
    expect(migrate("nonsense", CURRENT_STORE_KEY)).toEqual({});
    expect(migrate(42, CURRENT_STORE_KEY)).toEqual({});
    expect(migrate(null, CURRENT_STORE_KEY)).toEqual({});
    expect(migrate(undefined, CURRENT_STORE_KEY)).toEqual({});
  });

  it("resets on an array, which is an object but not a blob", () => {
    expect(migrate([1, 2, 3], CURRENT_STORE_KEY)).toEqual({});
  });
});

describe("corrupted blob self-heal", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("readBlob returns {} for a corrupted blob rather than throwing", () => {
    window.localStorage.setItem(CURRENT_STORE_KEY, "not json");
    expect(() => readBlob()).not.toThrow();
    expect(readBlob()).toEqual({});
  });

  it("writeBlob overwrites a corrupted blob with valid JSON containing only the patch", () => {
    window.localStorage.setItem(CURRENT_STORE_KEY, "not json");
    writeBlob({ price: 1 });
    const stored = window.localStorage.getItem(CURRENT_STORE_KEY);
    expect(() => JSON.parse(stored ?? "")).not.toThrow();
    expect(JSON.parse(stored ?? "")).toEqual({ price: 1 });
  });
});
