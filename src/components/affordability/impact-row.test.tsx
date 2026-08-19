import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { affordability } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { getJurisdiction } from "@/domain/jurisdictions";
import { resolveInputs } from "@/lib/resolve-inputs";
import { AFFORDABILITY_DEFAULTS } from "@/lib/shared-inputs";
import { ImpactRow } from "./impact-row";
import type { AffordabilityFormState } from "@/lib/shared-inputs";

const winnipeg = getJurisdiction("winnipeg")!;

function render(over: Partial<AffordabilityFormState>) {
  const resolved = resolveInputs({ ...AFFORDABILITY_DEFAULTS, ...over }, winnipeg, federal);
  const result = affordability(winnipeg, federal, resolved);
  renderWithIntl(<ImpactRow result={result} debts={resolved.debts} />);
  return result;
}

describe("ImpactRow", () => {
  it("prices $100 of obligation when there really are no debts", () => {
    render({});
    expect(screen.getByText(/No monthly debts entered/)).toBeInTheDocument();
  });

  it("prices the debt when total debt service is the binding constraint", () => {
    const result = render({ car: 2000 });
    expect(result.tdsBinds).toBe(true);
    expect(screen.getByText(/reduces what a lender will approve/)).toBeInTheDocument();
  });

  it("does not claim no debts were entered when debts simply cost nothing", () => {
    // debtCapacity is legitimately 0 whenever housing cost binds first. Reading
    // that as "no monthly debts entered" tells a user with $50 in the car field
    // directly above that they entered nothing.
    const result = render({ income1: 300000, car: 50 });
    expect(result.tdsBinds).toBe(false);
    expect(result.debtCapacity).toBe(0);
    expect(screen.queryByText(/No monthly debts entered/)).not.toBeInTheDocument();
    expect(screen.getByText(/Housing cost is your binding constraint/)).toBeInTheDocument();
  });
});
