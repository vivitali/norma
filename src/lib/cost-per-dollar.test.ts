import { describe, expect, it } from "vitest";
import { affordability } from "@/domain/engine";
import { RULES } from "@/domain/rules";
import { ca } from "@/domain/rules/ca";
import { getJurisdiction } from "@/domain/jurisdictions";
import { resolveInputs } from "./resolve-inputs";
import { TOOL_DEFAULTS } from "./shared-inputs";
import { costPerDollarOperands } from "./affordability-view";

/**
 * The math column prints "budget ÷ monthly cost per $1 of price = comfortable price". That is
 * only a derivation if the printed operands reproduce the engine's own figure.
 */
describe("costPerDollarOperands", () => {
  const cases: [string, "ca" | "us", object][] = [
    ["toronto", "ca", {}],
    ["toronto", "ca", { dpPct: 5 }], // insured: the premium is in the borrowed share
    ["winnipeg", "ca", { dpPct: 25 }], // bill credit
    ["vancouver", "ca", { dpPct: 10, amortYears: 30 }],
    ["houston", "us", {}], // flat homestead credit, monthly compounding
  ];
  it.each(cases)("%s (%s) %j: budget ÷ cost per $1 reproduces comfort", (id, country, patch) => {
    const j = getJurisdiction(id)!;
    const F = RULES[country];
    const resolved = resolveInputs({ ...TOOL_DEFAULTS, ...patch }, j, F);
    const r = affordability(j, F, resolved);
    const ops = costPerDollarOperands(j, F, resolved, r);
    expect(r.budget / ops.comfort).toBeCloseTo(r.comfort, 4);
  });

  it("reproduces the lender ceiling where no bill credit applies", () => {
    const j = getJurisdiction("toronto")!;
    const F = RULES.ca;
    const resolved = resolveInputs({ ...TOOL_DEFAULTS, dpPct: 5 }, j, F);
    const r = affordability(j, F, resolved);
    const ops = costPerDollarOperands(j, F, resolved, r);
    const available = r.binding - ca.heatAllowance - resolved.condoFee * ca.condoFeeInclusion;
    expect(available / ops.lender).toBeCloseTo(r.ceiling, 4);
  });
});
