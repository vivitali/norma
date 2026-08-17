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
