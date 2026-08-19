import { beforeEach, describe, expect, it } from "vitest";
import {
  coerceStored,
  migrateV1,
  readStored,
  STORE_KEY_V1,
  STORE_KEY_V2,
  writeStored,
} from "./storage";
import { AFFORDABILITY_KEYS } from "./shared-inputs";

beforeEach(() => window.localStorage.clear());

describe("coerceStored", () => {
  it("keeps well-typed values", () => {
    expect(coerceStored({ price: 500000, ftb: false, ptype: "condo" })).toEqual({
      price: 500000,
      ftb: false,
      ptype: "condo",
    });
  });
  it("drops a value of the wrong type rather than casting it", () => {
    expect(coerceStored({ price: "lots", ftb: "yes" })).toEqual({});
  });
  it("drops an unknown key", () => {
    expect(coerceStored({ notAKey: 1 })).toEqual({});
  });
  it("drops a stale enum member", () => {
    // A stale ptype used to blank the Select silently, leaving a control with
    // no visible value and no way to tell why.
    expect(coerceStored({ ptype: "duplex" })).toEqual({});
  });
  it("drops a jurisdiction id that no longer exists", () => {
    expect(coerceStored({ jurId: "atlantis" })).toEqual({});
    expect(coerceStored({ jurId: "toronto" })).toEqual({ jurId: "toronto" });
  });
  it("keeps null on a nullable key and drops it on a non-nullable one", () => {
    expect(coerceStored({ price: null })).toEqual({ price: null });
    expect(coerceStored({ dpPct: null })).toEqual({});
  });
  it("drops a non-finite number", () => {
    expect(coerceStored({ price: Number.NaN })).toEqual({});
  });
  it("clamps to the schema bounds", () => {
    expect(coerceStored({ dpPct: 140 })).toEqual({ dpPct: 100 });
    expect(coerceStored({ income1: -5 })).toEqual({ income1: 0 });
  });
  it("accepts a valid depth and rejects an invalid one", () => {
    expect(coerceStored({ depth: 2 })).toEqual({ depth: 2 });
    expect(coerceStored({ depth: 7 })).toEqual({});
  });
  it("returns {} for a non-object", () => {
    for (const raw of [null, 42, "x", []]) expect(coerceStored(raw)).toEqual({});
  });
});

describe("migrateV1", () => {
  it("moves debts to otherDebt", () => {
    expect(migrateV1({ debts: 300 }).otherDebt).toBe(300);
    expect("debts" in migrateV1({ debts: 300 })).toBe(false);
  });
  it("drops the old universal price literal so the city benchmark takes over", () => {
    // v1 wrote every key on first render, so a returning user who never touched
    // price has 450000 stored. The blob cannot distinguish touched from
    // untouched; equality with the old default is the only available signal.
    expect(migrateV1({ price: 450000 }).price).toBeNull();
  });
  it("keeps any other price as a real edit", () => {
    expect(migrateV1({ price: 512000 }).price).toBe(512000);
  });
  it("drops the old universal rate literal", () => {
    expect(migrateV1({ contractRate: 4.29 }).contractRate).toBeNull();
  });
  it("keeps any other rate as a deliberate override", () => {
    expect(migrateV1({ contractRate: 5.5 }).contractRate).toBe(5.5);
  });
  it("leaves new keys absent so they derive", () => {
    const out = migrateV1({ price: 450000 });
    for (const key of ["funds", "save", "car", "student", "cc", "depth"]) {
      expect(out[key]).toBeUndefined();
    }
  });
});

describe("readStored", () => {
  it("migrates a v1 blob on first read and writes v2", () => {
    window.localStorage.setItem(
      STORE_KEY_V1,
      JSON.stringify({
        price: 450000,
        contractRate: 4.29,
        debts: 300,
        income1: 82000,
        ptype: "condo",
      }),
    );
    const out = readStored(AFFORDABILITY_KEYS);
    expect(out.price).toBeNull();
    expect(out.contractRate).toBeNull();
    expect(out.otherDebt).toBe(300);
    expect(out.income1).toBe(82000);
    expect(out.ptype).toBe("condo");
    expect(window.localStorage.getItem(STORE_KEY_V2)).not.toBeNull();
  });

  it("leaves v1 in place, so the migration is re-runnable while it is new", () => {
    window.localStorage.setItem(STORE_KEY_V1, JSON.stringify({ debts: 300 }));
    readStored(AFFORDABILITY_KEYS);
    expect(window.localStorage.getItem(STORE_KEY_V1)).not.toBeNull();
  });

  it("prefers v2 when both exist", () => {
    window.localStorage.setItem(STORE_KEY_V1, JSON.stringify({ income1: 1 }));
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ income1: 2 }));
    expect(readStored(AFFORDABILITY_KEYS).income1).toBe(2);
  });

  it("returns {} for unparseable content instead of throwing", () => {
    window.localStorage.setItem(STORE_KEY_V2, "{not json");
    expect(readStored(AFFORDABILITY_KEYS)).toEqual({});
  });

  it("only returns allowlisted keys", () => {
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ income1: 5, jurId: "toronto" }));
    expect(readStored(["income1"] as const)).toEqual({ income1: 5 });
  });
});

describe("writeStored", () => {
  it("merges into the existing blob rather than replacing it", () => {
    // Two independent call sites -- the header's jurisdiction picker and the
    // page's form -- share one storage key.
    writeStored(["jurId"] as const, { jurId: "toronto" });
    writeStored(["income1"] as const, { income1: 90000 });
    const blob = JSON.parse(window.localStorage.getItem(STORE_KEY_V2)!);
    expect(blob).toMatchObject({ jurId: "toronto", income1: 90000 });
  });
});
