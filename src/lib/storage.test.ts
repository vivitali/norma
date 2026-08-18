import { describe, expect, it } from "vitest";
import { migrate } from "./storage";

describe("migrate", () => {
  it("passes a well-formed blob through unchanged", () => {
    expect(migrate({ price: 450000, ftb: true })).toEqual({ price: 450000, ftb: true });
  });

  it("resets on a non-object", () => {
    // A corrupted or hand-edited value must not take the app down: the user loses stored inputs
    // and gets defaults, which is recoverable. Throwing here would break every page at once.
    expect(migrate("nonsense")).toEqual({});
    expect(migrate(42)).toEqual({});
    expect(migrate(null)).toEqual({});
    expect(migrate(undefined)).toEqual({});
  });

  it("resets on an array, which is an object but not a blob", () => {
    expect(migrate([1, 2, 3])).toEqual({});
  });
});
