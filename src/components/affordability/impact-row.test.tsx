import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { affordability } from "@/domain/engine";
import { ca } from "@/domain/rules/ca";
import { getJurisdiction } from "@/domain/jurisdictions";
import { resolveInputs } from "@/lib/resolve-inputs";
import { TOOL_DEFAULTS } from "@/lib/shared-inputs";
import { ImpactRow } from "./impact-row";
import type { ToolFormState } from "@/lib/shared-inputs";

const winnipeg = getJurisdiction("winnipeg")!;

function render(over: Partial<ToolFormState>) {
  const resolved = resolveInputs({ ...TOOL_DEFAULTS, ...over }, winnipeg, ca);
  const result = affordability(winnipeg, ca, resolved);
  renderWithIntl(<ImpactRow result={result} debts={resolved.debts} />);
  return result;
}

describe("ImpactRow", () => {
  it("prices $100 of obligation only where that $100 would actually cost something", () => {
    // Reachable only on a very low income. GDS binds until debts exceed the
    // TDS/GDS spread (income x 5% / 12), so for most debt-free households the
    // first $100 of obligation genuinely costs nothing and this branch is not
    // the one that renders.
    const result = render({ income1: 20000 });
    expect(result.capacityPer100).toBeGreaterThan(0);
    expect(screen.getByText(/^No monthly debts entered/)).toBeInTheDocument();
  });

  it("does not quote a $0 price per $100 when housing cost binds", () => {
    // capacityPer100 bottoms out at zero whenever GDS binds. "Every $100 would
    // cost you roughly $0" is true and reads as broken; say why it is zero.
    const result = render({});
    expect(result.capacityPer100).toBe(0);
    expect(screen.queryByText(/roughly/)).not.toBeInTheDocument();
    expect(screen.getByText(/the first \$100 would cost you nothing/)).toBeInTheDocument();
  });

  it("prices the debt when total debt service is the binding constraint", () => {
    const result = render({ car: 2000 });
    expect(result.tdsBinds).toBe(true);
    expect(screen.getByText(/reduces what a lender will approve/)).toBeInTheDocument();
  });

  it("claims nothing at all when nothing is approvable", () => {
    // debtCapacity is also 0 when the ceiling is 0 -- no qualifying income at
    // all. "Your debts cost you nothing" in pass tokens, beside a declined
    // verdict and a $0 ceiling, is the opposite of the truth.
    const result = render({ income1: 0, car: 400 });
    expect(result.ceiling).toBe(0);
    expect(result.debtCapacity).toBe(0);
    expect(screen.queryByText(/Housing cost is your binding constraint/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No monthly debts entered/)).not.toBeInTheDocument();
    expect(screen.getByText(/Total debt service is usually the binding constraint/)).toBeInTheDocument();
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
