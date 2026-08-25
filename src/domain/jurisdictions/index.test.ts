import { describe, expect, it } from "vitest";
import { readFieldPath } from "../provenance";
import { jurisdictions, getJurisdiction, defaultJurisdiction } from "./index";

const VALID_PROVINCES = new Set([
  "ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB", "PE", "NL", "YT", "NT", "NU",
]);

describe("jurisdictions", () => {
  it("has exactly 14 jurisdictions", () => {
    expect(jurisdictions).toHaveLength(14);
  });

  it("has unique ids", () => {
    const ids = jurisdictions.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a valid province code on every jurisdiction", () => {
    for (const j of jurisdictions) {
      expect(VALID_PROVINCES.has(j.prov), `${j.id} has invalid province ${j.prov}`).toBe(true);
    }
  });

  it("has at least one transfer line item and a lawyer/notary fee on every jurisdiction", () => {
    for (const j of jurisdictions) {
      expect(j.transfer.length, `${j.id} has no transfer line items`).toBeGreaterThan(0);
      expect(
        j.fees.lawyer ?? j.fees.notary,
        `${j.id} has neither a lawyer nor notary fee`,
      ).toBeGreaterThan(0);
    }
  });

  it("has rent/yoy only on jurisdictions with cityData true", () => {
    for (const j of jurisdictions) {
      if (j.cityData) {
        // null means the survey suppresses or does not cover this market; undefined means the
        // record is not city-level at all. Only the second is a schema error here.
        expect(j.rent, `${j.id} is cityData but has no rent field`).not.toBeUndefined();
      } else {
        expect(j.rent, `${j.id} is not cityData but has rent`).toBeUndefined();
      }
    }
  });

  it("looks up a known jurisdiction by id", () => {
    expect(getJurisdiction("winnipeg")?.prov).toBe("MB");
  });

  it("returns undefined for an unknown id", () => {
    expect(getJurisdiction("nope")).toBeUndefined();
  });

  // Trading a positional index for a string trades an off-by-one for a typo. This is the guard
  // that makes the string field safe: a misspelled `on` fails here instead of silently
  // dropping a rebate at runtime.
  it("targets every rebate at a transfer line that exists in its own jurisdiction", () => {
    for (const j of jurisdictions) {
      const lineKeys = new Set(j.transfer.map((l) => l.key));
      for (const rb of j.rebates) {
        expect(lineKeys, `${j.id} rebate ${rb.key}`).toContain(rb.on);
      }
    }
  });

  it("derives every effective rate from its published rate and assessment ratio", () => {
    for (const j of jurisdictions) {
      const { effective, publishedRate, assessmentRatio } = j.propTax;
      expect(
        Math.abs(effective - publishedRate * assessmentRatio),
        `${j.id}: effective ${effective} != ${publishedRate} x ${assessmentRatio}`,
      ).toBeLessThan(1e-6);
    }
  });

  it("uses a ratio of 1 wherever the assessment base is market value", () => {
    for (const j of jurisdictions) {
      if (j.propTax.basis !== "market") continue;
      expect(j.propTax.assessmentRatio, `${j.id}`).toBe(1);
    }
  });

  it("uses a ratio below 1 wherever a NAMED assessment base is not market value", () => {
    // `unknown` is exempt, deliberately and in the open. This pair of invariants was once
    // satisfied by nt and nu labelling themselves `market` with a ratio of 1 while their own
    // provenance notes said neither territory assesses at market — the invariant defeated by
    // exactly the move it exists to catch. The exemption is the fix: a record that cannot name
    // its base says `unknown` and keeps a ratio of 1 meaning "none established", and the
    // separate test below is what holds `unknown` to account instead.
    for (const j of jurisdictions) {
      if (j.propTax.basis === "market" || j.propTax.basis === "unknown") continue;
      expect(j.propTax.assessmentRatio, `${j.id}`).toBeLessThan(1);
    }
  });

  it("makes an unknown assessment base admit itself rather than derive anything", () => {
    // The escape hatch has to cost something, or it becomes the easy label. Under `unknown`
    // there is no ratio to believe (1, meaning none established), so the effective rate must
    // BE the published one — no derivation is being claimed — and the basis must carry a
    // provenance note saying why the base could not be established.
    for (const j of jurisdictions) {
      if (j.propTax.basis !== "unknown") continue;
      expect(j.propTax.assessmentRatio, `${j.id} ratio`).toBe(1);
      expect(j.propTax.effective, `${j.id} effective`).toBe(j.propTax.publishedRate);
      const p = j.provenance["propTax.basis"];
      expect(p?.conf, `${j.id} propTax.basis conf`).toBe("assumption");
      expect(p?.note, `${j.id} propTax.basis note`).toBeTruthy();
    }
  });

  it("keeps the estimate caveat on wherever the base is not market value", () => {
    // Affordability renders its "estimates the rate against market value" caveat on
    // `basis !== "market"`. Mislabelling a base as `market` therefore does not just weaken the
    // data — it silently drops a disclosure. Pinned here so the two territories that most need
    // that caveat cannot lose it by a one-word edit.
    for (const id of ["nt", "nu"]) {
      expect(getJurisdiction(id)!.propTax.basis, id).not.toBe("market");
    }
  });

  it("exposes a default jurisdiction that is itself one of the listed jurisdictions", () => {
    expect(jurisdictions).toContain(defaultJurisdiction);
    expect(getJurisdiction(defaultJurisdiction.id)).toBe(defaultJurisdiction);
  });
});

describe("market figures", () => {
  it("does not carry a new-build benchmark on any jurisdiction", () => {
    // No publisher produces one: StatCan's NHPI is index-only by design and CREA's HPI is
    // resale-only. The field was 0-of-14 sourceable and every value in it was invented.
    for (const j of jurisdictions) {
      expect(j.bench, `${j.id}`).not.toHaveProperty("newbuild");
    }
  });

  it("allows a benchmark to be null where nothing is published", () => {
    for (const j of jurisdictions) {
      for (const k of ["house", "condo"] as const) {
        const v = j.bench[k];
        expect(v === null || v > 0, `${j.id}.bench.${k} is ${v}`).toBe(true);
      }
    }
  });
});

describe("provenance", () => {
  it("keys every provenance entry to a field that exists on its own record", () => {
    for (const j of jurisdictions) {
      for (const path of Object.keys(j.provenance)) {
        expect(readFieldPath(j, path).found, `${j.id}: no such field "${path}"`).toBe(true);
      }
    }
  });

  it("leaves the value null or absent wherever confidence is none", () => {
    // "none" means: we looked, nobody publishes this, and we will not invent it. If the value
    // were present, the app would be displaying an invented number with a label admitting it.
    for (const j of jurisdictions) {
      for (const [path, p] of Object.entries(j.provenance)) {
        if (p?.conf !== "none") continue;
        const { value } = readFieldPath(j, path);
        expect(value ?? null, `${j.id}.${path} is "none" but holds ${String(value)}`).toBeNull();
      }
    }
  });

  it("carries a value and a note wherever confidence is assumption", () => {
    // "assumption" means: a modelling default chosen on purpose and disclosed. Distinct from
    // "none" — the calculator cannot run without an inspection fee, but it can and must run
    // without a benchmark price for Nunavut.
    for (const j of jurisdictions) {
      for (const [path, p] of Object.entries(j.provenance)) {
        if (p?.conf !== "assumption") continue;
        expect(readFieldPath(j, path).value ?? null, `${j.id}.${path}`).not.toBeNull();
        expect(p.note, `${j.id}.${path} is an assumption with no note`).toBeTruthy();
      }
    }
  });

  it("gives every jurisdiction a provenance map", () => {
    for (const j of jurisdictions) {
      expect(Object.keys(j.provenance).length, `${j.id} has an empty provenance map`).toBeGreaterThan(0);
    }
  });

  // Invariant 2 from the spec: every figure this milestone changes carries provenance.
  // Enumerated per record rather than inferred — a literal cannot be asked what it used to be.
  it("annotates every figure this milestone reshaped or resourced", () => {
    const perRecord: Record<string, readonly string[]> = {
      // PEI's exemption ceiling: the statute grants it with no dollar threshold, and the
      // prescribed maximum third-party calculators still recite was revoked in 2016.
      pe: ["rebates.0.ceiling"],
      // ISC's stepped mortgage registration table, which replaced a flat $160.
      saskatoon: ["transfer.1.steps"],
      // Nova Scotia's 10% non-resident provincial deed transfer tax.
      halifax: ["transfer.1.rate"],
    };
    for (const j of jurisdictions) {
      // propTax became a derivation and bench lost `newbuild` on every record.
      for (const path of ["propTax.effective", "bench.house", "bench.condo"]) {
        expect(j.provenance[path], `${j.id}.${path} has no provenance`).toBeDefined();
      }
      // Every fee this record carries is a modelling default with no publisher (spec §7).
      for (const key of Object.keys(j.fees)) {
        expect(j.provenance[`fees.${key}`], `${j.id}.fees.${key} has no provenance`).toBeDefined();
      }
      for (const path of perRecord[j.id] ?? []) {
        expect(j.provenance[path], `${j.id}.${path} has no provenance`).toBeDefined();
      }
    }
  });
});
