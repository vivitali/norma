# Phase 1: Domain Layer + Home/Affordability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Claude Design prototype's calculation engine and 14-jurisdiction rules dataset into typed `src/domain/`, then build the Home and Affordability pages on top of it, restyled onto the existing shadcn/Nova scaffold.

**Architecture:** A locale/framework-agnostic `src/domain/` module (types + federal rules + per-jurisdiction data + pure calculation functions) is ported first and unit-tested in isolation. A reusable `AppHeader` (jurisdiction picker, locale switcher, theme toggle) and a generic `useSharedState` localStorage-backed hook are built next, since both Home and Affordability consume them and later phases' pages will too. The two pages are built last, wiring the domain engine to real inputs.

**Tech Stack:** Next.js 16 (App Router) · TypeScript (strict) · Tailwind v4 · shadcn/ui (Radix, Nova preset) · next-intl (en/fr) · next-themes · Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-08-17-phase1-affordability-design.md`

## Global Constraints

- Locales: en/fr only (`src/i18n/routing.ts` already has this — do not add uk/es; tracked separately at [vivitali/norma#1](https://github.com/vivitali/norma/issues/1)).
- Domain layer (`src/domain/`) has zero React/Next dependency — plain TypeScript, importable from both server and client code.
- All 14 jurisdictions ported in full now (not trimmed to what Affordability reads) — see spec's Scalability section.
- Jurisdiction data keeps the prototype's unverified/placeholder status — do not "correct" figures; port them exactly as they appear in `design-reference/hbt-data.js`.
- `design-reference/**` is reference material only — never import from it in `src/`; it's excluded from lint and not part of the app.
- Every task ends with `scripts/check` passing (lint + typecheck + changed tests) before commit.
- Money formatting preserves the source's "sign outside the symbol" convention: `−$340`, never `$-340`.
- New dependency this plan introduces: `next-themes` (theme toggle) — added in Task 7, not before.

---

## Task 1: Domain types + federal rules

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/federal.ts`
- Test: `src/domain/federal.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: types `ProvinceCode`, `ProfessionalType`, `TransferLine` (discriminated union on `kind`), `Rebate` (discriminated union on `kind`), `TaxTimeCredit`, `JurisdictionFees`, `JurisdictionOrgs`, `PremiumTax`, `MarginalTable`, `Jurisdiction`, `FederalRules`. Value `federal: FederalRules` from `src/domain/federal.ts`.

- [ ] **Step 1: Write `src/domain/types.ts`**

```typescript
export type ProvinceCode =
  | "ON" | "QC" | "BC" | "AB" | "MB" | "SK" | "NS" | "NB" | "PE" | "NL" | "YT" | "NT" | "NU";

export type ProfessionalType = "lawyer" | "notary" | "lawyerOrNotary";

export type PropertyType = "house" | "condo" | "newbuild";

export type BracketTable = readonly (readonly [number | null, number])[];
export type MarginalTable = readonly (readonly [number | null, number])[];

interface TransferLineBase {
  key: string;
  ex?: string;
  tier: "provincial" | "municipal";
}

export interface BracketTransferLine extends TransferLineBase {
  kind: "brackets";
  brackets: BracketTable;
}

export interface FlatTransferLine extends TransferLineBase {
  kind: "flat";
  rate: number;
}

export interface FixedTransferLine extends TransferLineBase {
  kind: "fixed";
  amount: number;
}

export interface PerValueTransferLine extends TransferLineBase {
  kind: "perValue";
  base: number;
  per: number;
  unit: number;
  on: "price" | "loan";
  exempt?: number;
  min?: number;
}

export interface RateMinTransferLine extends TransferLineBase {
  kind: "rateMin";
  rate: number;
  min: number;
  floor: number;
}

export type TransferLine =
  | BracketTransferLine
  | FlatTransferLine
  | FixedTransferLine
  | PerValueTransferLine
  | RateMinTransferLine;

interface RebateBase {
  key: string;
  on: number;
  timing: "closing" | "taxTime";
  noTax?: boolean;
}

export interface CapRebate extends RebateBase {
  kind: "cap";
  cap: number;
}

export interface ExemptBandRebate extends RebateBase {
  kind: "exemptBand";
  full: number;
  partial: number;
  capBase: number;
}

export interface FullExemptRebate extends RebateBase {
  kind: "fullExempt";
}

export interface NoneRebate extends RebateBase {
  kind: "none";
}

export type Rebate = CapRebate | ExemptBandRebate | FullExemptRebate | NoneRebate;

export interface TaxTimeCredit {
  key: string;
  ex?: string;
  amount: number;
}

export interface JurisdictionFees {
  lawyer?: number;
  notary?: number;
  titleIns?: number;
  locCert?: number;
  inspect: number;
  appraisal: number;
  statusCert?: number;
  moving: number;
  setup: number;
}

export interface JurisdictionOrgs {
  transfer?: string;
  muni?: string;
  premTax?: string;
  rebate?: string;
  market?: string;
}

export interface PremiumTax {
  rate: number;
  label: string;
}

export interface Jurisdiction {
  id: string;
  prov: ProvinceCode;
  city: string | null;
  cityData: boolean;
  pro: ProfessionalType;
  /** Monthly benchmark rent — only present where the prototype had city-level rent data. */
  rent?: number;
  /** Year-over-year price growth — only present alongside `rent`. */
  yoy?: number;
  bench: { house: number; condo: number; newbuild: number };
  propTax: number;
  transfer: readonly TransferLine[];
  /**
   * Per-jurisdiction override of the combined marginal tax table. Only Winnipeg carries this
   * in the source data, and it does not match `federal.marginal.MB` — both are unverified
   * placeholder figures (see federal.ts). Not consumed until a later phase ports `marginalRate()`.
   */
  marginal?: MarginalTable;
  premiumTax: PremiumTax | null;
  rebates: readonly Rebate[];
  taxTime: readonly TaxTimeCredit[];
  fees: JurisdictionFees;
  orgs: JurisdictionOrgs;
}

export interface FederalRules {
  cmhc: {
    bands: readonly (readonly [number, number])[];
    longAmortSurcharge: number;
    insuredCap: number;
  };
  stressTest: { floor: number; buffer: number };
  gds: number;
  tds: number;
  heatAllowance: number;
  rates: { insured: number; uninsured: number; variable: number; prime: number };
  maxAmortFtbInsured: number;
  maxAmortOther: number;
  fhsa: { annual: number; lifetime: number };
  hbp: { max: number; repayYears: number; graceYears: number; ruleDays: number };
  rrspCap: number;
  capGainsInclusion: number;
  marginal: Record<string, MarginalTable>;
  sellingCost: number;
  maintenanceReserve: number;
  appreciation: { inflation: number; shelter: number; flat: number };
  investReturn: { cash: number; balanced: number; growth: number };
  savingsReturn: number;
  gstFthb: { rate: number; fullTo: number; zeroAt: number; cap: number };
  hba: number;
  verified: string;
  contractRate: number;
}
```

- [ ] **Step 2: Write `src/domain/federal.ts`**

```typescript
import type { FederalRules } from "./types";

/** Best-knowledge as of 2026-08-12 per the source model. Verify before shipping real figures. */
const VERIFIED_AT = "2026-08-16";

export const federal: FederalRules = {
  cmhc: {
    bands: [
      [0.65, 0.006],
      [0.75, 0.017],
      [0.8, 0.024],
      [0.85, 0.028],
      [0.9, 0.031],
      [0.95, 0.04],
    ],
    longAmortSurcharge: 0.002,
    insuredCap: 1500000,
  },
  stressTest: { floor: 5.25, buffer: 2 },
  gds: 39,
  tds: 44,
  heatAllowance: 150,
  rates: { insured: 0.0394, uninsured: 0.0404, variable: 0.0335, prime: 0.0445 },
  maxAmortFtbInsured: 30,
  maxAmortOther: 25,
  fhsa: { annual: 8000, lifetime: 40000 },
  hbp: { max: 60000, repayYears: 15, graceYears: 2, ruleDays: 90 },
  rrspCap: 33810,
  capGainsInclusion: 0.5,
  marginal: {
    MB: [[47564, 0.248], [58522, 0.2675], [101200, 0.3325], [117000, 0.379], [181400, 0.434], [258500, 0.464], [null, 0.504]],
    ON: [[52886, 0.2005], [58522, 0.2415], [105775, 0.2965], [117000, 0.3389], [181400, 0.4341], [253414, 0.4841], [null, 0.5353]],
    BC: [[49279, 0.2006], [58522, 0.227], [98560, 0.287], [113158, 0.317], [181400, 0.407], [258500, 0.457], [null, 0.535]],
    QC: [[53255, 0.2653], [58522, 0.3153], [106495, 0.3612], [117000, 0.4112], [129590, 0.4571], [181400, 0.4746], [null, 0.5331]],
    AB: [[60000, 0.24], [117000, 0.305], [181400, 0.36], [241974, 0.42], [362961, 0.44], [null, 0.48]],
    SK: [[54000, 0.245], [58522, 0.26], [117000, 0.335], [181400, 0.43], [258500, 0.46], [null, 0.475]],
    NS: [[32074, 0.2379], [58522, 0.3], [64181, 0.345], [117000, 0.43], [181400, 0.47], [null, 0.54]],
    CA: [[55000, 0.245], [58522, 0.27], [110000, 0.335], [117000, 0.38], [181400, 0.435], [258500, 0.465], [null, 0.51]],
  },
  sellingCost: 0.05,
  maintenanceReserve: 0.01,
  appreciation: { inflation: 0.021, shelter: 0.031, flat: 0 },
  investReturn: { cash: 0.024, balanced: 0.046, growth: 0.058 },
  savingsReturn: 0.035,
  gstFthb: { rate: 0.05, fullTo: 1000000, zeroAt: 1500000, cap: 50000 },
  hba: 1500,
  verified: VERIFIED_AT,
  contractRate: 4.29,
};
```

- [ ] **Step 3: Write the failing test `src/domain/federal.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { federal } from "./federal";

describe("federal rules data", () => {
  it("has GDS stricter than TDS, as Canadian lending rules require", () => {
    expect(federal.gds).toBeLessThan(federal.tds);
  });

  it("has CMHC bands sorted by ascending LTV threshold with ascending premium rates", () => {
    const bands = federal.cmhc.bands;
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i][0]).toBeGreaterThan(bands[i - 1][0]);
      expect(bands[i][1]).toBeGreaterThanOrEqual(bands[i - 1][1]);
    }
  });

  it("has a positive stress-test floor and buffer", () => {
    expect(federal.stressTest.floor).toBeGreaterThan(0);
    expect(federal.stressTest.buffer).toBeGreaterThan(0);
  });

  it("has every marginal tax table sorted by ascending income cap, ending in an open (null) bracket", () => {
    for (const [prov, table] of Object.entries(federal.marginal)) {
      const caps = table.map(([cap]) => cap);
      expect(caps[caps.length - 1], `${prov} last bracket should be open-ended`).toBeNull();
      const closedCaps = caps.filter((c): c is number => c !== null);
      for (let i = 1; i < closedCaps.length; i++) {
        expect(closedCaps[i]).toBeGreaterThan(closedCaps[i - 1]);
      }
    }
  });

  it("includes a CA fallback marginal table for provinces without their own", () => {
    expect(federal.marginal.CA).toBeDefined();
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/domain/federal.test.ts`
Expected: all 5 tests PASS (this is data-validation against a plain object, so there's no red-green cycle here — the assertions should pass immediately if the transcription in Step 2 is accurate).

- [ ] **Step 5: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/federal.ts src/domain/federal.test.ts
git commit -m "feat(domain): add jurisdiction/federal types and federal rules data"
```

---

## Task 2: Jurisdiction data (all 14) + index

**Files:**
- Create: `src/domain/jurisdictions/toronto.ts`, `ottawa.ts`, `vancouver.ts`, `halifax.ts`, `winnipeg.ts`, `montreal.ts`, `calgary.ts`, `saskatoon.ts`, `nb.ts`, `nl.ts`, `pe.ts`, `yt.ts`, `nt.ts`, `nu.ts`
- Create: `src/domain/jurisdictions/index.ts`
- Test: `src/domain/jurisdictions/index.test.ts`

**Interfaces:**
- Consumes: `Jurisdiction` type from `src/domain/types.ts` (Task 1).
- Produces: `jurisdictions: readonly Jurisdiction[]` and `getJurisdiction(id: string): Jurisdiction | undefined` from `src/domain/jurisdictions/index.ts`. Later tasks (engine tests, jurisdiction picker) import from this index, never from individual files.

- [ ] **Step 1: Write `src/domain/jurisdictions/toronto.ts`**

```typescript
import type { Jurisdiction } from "../types";

export const toronto: Jurisdiction = {
  id: "toronto",
  prov: "ON",
  city: "toronto",
  cityData: true,
  pro: "lawyer",
  rent: 2850,
  yoy: 0.008,
  bench: { house: 1180000, condo: 688000, newbuild: 1090000 },
  propTax: 0.00752,
  transfer: [
    {
      key: "li_lttProv",
      ex: "ex_lttProv",
      tier: "provincial",
      kind: "brackets",
      brackets: [[55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02], [null, 0.025]],
    },
    {
      key: "li_lttMuni",
      ex: "ex_lttMuni",
      tier: "municipal",
      kind: "brackets",
      brackets: [
        [55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02],
        [3000000, 0.025], [4000000, 0.035], [5000000, 0.045], [10000000, 0.055],
        [20000000, 0.065], [null, 0.075],
      ],
    },
  ],
  premiumTax: { rate: 0.08, label: "Ontario retail sales tax, 8%" },
  rebates: [
    { key: "cr_lttRebateProv", kind: "cap", cap: 4000, on: 0, timing: "closing" },
    { key: "cr_lttRebateMuni", kind: "cap", cap: 4475, on: 1, timing: "closing" },
  ],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 2200, titleIns: 400, inspect: 650, appraisal: 400, statusCert: 110, moving: 1500, setup: 650 },
  orgs: {
    transfer: "Ontario Ministry of Finance",
    muni: "City of Toronto, MLTT by-law",
    premTax: "Ontario Ministry of Finance",
    rebate: "Ontario Ministry of Finance · City of Toronto",
    market: "CREA MLS® HPI",
  },
};
```

- [ ] **Step 2: Write `src/domain/jurisdictions/ottawa.ts`**

```typescript
import type { Jurisdiction } from "../types";

export const ottawa: Jurisdiction = {
  id: "ottawa",
  prov: "ON",
  city: "ottawa",
  cityData: true,
  pro: "lawyer",
  rent: 2150,
  yoy: 0.021,
  bench: { house: 690000, condo: 425000, newbuild: 720000 },
  propTax: 0.01144,
  transfer: [
    {
      key: "li_lttProv",
      ex: "ex_lttProv",
      tier: "provincial",
      kind: "brackets",
      brackets: [[55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02], [null, 0.025]],
    },
  ],
  premiumTax: { rate: 0.08, label: "Ontario retail sales tax, 8%" },
  rebates: [{ key: "cr_lttRebateProv", kind: "cap", cap: 4000, on: 0, timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1900, titleIns: 375, inspect: 550, appraisal: 400, statusCert: 110, moving: 1300, setup: 600 },
  orgs: {
    transfer: "Ontario Ministry of Finance",
    premTax: "Ontario Ministry of Finance",
    market: "CREA MLS® HPI",
  },
};
```

- [ ] **Step 3: Write `src/domain/jurisdictions/vancouver.ts`**

```typescript
import type { Jurisdiction } from "../types";

export const vancouver: Jurisdiction = {
  id: "vancouver",
  prov: "BC",
  city: "vancouver",
  cityData: true,
  pro: "lawyerOrNotary",
  rent: 3150,
  yoy: -0.005,
  bench: { house: 1720000, condo: 762000, newbuild: 1090000 },
  propTax: 0.00297,
  transfer: [
    {
      key: "li_ptt",
      ex: "ex_lttProv",
      tier: "provincial",
      kind: "brackets",
      brackets: [[200000, 0.01], [2000000, 0.02], [3000000, 0.03], [null, 0.05]],
    },
  ],
  premiumTax: null,
  rebates: [
    { key: "cr_pttExempt", kind: "exemptBand", full: 835000, partial: 860000, capBase: 500000, on: 0, timing: "closing" },
  ],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1600, titleIns: 350, inspect: 700, appraisal: 450, statusCert: 60, moving: 1600, setup: 650 },
  orgs: {
    transfer: "BC Ministry of Finance, Property Transfer Tax Act",
    rebate: "BC First Time Home Buyers' Programme",
    market: "CREA MLS® HPI",
  },
};
```

- [ ] **Step 4: Write `src/domain/jurisdictions/halifax.ts`**

```typescript
import type { Jurisdiction } from "../types";

export const halifax: Jurisdiction = {
  id: "halifax",
  prov: "NS",
  city: "halifax",
  cityData: true,
  pro: "lawyer",
  rent: 2050,
  yoy: 0.034,
  bench: { house: 585000, condo: 460000, newbuild: 640000 },
  propTax: 0.01105,
  transfer: [
    { key: "li_deedMuni", ex: "ex_lttMuni", tier: "municipal", kind: "flat", rate: 0.015 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1700, titleIns: 350, inspect: 600, appraisal: 400, statusCert: 100, moving: 1400, setup: 600 },
  orgs: {
    transfer: "Halifax Regional Municipality, deed transfer tax by-law",
    rebate: "Nova Scotia Department of Finance",
    market: "CREA MLS® HPI",
  },
};
```

- [ ] **Step 5: Write `src/domain/jurisdictions/winnipeg.ts`**

```typescript
import type { Jurisdiction } from "../types";

export const winnipeg: Jurisdiction = {
  id: "winnipeg",
  prov: "MB",
  city: "winnipeg",
  cityData: true,
  pro: "lawyer",
  rent: 1600,
  yoy: 0.024,
  bench: { house: 454264, condo: 290522, newbuild: 480000 },
  propTax: 0.0132,
  transfer: [
    {
      key: "li_lttProv",
      ex: "ex_lttProv",
      tier: "provincial",
      kind: "brackets",
      brackets: [[30000, 0], [90000, 0.005], [150000, 0.01], [200000, 0.015], [null, 0.02]],
    },
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 130 },
  ],
  // Combined federal + provincial marginal rate, Manitoba 2026, sourced from the model.
  // Deliberately not identical to federal.marginal.MB — both are unverified. See types.ts.
  marginal: [[47000, 0.258], [57375, 0.2355], [100000, 0.3325], [114750, 0.379], [158519, 0.434], [220000, 0.464], [null, 0.504]],
  // Manitoba removed PST on CMHC premiums in 2020 — no premium-tax line renders here.
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1800, titleIns: 350, inspect: 600, appraisal: 400, statusCert: 100, moving: 1500, setup: 3000 },
  orgs: {
    transfer: "Manitoba Finance, Land Transfer Tax",
    rebate: "Manitoba Finance",
    market: "WinnipegREALTORS via WOWA.ca",
  },
};
```

- [ ] **Step 6: Write `src/domain/jurisdictions/montreal.ts`**

```typescript
import type { Jurisdiction } from "../types";

export const montreal: Jurisdiction = {
  id: "montreal",
  prov: "QC",
  city: "montreal",
  cityData: true,
  pro: "notary",
  rent: 1950,
  yoy: 0.041,
  bench: { house: 640000, condo: 442000, newbuild: 690000 },
  propTax: 0.00792,
  transfer: [
    {
      key: "li_dutiesMuni",
      ex: "ex_lttMuni",
      tier: "municipal",
      kind: "brackets",
      brackets: [
        [62700, 0.005], [313900, 0.01], [563300, 0.015], [1126800, 0.02],
        [2179200, 0.025], [3175300, 0.035], [null, 0.04],
      ],
    },
  ],
  premiumTax: { rate: 0.09, label: "Quebec tax on insurance premiums, 9%" },
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing" }],
  taxTime: [
    { key: "cr_hba", ex: "ex_hba", amount: 1500 },
    { key: "cr_provCredit", ex: "ex_hba", amount: 1400 },
  ],
  fees: { notary: 1800, locCert: 400, inspect: 600, appraisal: 400, statusCert: 0, moving: 1300, setup: 600 },
  orgs: {
    transfer: "Ville de Montréal, droits de mutation immobilière",
    premTax: "Revenu Québec",
    rebate: "Revenu Québec",
    market: "APCIQ · Centris",
  },
};
```

- [ ] **Step 7: Write `src/domain/jurisdictions/calgary.ts`**

```typescript
import type { Jurisdiction } from "../types";

export const calgary: Jurisdiction = {
  id: "calgary",
  prov: "AB",
  city: "calgary",
  cityData: true,
  pro: "lawyer",
  rent: 1850,
  yoy: 0.028,
  bench: { house: 622000, condo: 342000, newbuild: 660000 },
  propTax: 0.00654,
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 50, per: 5, unit: 5000, on: "price" },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 50, per: 5, unit: 5000, on: "loan" },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1600, titleIns: 325, inspect: 550, appraisal: 400, statusCert: 350, moving: 1300, setup: 600 },
  orgs: {
    transfer: "Alberta Land Titles, tariff of fees",
    rebate: "Alberta Treasury Board and Finance",
    market: "CREA MLS® HPI",
  },
};
```

- [ ] **Step 8: Write `src/domain/jurisdictions/saskatoon.ts`**

```typescript
import type { Jurisdiction } from "../types";

export const saskatoon: Jurisdiction = {
  id: "saskatoon",
  prov: "SK",
  city: "saskatoon",
  cityData: true,
  pro: "lawyer",
  rent: 1450,
  yoy: 0.039,
  bench: { house: 402000, condo: 232000, newbuild: 455000 },
  propTax: 0.01285,
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "rateMin", rate: 0.003, min: 25, floor: 8400 },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 160 },
  ],
  premiumTax: { rate: 0.06, label: "Saskatchewan PST on insurance premiums, 6%" },
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing", noTax: true }],
  taxTime: [
    { key: "cr_hba", ex: "ex_hba", amount: 1500 },
    { key: "cr_provCredit", ex: "ex_hba", amount: 1155 },
  ],
  fees: { lawyer: 1450, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 200, moving: 1200, setup: 550 },
  orgs: {
    transfer: "Information Services Corporation of Saskatchewan",
    premTax: "Saskatchewan Ministry of Finance",
    rebate: "Saskatchewan Ministry of Finance",
    market: "CREA MLS® HPI",
  },
};
```

- [ ] **Step 9: Write the six province-only jurisdictions**

`src/domain/jurisdictions/nb.ts`:

```typescript
import type { Jurisdiction } from "../types";

export const nb: Jurisdiction = {
  id: "nb",
  prov: "NB",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 365000, condo: 285000, newbuild: 420000 },
  propTax: 0.0145,
  transfer: [{ key: "li_lttProv", ex: "ex_lttProv", tier: "provincial", kind: "flat", rate: 0.01 }],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1500, titleIns: 325, inspect: 500, appraisal: 350, statusCert: 100, moving: 1200, setup: 550 },
  orgs: {
    transfer: "Service New Brunswick, Real Property Transfer Tax Act",
    rebate: "Department of Finance and Treasury Board",
    market: "CREA MLS® HPI",
  },
};
```

`src/domain/jurisdictions/nl.ts`:

```typescript
import type { Jurisdiction } from "../types";

export const nl: Jurisdiction = {
  id: "nl",
  prov: "NL",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 335000, condo: 290000, newbuild: 400000 },
  propTax: 0.0083,
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 100, per: 0.4, unit: 100, on: "price", exempt: 500 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1450, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 100, moving: 1250, setup: 550 },
  orgs: {
    transfer: "Registry of Deeds, Service NL",
    rebate: "Newfoundland and Labrador Department of Finance",
    market: "CREA MLS® HPI",
  },
};
```

`src/domain/jurisdictions/pe.ts`:

```typescript
import type { Jurisdiction } from "../types";

export const pe: Jurisdiction = {
  id: "pe",
  prov: "PE",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 388000, condo: 320000, newbuild: 440000 },
  propTax: 0.0105,
  transfer: [{ key: "li_lttProv", ex: "ex_lttProv", tier: "provincial", kind: "flat", rate: 0.01 }],
  premiumTax: null,
  rebates: [{ key: "cr_pttExempt", kind: "fullExempt", on: 0, timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1400, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 100, moving: 1200, setup: 550 },
  orgs: {
    transfer: "PEI Department of Finance, Real Property Transfer Tax Act",
    rebate: "PEI Department of Finance",
    market: "CREA MLS® HPI",
  },
};
```

`src/domain/jurisdictions/yt.ts`:

```typescript
import type { Jurisdiction } from "../types";

export const yt: Jurisdiction = {
  id: "yt",
  prov: "YT",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 620000, condo: 480000, newbuild: 690000 },
  propTax: 0.0078,
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 650 },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 100 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1800, titleIns: 350, inspect: 700, appraisal: 500, statusCert: 150, moving: 3200, setup: 750 },
  orgs: {
    transfer: "Yukon Land Titles Office, tariff of fees",
    rebate: "Yukon Department of Finance",
    market: "Yukon Bureau of Statistics",
  },
};
```

`src/domain/jurisdictions/nt.ts`:

```typescript
import type { Jurisdiction } from "../types";

export const nt: Jurisdiction = {
  id: "nt",
  prov: "NT",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 470000, condo: 380000, newbuild: 560000 },
  propTax: 0.0112,
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.5, unit: 1000, on: "price", min: 100 },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.0, unit: 1000, on: "loan", min: 80 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1900, titleIns: 350, inspect: 750, appraisal: 550, statusCert: 150, moving: 4200, setup: 800 },
  orgs: {
    transfer: "NWT Land Titles Office, tariff of fees",
    rebate: "NWT Department of Finance",
    market: "NWT Bureau of Statistics",
  },
};
```

`src/domain/jurisdictions/nu.ts`:

```typescript
import type { Jurisdiction } from "../types";

export const nu: Jurisdiction = {
  id: "nu",
  prov: "NU",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 520000, condo: 430000, newbuild: 640000 },
  propTax: 0.009,
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.5, unit: 1000, on: "price", min: 100 },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.0, unit: 1000, on: "loan", min: 80 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 2100, titleIns: 350, inspect: 900, appraisal: 650, statusCert: 150, moving: 6500, setup: 900 },
  orgs: {
    transfer: "Nunavut Land Titles Office, tariff of fees",
    rebate: "Nunavut Department of Finance",
    market: "Nunavut Bureau of Statistics",
  },
};
```

- [ ] **Step 10: Write `src/domain/jurisdictions/index.ts`**

```typescript
import type { Jurisdiction } from "../types";
import { toronto } from "./toronto";
import { ottawa } from "./ottawa";
import { vancouver } from "./vancouver";
import { halifax } from "./halifax";
import { winnipeg } from "./winnipeg";
import { montreal } from "./montreal";
import { calgary } from "./calgary";
import { saskatoon } from "./saskatoon";
import { nb } from "./nb";
import { nl } from "./nl";
import { pe } from "./pe";
import { yt } from "./yt";
import { nt } from "./nt";
import { nu } from "./nu";

export const jurisdictions: readonly Jurisdiction[] = [
  toronto, ottawa, vancouver, halifax, winnipeg, montreal, calgary, saskatoon,
  nb, nl, pe, yt, nt, nu,
];

export function getJurisdiction(id: string): Jurisdiction | undefined {
  return jurisdictions.find((j) => j.id === id);
}
```

- [ ] **Step 11: Write the failing test `src/domain/jurisdictions/index.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { jurisdictions, getJurisdiction } from "./index";

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
        expect(j.rent, `${j.id} is cityData but has no rent`).toBeGreaterThan(0);
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
});
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `npx vitest run src/domain/jurisdictions/index.test.ts`
Expected: all 7 tests PASS.

- [ ] **Step 13: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 14: Commit**

```bash
git add src/domain/jurisdictions/
git commit -m "feat(domain): port all 14 jurisdiction rule records"
```

---

## Task 3: Engine — math primitives (`money`, `bracketTax`, `payFactor`, `minDown`)

**Files:**
- Create: `src/domain/engine.ts`
- Test: `src/domain/engine.test.ts`

**Interfaces:**
- Consumes: nothing beyond built-ins.
- Produces: `money(n: number, loc: string, trailing: boolean, dp?: number): string`, `bracketTax(price: number, brackets: BracketTable): { total: number; parts: BracketPart[] }`, `payFactor(annualRate: number, years: number): number`, `minDown(price: number): number`. Later tasks import all four from `src/domain/engine.ts`.

- [ ] **Step 1: Write the failing test `src/domain/engine.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { money, bracketTax, payFactor, minDown } from "./engine";

describe("money", () => {
  it("formats a positive amount with the symbol first in en", () => {
    expect(money(1234, "en-CA", false)).toBe("$1,234");
  });

  it("puts the sign outside the symbol for a negative amount, never $-340", () => {
    const result = money(-340, "en-CA", false);
    expect(result).toBe("− $340");
    expect(result).not.toContain("$-");
  });

  it("formats with the symbol trailing in fr", () => {
    const result = money(1234, "fr-CA", true);
    expect(result.endsWith(" $")).toBe(true);
  });

  it("treats -0 as 0, not negative zero", () => {
    expect(money(-0.001, "en-CA", false)).toBe("$0");
  });
});

describe("bracketTax", () => {
  const brackets: [number | null, number][] = [
    [100, 0.01],
    [200, 0.02],
    [null, 0.03],
  ];

  it("taxes only within the first bracket when price is below its cap", () => {
    const result = bracketTax(50, brackets);
    expect(result.total).toBeCloseTo(0.5, 5);
    expect(result.parts).toHaveLength(1);
  });

  it("taxes across multiple brackets proportionally", () => {
    // 100 @ 1% = 1, next 100 (100->200) @ 2% = 2, next 50 (200->250) @ 3% = 1.5
    const result = bracketTax(250, brackets);
    expect(result.total).toBeCloseTo(1 + 2 + 1.5, 5);
    expect(result.parts).toHaveLength(3);
  });

  it("returns zero tax for a zero price", () => {
    expect(bracketTax(0, brackets).total).toBe(0);
  });
});

describe("payFactor", () => {
  it("returns 1/n for a zero rate (equal principal payments)", () => {
    expect(payFactor(0, 25)).toBeCloseTo(1 / (25 * 12), 8);
  });

  it("returns a larger monthly factor for a higher rate at the same amortization", () => {
    expect(payFactor(0.06, 25)).toBeGreaterThan(payFactor(0.03, 25));
  });

  it("returns a smaller monthly factor for a longer amortization at the same rate", () => {
    expect(payFactor(0.04, 30)).toBeLessThan(payFactor(0.04, 15));
  });
});

describe("minDown", () => {
  it("requires 5% under $500,000", () => {
    expect(minDown(400000)).toBeCloseTo(20000, 5);
  });

  it("requires 5% on the first $500,000 plus 10% above it, between $500,000 and $1,500,000", () => {
    expect(minDown(600000)).toBeCloseTo(25000 + 10000, 5);
  });

  it("requires a flat 20% at or above $1,500,000", () => {
    expect(minDown(1500000)).toBeCloseTo(300000, 5);
    expect(minDown(2000000)).toBeCloseTo(400000, 5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/domain/engine.test.ts`
Expected: FAIL — `src/domain/engine.ts` does not exist yet ("Failed to resolve import").

- [ ] **Step 3: Write `src/domain/engine.ts`**

```typescript
export interface BracketPart {
  from: number;
  to: number;
  rate: number;
  amt: number;
}

/**
 * Can I Buy This House? — calculation engine. Pure functions, no DOM, no React state.
 * Every screen that renders a number reads it from here, so two screens can never disagree.
 * Rule VALUES live in src/domain/federal.ts and src/domain/jurisdictions/; only mechanics live here.
 * Canadian mortgages compound semi-annually — payFactor() is not the US monthly formula.
 */

export function bracketTax(
  price: number,
  brackets: readonly (readonly [number | null, number])[],
): { total: number; parts: BracketPart[] } {
  let prev = 0;
  let total = 0;
  const parts: BracketPart[] = [];
  for (const [cap, rate] of brackets) {
    const top = cap == null ? price : Math.min(price, cap);
    if (top > prev) {
      const amt = (top - prev) * rate;
      total += amt;
      parts.push({ from: prev, to: top, rate, amt });
    }
    if (cap != null && price <= cap) break;
    prev = cap == null ? price : cap;
  }
  return { total, parts };
}

/** Monthly payment per $1 of mortgage, Canadian semi-annual compounding. */
export function payFactor(annualRate: number, years: number): number {
  const i = Math.pow(1 + annualRate / 2, 2 / 12) - 1;
  const n = Math.max(1, years * 12);
  return i <= 0 ? 1 / n : i / (1 - Math.pow(1 + i, -n));
}

export function minDown(price: number): number {
  if (price <= 500000) return price * 0.05;
  if (price < 1500000) return 25000 + (price - 500000) * 0.1;
  return price * 0.2;
}

/**
 * Currency. The sign goes outside the symbol: −$340 in en, −340 $ in fr. Never "$-340".
 * A deliberate choice in the source engine, kept here so the bug cannot come back.
 */
export function money(n: number, loc: string, trailing: boolean, dp?: number): string {
  const factor = dp ? 100 : 1;
  const r = Math.round(n * factor) / factor;
  const q = r === 0 ? 0 : r;
  const v = new Intl.NumberFormat(loc, {
    minimumFractionDigits: dp ?? 0,
    maximumFractionDigits: dp ?? 0,
  }).format(Math.abs(q));
  const body = trailing ? `${v} $` : `$${v}`;
  return q < 0 ? `− ${body}` : body;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/domain/engine.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 6: Commit**

```bash
git add src/domain/engine.ts src/domain/engine.test.ts
git commit -m "feat(domain): add engine math primitives (money, bracketTax, payFactor, minDown)"
```

---

## Task 4: Engine — closing costs (`financing`, `buildLines`, `credits`, `closingTotal`)

**Files:**
- Modify: `src/domain/engine.ts`
- Modify: `src/domain/engine.test.ts`

**Interfaces:**
- Consumes: `bracketTax`, `payFactor`, `minDown` (Task 3, same file); `Jurisdiction`, `FederalRules`, `PropertyType` from `src/domain/types.ts` (Task 1); `jurisdictions`/`getJurisdiction` from `src/domain/jurisdictions` (Task 2, test only); `federal` from `src/domain/federal.ts` (Task 1, test only).
- Produces: `FinancingInput`, `ClosingInput` (extends `FinancingInput` with `ftb`, `ptype`, `elsewhere`), `financing(F, o: FinancingInput)`, `buildLines(j, F, o: ClosingInput)`, `credits(j, F, o: ClosingInput, gov: LineItem[])`, `closingTotal(j, F, o: ClosingInput)`, and exported type `ClosingTotalResult = ReturnType<typeof closingTotal>`. Task 5 (`affordability`) and the Affordability page (Task 12) consume `closingTotal` and `ClosingTotalResult`.

- [ ] **Step 1: Write the failing test — append to `src/domain/engine.test.ts`**

```typescript
import { federal } from "./federal";
import { getJurisdiction } from "./jurisdictions";
import { financing, buildLines, credits, closingTotal } from "./engine";

describe("financing", () => {
  it("does not require CMHC insurance at 20% down", () => {
    const result = financing(federal, { price: 500000, dpPct: 20, amortYears: 25 });
    expect(result.insured).toBe(false);
    expect(result.premium).toBe(0);
    expect(result.loan).toBeCloseTo(result.baseLoan, 5);
  });

  it("requires CMHC insurance and adds a premium below 20% down", () => {
    const result = financing(federal, { price: 500000, dpPct: 10, amortYears: 25 });
    expect(result.insured).toBe(true);
    expect(result.premium).toBeGreaterThan(0);
    expect(result.loan).toBeCloseTo(result.baseLoan + result.premium, 5);
  });

  it("does not allow insurance at or above the insured price cap", () => {
    const result = financing(federal, { price: 2000000, dpPct: 10, amortYears: 25 });
    expect(result.insured).toBe(false);
  });

  it("surcharges the premium rate for amortizations over 25 years", () => {
    const short = financing(federal, { price: 500000, dpPct: 10, amortYears: 25 });
    const long = financing(federal, { price: 500000, dpPct: 10, amortYears: 30 });
    expect(long.premRate).toBeGreaterThan(short.premRate);
  });
});

describe("buildLines", () => {
  const winnipeg = getJurisdiction("winnipeg")!;
  const toronto = getJurisdiction("toronto")!;

  it("omits a non-applicable line item entirely rather than rendering it as zero", () => {
    // Winnipeg has no premiumTax, so no li_premTax line should ever appear.
    const lines = buildLines(winnipeg, federal, {
      price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house", elsewhere: false,
    });
    expect(lines.gov.some((l) => l.key === "li_premTax")).toBe(false);
  });

  it("includes a premium-tax line only when the jurisdiction has one and CMHC premium is charged", () => {
    const lines = buildLines(toronto, federal, {
      price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house", elsewhere: false,
    });
    expect(lines.gov.some((l) => l.key === "li_premTax")).toBe(true);
  });

  it("skips Toronto's municipal LTT line when elsewhere-in-Ontario is selected", () => {
    const lines = buildLines(toronto, federal, {
      price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house", elsewhere: true,
    });
    expect(lines.gov.some((l) => l.key === "li_lttMuni")).toBe(false);
  });

  it("only adds a condo status-certificate fee line for condo purchases", () => {
    const house = buildLines(toronto, federal, {
      price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house", elsewhere: false,
    });
    const condo = buildLines(toronto, federal, {
      price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "condo", elsewhere: false,
    });
    expect(house.pro.some((l) => l.key === "li_statusCert")).toBe(false);
    expect(condo.pro.some((l) => l.key === "li_statusCert")).toBe(true);
  });
});

describe("credits", () => {
  const toronto = getJurisdiction("toronto")!;

  it("caps a rebate at the line item's rule cap when the raw tax exceeds it", () => {
    const input = { price: 2000000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false };
    const lines = buildLines(toronto, federal, input);
    const result = credits(toronto, federal, input, lines.gov);
    const provRebate = result.atClosing.find((c) => c.key === "cr_lttRebateProv")!;
    expect(provRebate.st).toBe("capped");
    expect(provRebate.amount).toBeCloseTo(4000, 5);
  });

  it("marks a rebate ftbOnly when the buyer is not a first-time buyer", () => {
    const input = { price: 500000, dpPct: 20, amortYears: 25, ftb: false, ptype: "house" as const, elsewhere: false };
    const lines = buildLines(toronto, federal, input);
    const result = credits(toronto, federal, input, lines.gov);
    expect(result.atClosing.every((c) => c.st === "ftbOnly")).toBe(true);
  });

  it("phases out Vancouver's exempt-band PTT rebate above the partial threshold", () => {
    const vancouver = getJurisdiction("vancouver")!;
    const input = { price: 900000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false };
    const lines = buildLines(vancouver, federal, input);
    const result = credits(vancouver, federal, input, lines.gov);
    const pttRebate = result.atClosing.find((c) => c.key === "cr_pttExempt")!;
    expect(pttRebate.st).toBe("phasedOut");
    expect(pttRebate.amount).toBe(0);
  });
});

describe("closingTotal", () => {
  it("returns cash equal to down payment plus total closing costs", () => {
    const winnipeg = getJurisdiction("winnipeg")!;
    const result = closingTotal(winnipeg, federal, {
      price: 400000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house", elsewhere: false,
    });
    expect(result.cash).toBeCloseTo(result.fin.down + result.total, 5);
  });

  it("returns net cash at or below cash (credits never make it more expensive)", () => {
    const toronto = getJurisdiction("toronto")!;
    const result = closingTotal(toronto, federal, {
      price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house", elsewhere: false,
    });
    expect(result.net).toBeLessThanOrEqual(result.cash);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/domain/engine.test.ts`
Expected: FAIL — `financing`, `buildLines`, `credits`, `closingTotal` are not exported yet.

- [ ] **Step 3: Append to `src/domain/engine.ts`**

```typescript
import type { Jurisdiction, FederalRules, PropertyType } from "./types";

export interface FinancingInput {
  price: number;
  dpPct: number;
  amortYears: number;
}

export function financing(F: FederalRules, o: FinancingInput) {
  const down = (o.price * o.dpPct) / 100;
  const baseLoan = o.price - down;
  const insured = o.dpPct < 20 && o.price < F.cmhc.insuredCap;
  let premRate = 0;
  if (insured) {
    const ltv = baseLoan / o.price;
    const band = F.cmhc.bands.find((b) => ltv <= b[0]) ?? F.cmhc.bands[F.cmhc.bands.length - 1];
    premRate = band[1] + (o.amortYears > 25 ? F.cmhc.longAmortSurcharge : 0);
  }
  const premium = insured ? baseLoan * premRate : 0;
  return { down, baseLoan, insured, premRate, premium, loan: baseLoan + premium, minDown: minDown(o.price) };
}

export type FinancingResult = ReturnType<typeof financing>;

export interface ClosingInput extends FinancingInput {
  ftb: boolean;
  ptype: PropertyType;
  elsewhere: boolean;
}

export interface LineItem {
  key: string;
  ex?: string;
  amount: number;
  parts?: BracketPart[] | null;
  tier?: "provincial" | "municipal";
  exact?: boolean;
  cashOnly?: boolean;
  sub?: string;
}

/** A non-applicable line item is ABSENT from the result, never a zero row. */
export function buildLines(j: Jurisdiction, F: FederalRules, o: ClosingInput) {
  const fin = financing(F, o);
  const gov: LineItem[] = [];
  for (const it of j.transfer) {
    if (o.elsewhere && it.tier === "municipal" && j.prov === "ON") continue;
    let amt = 0;
    let parts: LineItem["parts"] = null;
    if (it.kind === "brackets") {
      const r = bracketTax(o.price, it.brackets);
      amt = r.total;
      parts = r.parts;
    } else if (it.kind === "flat") {
      amt = o.price * it.rate;
    } else if (it.kind === "fixed") {
      amt = it.amount;
    } else if (it.kind === "perValue") {
      const on = it.on === "loan" ? fin.loan : o.price;
      amt = it.base + it.per * Math.ceil(Math.max(0, on - (it.exempt ?? 0)) / it.unit);
      if (it.min) amt = Math.max(it.min, amt);
    } else if (it.kind === "rateMin") {
      amt = o.price > it.floor ? o.price * it.rate : it.min;
    }
    gov.push({ key: it.key, ex: it.ex, amount: amt, parts, tier: it.tier, exact: true });
  }
  if (j.premiumTax && fin.premium > 0) {
    gov.push({
      key: "li_premTax",
      ex: "ex_premTax",
      amount: fin.premium * j.premiumTax.rate,
      tier: "provincial",
      exact: true,
      cashOnly: true,
      sub: j.premiumTax.label,
    });
  }

  const f = j.fees;
  const pro: LineItem[] = [];
  pro.push({
    key: j.pro === "notary" ? "li_notary" : j.pro === "lawyerOrNotary" ? "li_lawyerOrNotary" : "li_lawyer",
    amount: (f.lawyer ?? f.notary ?? 0),
  });
  if (f.locCert != null) pro.push({ key: "li_locCert", amount: f.locCert });
  if (f.titleIns != null) pro.push({ key: "li_titleIns", amount: f.titleIns });
  pro.push({ key: "li_inspect", amount: f.inspect });
  pro.push({ key: "li_appraisal", amount: f.appraisal });
  if (o.ptype === "condo" && f.statusCert) pro.push({ key: "li_statusCert", amount: f.statusCert });

  const adj: LineItem[] = [
    { key: "li_taxAdj", ex: "ex_taxAdj", amount: (o.price * j.propTax) / 4 },
    { key: "li_moving", amount: f.moving },
    { key: "li_setup", amount: f.setup },
  ];
  return { fin, gov, pro, adj };
}

export interface CreditLine {
  key: string;
  kind: "cap" | "exemptBand" | "fullExempt" | "none";
  amount: number;
  st: "applied" | "capped" | "phasedOut" | "none" | "ftbOnly";
  target: string | null;
  cap?: number;
  noTax?: boolean;
}

export interface LaterCredit {
  key: string;
  ex?: string;
  amount: number;
}

export function credits(j: Jurisdiction, F: FederalRules, o: ClosingInput, gov: LineItem[]) {
  const atClosing: CreditLine[] = [];
  const later: LaterCredit[] = [];
  for (const rb of j.rebates) {
    const target = gov[rb.on];
    const raw = target ? target.amount : 0;
    let amount = 0;
    let st: CreditLine["st"] = "none";
    if (rb.kind === "none") {
      st = "none";
    } else if (!o.ftb) {
      st = "ftbOnly";
    } else if (rb.kind === "cap") {
      amount = Math.min(rb.cap, raw);
      st = raw > rb.cap ? "capped" : "applied";
    } else if (rb.kind === "fullExempt") {
      amount = raw;
      st = "applied";
    } else if (rb.kind === "exemptBand") {
      const transferLine = j.transfer[rb.on];
      const full =
        transferLine && transferLine.kind === "brackets"
          ? bracketTax(Math.min(o.price, rb.capBase), transferLine.brackets).total
          : 0;
      if (o.price <= rb.full) {
        amount = Math.min(full, raw);
        st = "applied";
      } else if (o.price <= rb.partial) {
        amount = (Math.min(full, raw) * (rb.partial - o.price)) / (rb.partial - rb.full);
        st = "capped";
      } else {
        st = "phasedOut";
      }
    }
    atClosing.push({
      key: rb.key,
      kind: rb.kind,
      amount,
      st,
      target: target ? target.key : null,
      cap: rb.kind === "cap" ? rb.cap : undefined,
      noTax: rb.noTax,
    });
  }
  if (o.ftb) for (const c of j.taxTime) later.push({ key: c.key, ex: c.ex, amount: c.amount });
  if (o.ftb && o.ptype === "newbuild") {
    const g = F.gstFthb;
    const gst = o.price * g.rate;
    const amt =
      o.price <= g.fullTo
        ? Math.min(gst, g.cap)
        : o.price >= g.zeroAt
          ? 0
          : (Math.min(gst, g.cap) * (g.zeroAt - o.price)) / (g.zeroAt - g.fullTo);
    if (amt > 0) later.push({ key: "cr_gstFthb", ex: "ex_gstFthb", amount: amt });
  }
  return { atClosing, later };
}

/** Total cash at closing without the itemised table — for screens that only need the number. */
export function closingTotal(j: Jurisdiction, F: FederalRules, o: ClosingInput) {
  const L = buildLines(j, F, o);
  const sum = (a: LineItem[]) => a.reduce((t, r) => t + r.amount, 0);
  const total = sum(L.gov) + sum(L.pro) + sum(L.adj);
  const C = credits(j, F, o, L.gov);
  const cr = C.atClosing.reduce((t, c) => t + c.amount, 0);
  return {
    fin: L.fin,
    total,
    creditsAtClosing: cr,
    later: C.later.reduce((t, c) => t + c.amount, 0),
    cash: L.fin.down + total,
    net: L.fin.down + total - cr,
  };
}

export type ClosingTotalResult = ReturnType<typeof closingTotal>;
```

Place the `import type { Jurisdiction, FederalRules, PropertyType } from "./types";` line at the very top of `engine.ts`, above the `BracketPart` interface already there from Task 3.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/domain/engine.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 6: Commit**

```bash
git add src/domain/engine.ts src/domain/engine.test.ts
git commit -m "feat(domain): add closing-cost engine (financing, buildLines, credits, closingTotal)"
```

---

## Task 5: Engine — affordability (the two-ceiling calculation)

**Files:**
- Modify: `src/domain/engine.ts`
- Modify: `src/domain/engine.test.ts`

**Interfaces:**
- Consumes: `payFactor`, `closingTotal` (this file, Tasks 3–4); `Jurisdiction`, `FederalRules`, `PropertyType` (Task 1); `federal`, `getJurisdiction` (test only).
- Produces: `AffordabilityInput`, `affordability(j, F, o: AffordabilityInput)`, and exported type `AffordabilityResult = ReturnType<typeof affordability>`. The Affordability page (Task 12) is the primary consumer — it reads `ceiling`, `comfort`, `monthly`, `approvalPass`, `comfortPass` from the result.

- [ ] **Step 1: Write the failing test — append to `src/domain/engine.test.ts`**

```typescript
import { affordability } from "./engine";

describe("affordability", () => {
  const winnipeg = getJurisdiction("winnipeg")!;

  const baseInput = {
    income1: 70000,
    income2: 50000,
    otherIncome: 0,
    haircut: 0,
    debts: 300,
    amortYears: 25,
    comfortCeiling: 2800,
    insuranceAnnual: 1400,
    utilities: 200,
    condoFee: 0,
    contractRate: 4.29,
    price: 450000,
    dpPct: 10,
    ftb: true,
    ptype: "house" as const,
    elsewhere: false,
  };

  it("returns a positive ceiling and comfort figure for a plausible household", () => {
    const result = affordability(winnipeg, federal, baseInput);
    expect(result.ceiling).toBeGreaterThan(0);
    expect(result.comfort).toBeGreaterThan(0);
  });

  it("increases the qualification ceiling as qualifying income rises", () => {
    const low = affordability(winnipeg, federal, { ...baseInput, income1: 50000, income2: 0 });
    const high = affordability(winnipeg, federal, { ...baseInput, income1: 90000, income2: 60000 });
    expect(high.ceiling).toBeGreaterThan(low.ceiling);
  });

  it("increases the comfort ceiling as the household's comfort budget rises", () => {
    const tight = affordability(winnipeg, federal, { ...baseInput, comfortCeiling: 2000 });
    const roomy = affordability(winnipeg, federal, { ...baseInput, comfortCeiling: 4000 });
    expect(roomy.comfort).toBeGreaterThan(tight.comfort);
  });

  it("fails approval when the target price exceeds the qualification ceiling", () => {
    const result = affordability(winnipeg, federal, { ...baseInput, income1: 30000, income2: 0, price: 900000 });
    expect(result.approvalPass).toBe(false);
  });

  it("passes the comfort check when total monthly cost is at or below the comfort ceiling", () => {
    const result = affordability(winnipeg, federal, { ...baseInput, price: 200000, dpPct: 20 });
    expect(result.comfortPass).toBe(result.monthly.total <= baseInput.comfortCeiling);
  });

  it("returns zero income-based figures when qualifying income is zero", () => {
    const result = affordability(winnipeg, federal, { ...baseInput, income1: 0, income2: 0, otherIncome: 0 });
    expect(result.ceiling).toBe(0);
    expect(result.gdsAtTarget).toBe(0);
    expect(result.tdsAtTarget).toBe(0);
  });

  it("builds the monthly total from its own components", () => {
    const result = affordability(winnipeg, federal, baseInput);
    const { pi, propTax, insurance, utilities, condoFee, maintenance, total } = result.monthly;
    expect(total).toBeCloseTo(pi + propTax + insurance + utilities + condoFee + maintenance, 5);
  });

  it("produces a different ceiling in a jurisdiction with materially different transfer-tax rules", () => {
    // Toronto stacks provincial + municipal LTT (with a rebate cap) on top of an 8% premium
    // tax; Winnipeg has neither a municipal LTT nor a premium tax. Same household, same price
    // — the two-ceiling numbers should not coincidentally match.
    const toronto = getJurisdiction("toronto")!;
    const winnipegResult = affordability(winnipeg, federal, baseInput);
    const torontoResult = affordability(toronto, federal, baseInput);
    expect(torontoResult.ceiling).not.toBeCloseTo(winnipegResult.ceiling, 0);
    expect(torontoResult.cc.total).toBeGreaterThan(winnipegResult.cc.total);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/domain/engine.test.ts`
Expected: FAIL — `affordability` is not exported yet.

- [ ] **Step 3: Append to `src/domain/engine.ts`**

```typescript
export interface AffordabilityInput {
  income1: number;
  income2: number;
  otherIncome: number;
  haircut: number;
  debts: number;
  amortYears: number;
  comfortCeiling: number;
  insuranceAnnual: number;
  utilities: number;
  condoFee: number;
  contractRate: number;
  price: number;
  dpPct: number;
  ftb: boolean;
  ptype: PropertyType;
  elsewhere: boolean;
}

/**
 * Two ceilings, computed side by side: `ceiling` is what a lender's GDS/TDS stress test would
 * approve; `comfort` is what actually fits inside the household's real monthly budget. Mirrors
 * the Affordability tab of the Winnipeg reference model.
 */
export function affordability(j: Jurisdiction, F: FederalRules, o: AffordabilityInput) {
  const gross = o.income1 + o.income2 + o.otherIncome;
  const qualIncome = gross * (1 - o.haircut / 100);
  const qualRate = Math.max(F.stressTest.floor, o.contractRate + F.stressTest.buffer) / 100;
  const fq = payFactor(qualRate, o.amortYears);
  const fc = payFactor(o.contractRate / 100, o.amortYears);

  const gdsAllow = (qualIncome * (F.gds / 100)) / 12;
  const tdsAllow = (qualIncome * (F.tds / 100)) / 12 - o.debts;
  const binding = Math.min(gdsAllow, tdsAllow);
  const tdsBinds = tdsAllow < gdsAllow;

  // Solved so property tax scales with price. Assumes 20% down, as the source model does.
  const denomLender = 0.8 * fq + j.propTax / 12;
  const ceiling = qualIncome <= 0 ? 0 : Math.max(0, (binding - F.heatAllowance - o.condoFee * 0.5) / denomLender);

  const budget = o.comfortCeiling - o.insuranceAnnual / 12 - o.utilities - o.condoFee;
  const denomComfort = 0.8 * fc + j.propTax / 12 + F.maintenanceReserve / 12;
  const comfort = Math.max(0, budget) / denomComfort;

  // The target price, actually financed at the actual down payment.
  const cc = closingTotal(j, F, {
    price: o.price,
    dpPct: o.dpPct,
    ftb: o.ftb,
    ptype: o.ptype,
    amortYears: o.amortYears,
    elsewhere: o.elsewhere,
  });
  const pi = cc.fin.loan * payFactor(cc.fin.insured ? F.rates.insured : F.rates.uninsured, o.amortYears);
  const monthly = {
    pi,
    propTax: (o.price * j.propTax) / 12,
    insurance: o.insuranceAnnual / 12,
    utilities: o.utilities,
    condoFee: o.condoFee,
    maintenance: (o.price * F.maintenanceReserve) / 12,
    total: 0,
  };
  monthly.total =
    monthly.pi + monthly.propTax + monthly.insurance + monthly.utilities + monthly.condoFee + monthly.maintenance;

  // What a lender counts at the target price: a fixed heating allowance, not real utilities.
  const gdsAtTarget =
    qualIncome <= 0
      ? 0
      : ((cc.fin.loan * fq + monthly.propTax + F.heatAllowance + o.condoFee * 0.5) / (qualIncome / 12)) * 100;
  const tdsAtTarget =
    qualIncome <= 0
      ? 0
      : ((cc.fin.loan * fq + monthly.propTax + F.heatAllowance + o.condoFee * 0.5 + o.debts) / (qualIncome / 12)) * 100;

  // Marginal cost of debt: what one dollar of monthly obligation removes from the ceiling.
  const capacityPerDollar = 1 / denomLender;

  return {
    gross,
    qualIncome,
    qualRate: qualRate * 100,
    fq,
    fc,
    gdsAllow,
    tdsAllow,
    binding,
    tdsBinds,
    ceiling,
    comfort,
    budget,
    monthly,
    cc,
    gdsAtTarget,
    tdsAtTarget,
    capacityPerDollar,
    impliedMortgage: ceiling * 0.8,
    comfortDown: comfort * 0.2,
    comfortPI: comfort * 0.8 * fc,
    approvalPass: o.price <= ceiling,
    comfortPass: monthly.total <= o.comfortCeiling,
    comfortGap: monthly.total - o.comfortCeiling,
    gap: ceiling - comfort,
  };
}

export type AffordabilityResult = ReturnType<typeof affordability>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/domain/engine.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 6: Commit**

```bash
git add src/domain/engine.ts src/domain/engine.test.ts
git commit -m "feat(domain): add affordability two-ceiling calculation"
```

---

## Task 6: Shared state hook

**Files:**
- Create: `src/hooks/use-shared-state.ts`
- Test: `src/hooks/use-shared-state.test.tsx`

**Interfaces:**
- Consumes: nothing beyond React and browser globals.
- Produces: `useSharedState<T extends Record<string, unknown>>(allowlist: readonly (keyof T & string)[], defaults: T): [T, (patch: Partial<T>) => void]`. Every hook instance persists to the same `localStorage` key (`norma.inputs.v1`), reading and writing only the keys in its own `allowlist`, merged with whatever the storage blob already holds — so the jurisdiction picker (Task 9) and the Affordability page (Task 11) can each own a different slice of the same store without clobbering each other. **Callers must pass a stable (module-level or `useMemo`'d) `allowlist` array**, not an inline literal, or the persist effect re-fires every render.

- [ ] **Step 1: Write the failing test `src/hooks/use-shared-state.test.tsx`**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSharedState } from "./use-shared-state";

const KEYS = ["price", "jurId"] as const;
const DEFAULTS = { price: 500000, jurId: "winnipeg" };

describe("useSharedState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts from defaults when localStorage is empty", () => {
    const { result } = renderHook(() => useSharedState(KEYS, DEFAULTS));
    expect(result.current[0]).toEqual(DEFAULTS);
  });

  it("hydrates from localStorage after mount", async () => {
    window.localStorage.setItem("norma.inputs.v1", JSON.stringify({ price: 700000, jurId: "toronto" }));
    const { result } = renderHook(() => useSharedState(KEYS, DEFAULTS));
    await waitFor(() => expect(result.current[0].price).toBe(700000));
    expect(result.current[0].jurId).toBe("toronto");
  });

  it("persists a patch to localStorage", async () => {
    const { result } = renderHook(() => useSharedState(KEYS, DEFAULTS));
    act(() => result.current[1]({ price: 600000 }));
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("norma.inputs.v1") ?? "{}");
      expect(stored.price).toBe(600000);
    });
  });

  it("does not clobber keys owned by a different allowlist in the same storage blob", async () => {
    window.localStorage.setItem("norma.inputs.v1", JSON.stringify({ otherHookKey: "keep-me" }));
    const { result } = renderHook(() => useSharedState(KEYS, DEFAULTS));
    act(() => result.current[1]({ price: 600000 }));
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("norma.inputs.v1") ?? "{}");
      expect(stored.otherHookKey).toBe("keep-me");
      expect(stored.price).toBe(600000);
    });
  });

  it("merges a patch into existing state rather than replacing it", () => {
    const { result } = renderHook(() => useSharedState(KEYS, DEFAULTS));
    act(() => result.current[1]({ price: 600000 }));
    expect(result.current[0]).toEqual({ price: 600000, jurId: "winnipeg" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/use-shared-state.test.tsx`
Expected: FAIL — `src/hooks/use-shared-state.ts` does not exist yet.

- [ ] **Step 3: Write `src/hooks/use-shared-state.ts`**

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORE_KEY = "norma.inputs.v1";

function readStore<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
): Partial<T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<T> = {};
    for (const key of allowlist) {
      if (key in parsed) out[key] = parsed[key] as T[typeof key];
    }
    return out;
  } catch {
    return {};
  }
}

function writeStore<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
  state: T,
) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    for (const key of allowlist) existing[key] = state[key];
    window.localStorage.setItem(STORE_KEY, JSON.stringify(existing));
  } catch {
    // storage full or unavailable (private browsing) — state still lives in memory
  }
}

/**
 * Persists a slice of component state to a shared localStorage blob, keyed by an allowlist so
 * multiple independent call sites (e.g. the header's jurisdiction picker and a full input form)
 * can share one storage key without overwriting each other's fields. See the Phase 1 spec's
 * Scalability section — this is the mechanism later pages' inputs plug into.
 */
export function useSharedState<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const [state, setState] = useState<T>(defaults);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = readStore<T>(allowlist);
    if (Object.keys(stored).length > 0) {
      setState((prev) => ({ ...prev, ...stored }));
    }
  }, [allowlist]);

  useEffect(() => {
    if (!hydrated.current) return;
    writeStore(allowlist, state);
  }, [allowlist, state]);

  const update = useCallback((patch: Partial<T>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  return [state, update];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/hooks/use-shared-state.test.tsx`
Expected: all 5 tests PASS.

- [ ] **Step 5: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-shared-state.ts src/hooks/use-shared-state.test.tsx
git commit -m "feat: add localStorage-backed shared state hook"
```

---

## Task 7: Theme toggle

**Files:**
- Create: `src/components/theme-provider.tsx`
- Create: `src/components/theme-toggle.tsx`
- Create: `src/test/render-with-intl.tsx`
- Modify: `vitest.setup.ts`
- Modify: `messages/en.json`, `messages/fr.json`
- Test: `src/components/theme-toggle.test.tsx`

**Interfaces:**
- Consumes: `Button` from `src/components/ui/button.tsx` (existing).
- Produces: `ThemeProvider` (wraps `next-themes`' provider) and `ThemeToggle` from `src/components/`, used by `AppHeader` in Task 9. `renderWithIntl(ui, options?)` test helper from `src/test/render-with-intl.tsx`, reused by every later component test in this plan. A new `AppHeader` message namespace with a `theme` key.

- [ ] **Step 1: Install `next-themes`**

Run: `npm install next-themes`
Expected: added to `dependencies` in `package.json`.

- [ ] **Step 2: Add a `window.matchMedia` mock to `vitest.setup.ts`**

`next-themes` reads `window.matchMedia` when following the system theme; jsdom doesn't implement it. Replace the file's contents with:

```typescript
import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
```

- [ ] **Step 3: Add the `AppHeader.theme` message key**

In `messages/en.json`, add a new top-level `"AppHeader"` object (after `"Home"`):

```json
  "AppHeader": {
    "theme": "Theme"
  }
```

In `messages/fr.json`, add the matching entry:

```json
  "AppHeader": {
    "theme": "Thème"
  }
```

- [ ] **Step 4: Write the test helper `src/test/render-with-intl.tsx`**

```typescript
import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import enMessages from "../../messages/en.json";

export function renderWithIntl(ui: ReactElement, options?: RenderOptions) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}
```

- [ ] **Step 5: Write the failing test `src/components/theme-toggle.test.tsx`**

```typescript
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

function renderToggle() {
  return renderWithIntl(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  it("renders a labeled button", async () => {
    renderToggle();
    await waitFor(() => expect(screen.getByRole("button", { name: "Theme" })).toBeInTheDocument());
  });

  it("toggles the html element's dark class on click", async () => {
    const user = userEvent.setup();
    renderToggle();
    const button = await screen.findByRole("button", { name: "Theme" });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    await user.click(button);
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    await user.click(button);
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(false));
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/components/theme-toggle.test.tsx`
Expected: FAIL — neither `theme-provider.tsx` nor `theme-toggle.tsx` exist yet.

- [ ] **Step 7: Write `src/components/theme-provider.tsx`**

```typescript
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 8: Write `src/components/theme-toggle.tsx`**

```typescript
"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("AppHeader");

  useEffect(() => setMounted(true), []);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={t("theme")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run src/components/theme-toggle.test.tsx`
Expected: both tests PASS.

- [ ] **Step 10: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json vitest.setup.ts messages/en.json messages/fr.json \
  src/test/render-with-intl.tsx src/components/theme-provider.tsx src/components/theme-toggle.tsx \
  src/components/theme-toggle.test.tsx
git commit -m "feat: add theme toggle (next-themes) and shared component test helper"
```

---

## Task 8: Locale switcher

**Files:**
- Create: `src/components/locale-switcher.tsx`
- Modify: `messages/en.json`, `messages/fr.json`
- Test: `src/components/locale-switcher.test.tsx`

**Interfaces:**
- Consumes: `Button` (existing); `routing`, `usePathname`, `useRouter` from `@/i18n/routing` and `@/i18n/navigation` (existing, Task 1 groundwork not required). `renderWithIntl` (Task 7).
- Produces: `LocaleSwitcher` from `src/components/locale-switcher.tsx`, used by `AppHeader` in Task 9. Adds `AppHeader.changeLanguage` message key.

- [ ] **Step 1: Add the `AppHeader.changeLanguage` message key**

In `messages/en.json`, extend the `"AppHeader"` object added in Task 7:

```json
  "AppHeader": {
    "theme": "Theme",
    "changeLanguage": "Change language"
  }
```

In `messages/fr.json`:

```json
  "AppHeader": {
    "theme": "Thème",
    "changeLanguage": "Changer de langue"
  }
```

- [ ] **Step 2: Write the failing test `src/components/locale-switcher.test.tsx`**

```typescript
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { LocaleSwitcher } from "./locale-switcher";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace }),
}));

describe("LocaleSwitcher", () => {
  it("renders a button for every configured locale", () => {
    renderWithIntl(<LocaleSwitcher />);
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FR" })).toBeInTheDocument();
  });

  it("marks the active locale as current", () => {
    renderWithIntl(<LocaleSwitcher />);
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "FR" })).toHaveAttribute("aria-current", "false");
  });

  it("navigates to the same path in the other locale on click", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LocaleSwitcher />);
    await user.click(screen.getByRole("button", { name: "FR" }));
    expect(replace).toHaveBeenCalledWith("/", { locale: "fr" });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/locale-switcher.test.tsx`
Expected: FAIL — `src/components/locale-switcher.tsx` does not exist yet.

- [ ] **Step 4: Write `src/components/locale-switcher.tsx`**

```typescript
"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

const LOCALE_LABELS: Record<string, string> = { en: "EN", fr: "FR" };

export function LocaleSwitcher() {
  const t = useTranslations("AppHeader");
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const activeLocale = params.locale;

  return (
    <div role="group" aria-label={t("changeLanguage")} className="flex gap-1">
      {routing.locales.map((locale) => (
        <Button
          key={locale}
          type="button"
          variant={locale === activeLocale ? "secondary" : "ghost"}
          size="sm"
          aria-current={locale === activeLocale}
          onClick={() => router.replace(pathname, { locale })}
        >
          {LOCALE_LABELS[locale]}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/locale-switcher.test.tsx`
Expected: all 3 tests PASS.

- [ ] **Step 6: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 7: Commit**

```bash
git add messages/en.json messages/fr.json src/components/locale-switcher.tsx src/components/locale-switcher.test.tsx
git commit -m "feat: add locale switcher"
```

---

## Task 9: Jurisdiction picker + App header (wired into layout)

**Files:**
- Create: `src/components/ui/select.tsx` (via shadcn CLI)
- Create: `src/components/jurisdiction-picker.tsx`
- Create: `src/components/app-header.tsx`
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `messages/en.json`, `messages/fr.json`
- Test: `src/components/jurisdiction-picker.test.tsx`, `src/components/app-header.test.tsx`

**Interfaces:**
- Consumes: `useSharedState` (Task 6); `jurisdictions` from `src/domain/jurisdictions` (Task 2); `LocaleSwitcher` (Task 8); `ThemeProvider`, `ThemeToggle` (Task 7); `renderWithIntl` (Task 7); shadcn `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`.
- Produces: `JurisdictionProvider` and `useJurisdiction()` from `src/hooks/use-jurisdiction.tsx`; `JurisdictionPicker` and `AppHeader` from `src/components/`. `AppHeader` is rendered once in the root locale layout, above `{children}`, wrapped by `JurisdictionProvider` — so every future page gets the header for free, and reads the *same live* jurisdiction selection via `useJurisdiction()` rather than a separately-hydrated copy. Adds `Jurisdictions` (14 entries) and `AppHeader.brand` / `AppHeader.changeLocation` message keys.

**Why a context here and `useSharedState` directly everywhere else:** `AppHeader` and page content are siblings under the layout, not parent/child, so two independent `useSharedState(["jurId"], ...)` calls would each hold their own React state — consistent only after a full reload via localStorage, not live within the same tab. Jurisdiction is the one piece of state every current and future page shares with the header, so it gets a context wrapping `useSharedState` once. Page-local inputs (Task 11) don't have this problem — they're only ever read by the page that owns them — so they call `useSharedState` directly.

- [ ] **Step 1: Install the shadcn `select` component**

Run: `npx shadcn@latest add select -b radix -p nova`
Expected: creates `src/components/ui/select.tsx`.

- [ ] **Step 2: Add the `Jurisdictions` and remaining `AppHeader` message keys**

In `messages/en.json`, add a new top-level `"Jurisdictions"` object and extend `"AppHeader"`:

```json
  "AppHeader": {
    "theme": "Theme",
    "changeLanguage": "Change language",
    "brand": "norma",
    "changeLocation": "Change location"
  },
  "Jurisdictions": {
    "toronto": "Toronto",
    "ottawa": "Ottawa",
    "vancouver": "Vancouver",
    "halifax": "Halifax",
    "winnipeg": "Winnipeg",
    "montreal": "Montréal",
    "calgary": "Calgary",
    "saskatoon": "Saskatoon",
    "nb": "New Brunswick",
    "nl": "Newfoundland and Labrador",
    "pe": "Prince Edward Island",
    "yt": "Yukon",
    "nt": "Northwest Territories",
    "nu": "Nunavut"
  }
```

In `messages/fr.json`:

```json
  "AppHeader": {
    "theme": "Thème",
    "changeLanguage": "Changer de langue",
    "brand": "norma",
    "changeLocation": "Changer de lieu"
  },
  "Jurisdictions": {
    "toronto": "Toronto",
    "ottawa": "Ottawa",
    "vancouver": "Vancouver",
    "halifax": "Halifax",
    "winnipeg": "Winnipeg",
    "montreal": "Montréal",
    "calgary": "Calgary",
    "saskatoon": "Saskatoon",
    "nb": "Nouveau-Brunswick",
    "nl": "Terre-Neuve-et-Labrador",
    "pe": "Île-du-Prince-Édouard",
    "yt": "Yukon",
    "nt": "Territoires du Nord-Ouest",
    "nu": "Nunavut"
  }
```

- [ ] **Step 3: Write the failing test `src/hooks/use-jurisdiction.test.tsx`**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { JurisdictionProvider, useJurisdiction } from "./use-jurisdiction";

describe("useJurisdiction", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to winnipeg", () => {
    const { result } = renderHook(() => useJurisdiction(), { wrapper: JurisdictionProvider });
    expect(result.current[0].jurId).toBe("winnipeg");
  });

  it("throws when used outside a JurisdictionProvider", () => {
    expect(() => renderHook(() => useJurisdiction())).toThrow(
      "useJurisdiction must be used within a JurisdictionProvider",
    );
  });

  it("shares one live value between two consumers under the same provider", async () => {
    function useTwoConsumers() {
      const a = useJurisdiction();
      const b = useJurisdiction();
      return { a, b };
    }
    const { result } = renderHook(() => useTwoConsumers(), { wrapper: JurisdictionProvider });
    act(() => result.current.a[1]({ jurId: "toronto" }));
    await waitFor(() => expect(result.current.b[0].jurId).toBe("toronto"));
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/hooks/use-jurisdiction.test.tsx`
Expected: FAIL — `src/hooks/use-jurisdiction.tsx` does not exist yet.

- [ ] **Step 5: Write `src/hooks/use-jurisdiction.tsx`**

```typescript
"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSharedState } from "./use-shared-state";

const JURISDICTION_KEYS = ["jurId"] as const;

interface JurisdictionState {
  jurId: string;
}

const DEFAULT_JURISDICTION_STATE: JurisdictionState = { jurId: "winnipeg" };

type JurisdictionContextValue = [JurisdictionState, (patch: Partial<JurisdictionState>) => void];

const JurisdictionContext = createContext<JurisdictionContextValue | null>(null);

/**
 * Wraps the app once (root layout) so the header's jurisdiction picker and every page's
 * calculations read the same live selection, not independently-hydrated copies. See the
 * "Why a context here" note above.
 */
export function JurisdictionProvider({ children }: { children: ReactNode }) {
  const value = useSharedState(JURISDICTION_KEYS, DEFAULT_JURISDICTION_STATE);
  return <JurisdictionContext.Provider value={value}>{children}</JurisdictionContext.Provider>;
}

export function useJurisdiction(): JurisdictionContextValue {
  const ctx = useContext(JurisdictionContext);
  if (!ctx) throw new Error("useJurisdiction must be used within a JurisdictionProvider");
  return ctx;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/hooks/use-jurisdiction.test.tsx`
Expected: all 3 tests PASS.

- [ ] **Step 7: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/use-jurisdiction.tsx src/hooks/use-jurisdiction.test.tsx
git commit -m "feat: add JurisdictionProvider for live cross-component jurisdiction state"
```

- [ ] **Step 9: Write the failing test `src/components/jurisdiction-picker.test.tsx`**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { JurisdictionPicker } from "./jurisdiction-picker";

function renderPicker() {
  return renderWithIntl(
    <JurisdictionProvider>
      <JurisdictionPicker />
    </JurisdictionProvider>,
  );
}

describe("JurisdictionPicker", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the default jurisdiction's label", async () => {
    renderPicker();
    expect(await screen.findByText("Winnipeg")).toBeInTheDocument();
  });

  it("lists every jurisdiction as an option", async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(await screen.findByRole("combobox"));
    expect(await screen.findByRole("option", { name: "Toronto" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Nunavut" })).toBeInTheDocument();
  });

  it("persists the selection to localStorage", async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(await screen.findByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Toronto" }));
    await screen.findByText("Toronto");
    const stored = JSON.parse(window.localStorage.getItem("norma.inputs.v1") ?? "{}");
    expect(stored.jurId).toBe("toronto");
  });
});
```

- [ ] **Step 10: Run the test to verify it fails**

Run: `npx vitest run src/components/jurisdiction-picker.test.tsx`
Expected: FAIL — `src/components/jurisdiction-picker.tsx` does not exist yet.

- [ ] **Step 11: Write `src/components/jurisdiction-picker.tsx`**

```typescript
"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jurisdictions } from "@/domain/jurisdictions";
import { useJurisdiction } from "@/hooks/use-jurisdiction";

export function JurisdictionPicker() {
  const t = useTranslations("AppHeader");
  const tJur = useTranslations("Jurisdictions");
  const [state, update] = useJurisdiction();

  return (
    <Select value={state.jurId} onValueChange={(jurId) => update({ jurId })}>
      <SelectTrigger aria-label={t("changeLocation")} className="w-auto">
        <SelectValue>{tJur(state.jurId)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {jurisdictions.map((j) => (
          <SelectItem key={j.id} value={j.id}>
            {tJur(j.id)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `npx vitest run src/components/jurisdiction-picker.test.tsx`
Expected: all 3 tests PASS.

- [ ] **Step 13: Write the failing test `src/components/app-header.test.tsx`**

```typescript
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { ThemeProvider } from "./theme-provider";
import { AppHeader } from "./app-header";

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AppHeader", () => {
  it("renders the brand link, jurisdiction picker, locale switcher, and theme toggle together", async () => {
    renderWithIntl(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <JurisdictionProvider>
          <AppHeader />
        </JurisdictionProvider>
      </ThemeProvider>,
    );
    expect(screen.getByRole("link", { name: "norma" })).toHaveAttribute("href", "/");
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Theme" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 14: Run the test to verify it fails**

Run: `npx vitest run src/components/app-header.test.tsx`
Expected: FAIL — `src/components/app-header.tsx` does not exist yet.

- [ ] **Step 15: Write `src/components/app-header.tsx`**

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { JurisdictionPicker } from "@/components/jurisdiction-picker";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  const t = useTranslations("AppHeader");

  return (
    <header className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        {t("brand")}
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <JurisdictionPicker />
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
```

- [ ] **Step 16: Run the test to verify it passes**

Run: `npx vitest run src/components/app-header.test.tsx`
Expected: PASS.

- [ ] **Step 17: Wire `AppHeader`, `ThemeProvider`, and `JurisdictionProvider` into the root layout**

In `src/app/[locale]/layout.tsx`, add imports for `ThemeProvider`, `JurisdictionProvider`, and `AppHeader`, add `suppressHydrationWarning` to the `<html>` tag (next-themes sets the class before hydration, which would otherwise warn), and wrap `{children}` with all three:

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { AppHeader } from "@/components/app-header";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <JurisdictionProvider>
              <AppHeader />
              {children}
            </JurisdictionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 18: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 19: Manual smoke check**

Run: `npm run dev`, open `http://localhost:3000`. Expected: the header renders with a "norma" link, a jurisdiction dropdown defaulting to Winnipeg, EN/FR buttons that switch the URL locale, and a theme button that toggles dark mode.

- [ ] **Step 20: Commit**

```bash
git add messages/en.json messages/fr.json src/components/ui/select.tsx \
  src/hooks/use-jurisdiction.tsx src/hooks/use-jurisdiction.test.tsx \
  src/components/jurisdiction-picker.tsx src/components/jurisdiction-picker.test.tsx \
  src/components/app-header.tsx src/components/app-header.test.tsx \
  src/app/\[locale\]/layout.tsx
git commit -m "feat: add jurisdiction picker and app header, wire into root layout"
```

---

## Task 10: Home page CTA

**Files:**
- Modify: `src/app/[locale]/page.tsx`
- Modify: `messages/en.json`, `messages/fr.json`
- Test: `src/app/[locale]/page.test.tsx`

**Interfaces:**
- Consumes: `Button` (existing); `Link` from `@/i18n/navigation` (existing); `renderWithIntl` (Task 7).
- Produces: nothing new consumed by later tasks — this is a leaf page. Adds `Home.cta` message key.

- [ ] **Step 1: Add the `Home.cta` message key**

In `messages/en.json`, extend the existing `"Home"` object:

```json
  "Home": {
    "heading": "What can you actually afford?",
    "subheading": "Not what a bank will approve — your province's real tax and cost-of-ownership rules, applied to your real numbers.",
    "cta": "See what you can afford"
  }
```

In `messages/fr.json`:

```json
  "Home": {
    "heading": "Que pouvez-vous vraiment vous permettre?",
    "subheading": "Pas ce qu'une banque approuvera — les vraies règles fiscales et les coûts réels de votre province, appliqués à vos vrais chiffres.",
    "cta": "Voir ce que vous pouvez vous permettre"
  }
```

- [ ] **Step 2: Write the failing test `src/app/[locale]/page.test.tsx`**

```typescript
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import Home from "./page";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Home page", () => {
  it("renders the heading", () => {
    renderWithIntl(<Home />);
    expect(screen.getByRole("heading", { name: "What can you actually afford?" })).toBeInTheDocument();
  });

  it("links its primary CTA to the affordability page", () => {
    renderWithIntl(<Home />);
    expect(screen.getByRole("link", { name: "See what you can afford" })).toHaveAttribute(
      "href",
      "/affordability",
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run "src/app/[locale]/page.test.tsx"`
Expected: FAIL — no CTA link exists on the page yet.

- [ ] **Step 4: Modify `src/app/[locale]/page.tsx`**

```typescript
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function Home() {
  const t = useTranslations("Home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("heading")}
      </h1>
      <p className="max-w-xl text-muted-foreground">{t("subheading")}</p>
      <Button asChild size="lg">
        <Link href="/affordability">{t("cta")}</Link>
      </Button>
    </main>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run "src/app/[locale]/page.test.tsx"`
Expected: both tests PASS.

- [ ] **Step 6: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 7: Commit**

```bash
git add messages/en.json messages/fr.json "src/app/[locale]/page.tsx" "src/app/[locale]/page.test.tsx"
git commit -m "feat: add Home page CTA into Affordability"
```

---

## Task 11: Affordability page — input form

**Files:**
- Create: `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/switch.tsx` (via shadcn CLI)
- Create: `src/app/[locale]/affordability/page.tsx`
- Modify: `messages/en.json`, `messages/fr.json`
- Test: `src/app/[locale]/affordability/page.test.tsx`

**Interfaces:**
- Consumes: `useSharedState` (Task 6); shadcn `Input`/`Label`/`Switch`/`Select` family; `renderWithIntl` (Task 7).
- Produces: the page component at route `/affordability`, holding form state under a stable `AFFORDABILITY_KEYS` allowlist and a `DEFAULT_AFFORDABILITY_STATE` object. Task 12 modifies this same file to add jurisdiction/engine wiring and the output panels, reusing both. Adds a new `Affordability` message namespace.

- [ ] **Step 1: Install the shadcn `input`, `label`, and `switch` components**

Run: `npx shadcn@latest add input label switch -b radix -p nova`
Expected: creates `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/switch.tsx`.

- [ ] **Step 2: Add the `Affordability` message namespace**

In `messages/en.json`, add a new top-level `"Affordability"` object:

```json
  "Affordability": {
    "heading": "What can you actually afford?",
    "subheading": "Two numbers, side by side: what a lender would approve, and what actually fits your budget.",
    "income1": "Your annual income",
    "income2": "Co-buyer's annual income",
    "otherIncome": "Other annual income",
    "debts": "Monthly debt payments",
    "price": "Purchase price you're considering",
    "dpPct": "Down payment (% of price)",
    "amortYears": "Amortization (years)",
    "contractRate": "Mortgage rate (%)",
    "comfortCeiling": "Your real monthly housing budget",
    "insuranceAnnual": "Home insurance (annual)",
    "utilities": "Utilities (monthly)",
    "condoFee": "Condo/strata fee (monthly)",
    "ptype": "Property type",
    "ptypeHouse": "Resale house",
    "ptypeCondo": "Resale condo",
    "ptypeNewbuild": "New build",
    "ftb": "First-time buyer"
  }
```

In `messages/fr.json`:

```json
  "Affordability": {
    "heading": "Que pouvez-vous vraiment vous permettre?",
    "subheading": "Deux chiffres, côte à côte : ce qu'un prêteur approuverait, et ce qui correspond vraiment à votre budget.",
    "income1": "Votre revenu annuel",
    "income2": "Revenu annuel du coacheteur",
    "otherIncome": "Autre revenu annuel",
    "debts": "Paiements de dettes mensuels",
    "price": "Prix d'achat envisagé",
    "dpPct": "Mise de fonds (% du prix)",
    "amortYears": "Amortissement (années)",
    "contractRate": "Taux hypothécaire (%)",
    "comfortCeiling": "Votre budget logement mensuel réel",
    "insuranceAnnual": "Assurance habitation (annuelle)",
    "utilities": "Services publics (mensuel)",
    "condoFee": "Frais de copropriété (mensuel)",
    "ptype": "Type de propriété",
    "ptypeHouse": "Maison existante",
    "ptypeCondo": "Condo existant",
    "ptypeNewbuild": "Construction neuve",
    "ftb": "Acheteur d'une première habitation"
  }
```

- [ ] **Step 3: Write the failing test `src/app/[locale]/affordability/page.test.tsx`**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import AffordabilityPage from "./page";

function renderPage() {
  return renderWithIntl(
    <JurisdictionProvider>
      <AffordabilityPage />
    </JurisdictionProvider>,
  );
}

describe("Affordability page — input form", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the heading and every input with its default value", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "What can you actually afford?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your annual income")).toHaveValue(70000);
    expect(screen.getByLabelText("Purchase price you're considering")).toHaveValue(450000);
  });

  it("updates a numeric field's value on change", async () => {
    const user = userEvent.setup();
    renderPage();
    const priceInput = screen.getByLabelText("Purchase price you're considering");
    await user.clear(priceInput);
    await user.type(priceInput, "600000");
    expect(priceInput).toHaveValue(600000);
  });

  it("toggles first-time buyer status", async () => {
    const user = userEvent.setup();
    renderPage();
    const ftbSwitch = screen.getByRole("switch", { name: "First-time buyer" });
    expect(ftbSwitch).toBeChecked();
    await user.click(ftbSwitch);
    expect(ftbSwitch).not.toBeChecked();
  });

  it("persists a field change to localStorage", async () => {
    const user = userEvent.setup();
    renderPage();
    const priceInput = screen.getByLabelText("Purchase price you're considering");
    await user.clear(priceInput);
    await user.type(priceInput, "600000");
    await screen.findByDisplayValue("600000");
    const stored = JSON.parse(window.localStorage.getItem("norma.inputs.v1") ?? "{}");
    expect(stored.price).toBe(600000);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run "src/app/[locale]/affordability/page.test.tsx"`
Expected: FAIL — the route/page does not exist yet.

- [ ] **Step 5: Write `src/app/[locale]/affordability/page.tsx`**

```typescript
"use client";

import type { ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useSharedState } from "@/hooks/use-shared-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const AFFORDABILITY_KEYS = [
  "price", "dpPct", "amortYears", "ftb", "ptype", "elsewhere",
  "insuranceAnnual", "utilities", "condoFee", "comfortCeiling",
  "income1", "income2", "otherIncome", "haircut", "debts", "contractRate",
] as const;

export interface AffordabilityFormState {
  price: number;
  dpPct: number;
  amortYears: number;
  ftb: boolean;
  ptype: "house" | "condo" | "newbuild";
  elsewhere: boolean;
  insuranceAnnual: number;
  utilities: number;
  condoFee: number;
  comfortCeiling: number;
  income1: number;
  income2: number;
  otherIncome: number;
  haircut: number;
  debts: number;
  contractRate: number;
}

export const DEFAULT_AFFORDABILITY_STATE: AffordabilityFormState = {
  price: 450000,
  dpPct: 10,
  amortYears: 25,
  ftb: true,
  ptype: "house",
  elsewhere: false,
  insuranceAnnual: 1400,
  utilities: 200,
  condoFee: 0,
  comfortCeiling: 2800,
  income1: 70000,
  income2: 50000,
  otherIncome: 0,
  haircut: 0,
  debts: 300,
  contractRate: 4.29,
};

type NumericKey = Exclude<keyof AffordabilityFormState, "ftb" | "ptype" | "elsewhere">;

export default function AffordabilityPage() {
  const t = useTranslations("Affordability");
  const [form, updateForm] = useSharedState(AFFORDABILITY_KEYS, DEFAULT_AFFORDABILITY_STATE);

  const numberField = (key: NumericKey) => ({
    id: key,
    type: "number" as const,
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.valueAsNumber;
      updateForm({ [key]: Number.isNaN(value) ? 0 : value });
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground">{t("subheading")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="income1">{t("income1")}</Label>
          <Input {...numberField("income1")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="income2">{t("income2")}</Label>
          <Input {...numberField("income2")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="otherIncome">{t("otherIncome")}</Label>
          <Input {...numberField("otherIncome")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="debts">{t("debts")}</Label>
          <Input {...numberField("debts")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">{t("price")}</Label>
          <Input {...numberField("price")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dpPct">{t("dpPct")}</Label>
          <Input {...numberField("dpPct")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amortYears">{t("amortYears")}</Label>
          <Input {...numberField("amortYears")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contractRate">{t("contractRate")}</Label>
          <Input {...numberField("contractRate")} step="0.01" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="comfortCeiling">{t("comfortCeiling")}</Label>
          <Input {...numberField("comfortCeiling")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="insuranceAnnual">{t("insuranceAnnual")}</Label>
          <Input {...numberField("insuranceAnnual")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="utilities">{t("utilities")}</Label>
          <Input {...numberField("utilities")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="condoFee">{t("condoFee")}</Label>
          <Input {...numberField("condoFee")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ptype">{t("ptype")}</Label>
          <Select
            value={form.ptype}
            onValueChange={(ptype) => updateForm({ ptype: ptype as AffordabilityFormState["ptype"] })}
          >
            <SelectTrigger id="ptype">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="house">{t("ptypeHouse")}</SelectItem>
              <SelectItem value="condo">{t("ptypeCondo")}</SelectItem>
              <SelectItem value="newbuild">{t("ptypeNewbuild")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Switch id="ftb" checked={form.ftb} onCheckedChange={(ftb) => updateForm({ ftb })} />
          <Label htmlFor="ftb">{t("ftb")}</Label>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run "src/app/[locale]/affordability/page.test.tsx"`
Expected: all 4 tests PASS.

- [ ] **Step 7: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 8: Commit**

```bash
git add messages/en.json messages/fr.json \
  src/components/ui/input.tsx src/components/ui/label.tsx src/components/ui/switch.tsx \
  "src/app/[locale]/affordability/page.tsx" "src/app/[locale]/affordability/page.test.tsx"
git commit -m "feat: add Affordability page input form"
```

---

## Task 12: Affordability page — output panels

**Files:**
- Create: `src/components/ui/card.tsx` (via shadcn CLI)
- Modify: `src/app/[locale]/affordability/page.tsx`
- Modify: `messages/en.json`, `messages/fr.json`
- Modify: `src/app/[locale]/affordability/page.test.tsx`

**Interfaces:**
- Consumes: `affordability`, `money` from `src/domain/engine.ts` (Tasks 3, 5); `federal` from `src/domain/federal.ts` (Task 1); `getJurisdiction` from `src/domain/jurisdictions` (Task 2); `useJurisdiction` (Task 9); `AFFORDABILITY_KEYS`, `DEFAULT_AFFORDABILITY_STATE`, `AffordabilityFormState` (Task 11, same file); shadcn `Card`/`CardHeader`/`CardTitle`/`CardContent`.
- Produces: the completed Affordability page — this is the last task in Phase 1, nothing downstream consumes it within this plan.

- [ ] **Step 1: Install the shadcn `card` component**

Run: `npx shadcn@latest add card -b radix -p nova`
Expected: creates `src/components/ui/card.tsx`.

- [ ] **Step 2: Extend the `Affordability` message namespace**

In `messages/en.json`, add these keys to the existing `"Affordability"` object:

```json
    "ceiling": "What a lender would approve",
    "comfort": "What fits your real budget",
    "approvalPass": "Within reach at this price",
    "approvalFail": "Above what a lender would approve",
    "comfortPass": "Fits your monthly budget",
    "comfortFail": "Over your monthly budget",
    "monthlyBreakdown": "Monthly cost at this price",
    "pi": "Principal and interest",
    "propTax": "Property tax",
    "maintenance": "Maintenance reserve",
    "total": "Total"
```

In `messages/fr.json`:

```json
    "ceiling": "Ce qu'un prêteur approuverait",
    "comfort": "Ce qui correspond à votre budget réel",
    "approvalPass": "À votre portée à ce prix",
    "approvalFail": "Au-dessus de ce qu'un prêteur approuverait",
    "comfortPass": "Respecte votre budget mensuel",
    "comfortFail": "Dépasse votre budget mensuel",
    "monthlyBreakdown": "Coût mensuel à ce prix",
    "pi": "Capital et intérêts",
    "propTax": "Taxe foncière",
    "maintenance": "Réserve d'entretien",
    "total": "Total"
```

(Both go inside the existing `"Affordability": { ... }` object alongside the keys added in Task 11 — add a comma after the last existing key, `"ftb"`.)

- [ ] **Step 3: Write the failing test — replace `src/app/[locale]/affordability/page.test.tsx`'s contents**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { federal } from "@/domain/federal";
import { getJurisdiction } from "@/domain/jurisdictions";
import { affordability, money } from "@/domain/engine";
import { JurisdictionPicker } from "@/components/jurisdiction-picker";
import AffordabilityPage, { DEFAULT_AFFORDABILITY_STATE } from "./page";

function renderPage() {
  return renderWithIntl(
    <JurisdictionProvider>
      <AffordabilityPage />
    </JurisdictionProvider>,
  );
}

function renderPageWithPicker() {
  return renderWithIntl(
    <JurisdictionProvider>
      <JurisdictionPicker />
      <AffordabilityPage />
    </JurisdictionProvider>,
  );
}

describe("Affordability page — input form", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the heading and every input with its default value", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "What can you actually afford?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your annual income")).toHaveValue(70000);
    expect(screen.getByLabelText("Purchase price you're considering")).toHaveValue(450000);
  });

  it("updates a numeric field's value on change", async () => {
    const user = userEvent.setup();
    renderPage();
    const priceInput = screen.getByLabelText("Purchase price you're considering");
    await user.clear(priceInput);
    await user.type(priceInput, "600000");
    expect(priceInput).toHaveValue(600000);
  });

  it("toggles first-time buyer status", async () => {
    const user = userEvent.setup();
    renderPage();
    const ftbSwitch = screen.getByRole("switch", { name: "First-time buyer" });
    expect(ftbSwitch).toBeChecked();
    await user.click(ftbSwitch);
    expect(ftbSwitch).not.toBeChecked();
  });

  it("persists a field change to localStorage", async () => {
    const user = userEvent.setup();
    renderPage();
    const priceInput = screen.getByLabelText("Purchase price you're considering");
    await user.clear(priceInput);
    await user.type(priceInput, "600000");
    await screen.findByDisplayValue("600000");
    const stored = JSON.parse(window.localStorage.getItem("norma.inputs.v1") ?? "{}");
    expect(stored.price).toBe(600000);
  });
});

describe("Affordability page — output panels", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the engine's ceiling and comfort figures for the default household in the default jurisdiction (winnipeg)", async () => {
    renderPage();
    const winnipeg = getJurisdiction("winnipeg")!;
    const expected = affordability(winnipeg, federal, DEFAULT_AFFORDABILITY_STATE);

    expect(await screen.findByText(money(expected.ceiling, "en-CA", false))).toBeInTheDocument();
    expect(screen.getByText(money(expected.comfort, "en-CA", false))).toBeInTheDocument();
  });

  it("shows a passing approval badge when the price is within the lender ceiling", async () => {
    renderPage();
    const winnipeg = getJurisdiction("winnipeg")!;
    const expected = affordability(winnipeg, federal, DEFAULT_AFFORDABILITY_STATE);
    expect(expected.approvalPass).toBe(true); // sanity check on the fixture itself
    expect(await screen.findByText("Within reach at this price")).toBeInTheDocument();
  });

  it("recomputes the ceiling when an income field changes", async () => {
    const user = userEvent.setup();
    renderPage();
    const winnipeg = getJurisdiction("winnipeg")!;
    const before = affordability(winnipeg, federal, DEFAULT_AFFORDABILITY_STATE);

    const income1Input = screen.getByLabelText("Your annual income");
    await user.clear(income1Input);
    await user.type(income1Input, "120000");

    const after = affordability(winnipeg, federal, { ...DEFAULT_AFFORDABILITY_STATE, income1: 120000 });
    expect(after.ceiling).toBeGreaterThan(before.ceiling);
    expect(await screen.findByText(money(after.ceiling, "en-CA", false))).toBeInTheDocument();
  });

  it("renders the monthly breakdown total equal to the sum of its own line items", async () => {
    renderPage();
    const winnipeg = getJurisdiction("winnipeg")!;
    const expected = affordability(winnipeg, federal, DEFAULT_AFFORDABILITY_STATE);
    expect(await screen.findByText(money(expected.monthly.total, "en-CA", false))).toBeInTheDocument();
    expect(screen.getByText(money(expected.monthly.pi, "en-CA", false))).toBeInTheDocument();
  });

  it("recomputes the numbers when the jurisdiction is switched in the header picker", async () => {
    const user = userEvent.setup();
    renderPageWithPicker();
    const winnipeg = getJurisdiction("winnipeg")!;
    const toronto = getJurisdiction("toronto")!;
    const winnipegResult = affordability(winnipeg, federal, DEFAULT_AFFORDABILITY_STATE);
    const torontoResult = affordability(toronto, federal, DEFAULT_AFFORDABILITY_STATE);

    expect(await screen.findByText(money(winnipegResult.ceiling, "en-CA", false))).toBeInTheDocument();

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Toronto" }));

    expect(await screen.findByText(money(torontoResult.ceiling, "en-CA", false))).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run "src/app/[locale]/affordability/page.test.tsx"`
Expected: FAIL — the new "output panels" tests fail because no output is rendered yet; `DEFAULT_AFFORDABILITY_STATE` import still resolves since Task 11 exported it.

- [ ] **Step 5: Modify `src/app/[locale]/affordability/page.tsx`**

Add these imports alongside the existing ones:

```typescript
import { useLocale, useTranslations } from "next-intl";
import { affordability, money } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { getJurisdiction } from "@/domain/jurisdictions";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```

(The `useTranslations` import already exists from Task 11 — add `useLocale` alongside it in the same `import { ... } from "next-intl"` line rather than duplicating the import statement.)

Add a locale-to-`Intl`-tag map above the component, next to the other module-level constants:

```typescript
const INTL_LOCALES: Record<string, string> = { en: "en-CA", fr: "fr-CA" };
```

Inside `AffordabilityPage`, after the existing `useSharedState` call, compute the jurisdiction and the engine result, and read the active locale:

```typescript
  const locale = useLocale();
  const intlLocale = INTL_LOCALES[locale] ?? "en-CA";
  const [jurisdictionState] = useJurisdiction();
  const jurisdiction = getJurisdiction(jurisdictionState.jurId) ?? getJurisdiction("winnipeg")!;
  const result = affordability(jurisdiction, federal, form);
```

Replace the component's final `return (...)` block (the one ending the input-form grid from Task 11) so the two `Card` output panels render after the input grid, still inside the same `<main>`:

```typescript
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground">{t("subheading")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="income1">{t("income1")}</Label>
          <Input {...numberField("income1")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="income2">{t("income2")}</Label>
          <Input {...numberField("income2")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="otherIncome">{t("otherIncome")}</Label>
          <Input {...numberField("otherIncome")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="debts">{t("debts")}</Label>
          <Input {...numberField("debts")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">{t("price")}</Label>
          <Input {...numberField("price")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dpPct">{t("dpPct")}</Label>
          <Input {...numberField("dpPct")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amortYears">{t("amortYears")}</Label>
          <Input {...numberField("amortYears")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contractRate">{t("contractRate")}</Label>
          <Input {...numberField("contractRate")} step="0.01" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="comfortCeiling">{t("comfortCeiling")}</Label>
          <Input {...numberField("comfortCeiling")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="insuranceAnnual">{t("insuranceAnnual")}</Label>
          <Input {...numberField("insuranceAnnual")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="utilities">{t("utilities")}</Label>
          <Input {...numberField("utilities")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="condoFee">{t("condoFee")}</Label>
          <Input {...numberField("condoFee")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ptype">{t("ptype")}</Label>
          <Select
            value={form.ptype}
            onValueChange={(ptype) => updateForm({ ptype: ptype as AffordabilityFormState["ptype"] })}
          >
            <SelectTrigger id="ptype">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="house">{t("ptypeHouse")}</SelectItem>
              <SelectItem value="condo">{t("ptypeCondo")}</SelectItem>
              <SelectItem value="newbuild">{t("ptypeNewbuild")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Switch id="ftb" checked={form.ftb} onCheckedChange={(ftb) => updateForm({ ftb })} />
          <Label htmlFor="ftb">{t("ftb")}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("ceiling")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-3xl font-semibold tabular-nums">{money(result.ceiling, intlLocale, false)}</p>
            <p className={result.approvalPass ? "text-primary" : "text-destructive"}>
              {result.approvalPass ? t("approvalPass") : t("approvalFail")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("comfort")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-3xl font-semibold tabular-nums">{money(result.comfort, intlLocale, false)}</p>
            <p className={result.comfortPass ? "text-primary" : "text-destructive"}>
              {result.comfortPass ? t("comfortPass") : t("comfortFail")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("monthlyBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("pi")}</span>
            <span className="tabular-nums">{money(result.monthly.pi, intlLocale, false)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("propTax")}</span>
            <span className="tabular-nums">{money(result.monthly.propTax, intlLocale, false)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("insuranceAnnual")}</span>
            <span className="tabular-nums">{money(result.monthly.insurance, intlLocale, false)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("utilities")}</span>
            <span className="tabular-nums">{money(result.monthly.utilities, intlLocale, false)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("condoFee")}</span>
            <span className="tabular-nums">{money(result.monthly.condoFee, intlLocale, false)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("maintenance")}</span>
            <span className="tabular-nums">{money(result.monthly.maintenance, intlLocale, false)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
            <span>{t("total")}</span>
            <span className="tabular-nums">{money(result.monthly.total, intlLocale, false)}</span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run "src/app/[locale]/affordability/page.test.tsx"`
Expected: all 9 tests PASS (4 from Task 11's input-form suite, 5 new output-panel tests).

- [ ] **Step 7: Run the full gate**

Run: `scripts/check`
Expected: lint, typecheck, and changed tests all pass.

- [ ] **Step 8: Full-suite verification**

Run: `scripts/test`
Expected: the entire Vitest suite (every test file from Tasks 1–12) passes.

Run: `scripts/build`
Expected: `next build` completes without errors, confirming the app (not just its unit tests) compiles end to end.

- [ ] **Step 9: Manual smoke check**

Run: `npm run dev`, open `http://localhost:3000/affordability`. Expected: the form renders with defaults, changing the price or income updates both the lender-ceiling and comfort-budget cards immediately, switching jurisdiction in the header changes the numbers, and switching to `/fr` shows the French copy with `−340 $`-style negative formatting if any figure goes negative.

- [ ] **Step 10: Commit**

```bash
git add messages/en.json messages/fr.json src/components/ui/card.tsx \
  "src/app/[locale]/affordability/page.tsx" "src/app/[locale]/affordability/page.test.tsx"
git commit -m "feat: add Affordability page output panels (ceiling, comfort, monthly breakdown)"
```

---

## Summary

Twelve tasks: five build the domain layer (types/federal/jurisdictions/engine, Tasks 1–5), one builds the cross-page state mechanism (Task 6), three build reusable chrome (Tasks 7–9, including the jurisdiction context fix), and three build the two pages (Tasks 10–12). After Task 12, `scripts/test` and `scripts/build` are both green, and the app has a working Home → Affordability flow across all 14 jurisdictions in en/fr, with every jurisdiction figure still carrying the source's unverified/placeholder status per the spec.

