import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalcLedger } from "./calc-trace";

describe("CalcLedger", () => {
  it("is a keyboard-reachable, named scroll region", () => {
    render(
      <CalcLedger
        caption="Year by year"
        rowHeader="year"
        columns={[
          { key: "year", label: "Year" },
          { key: "balance", label: "Balance", numeric: true },
        ]}
        rows={[{ key: 1, cells: { year: "1", balance: "$10" } }]}
      />,
    );
    const region = screen.getByRole("region", { name: "Year by year" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.className).toContain("overflow-x-auto");
    expect(region).toContainElement(screen.getByRole("table"));
  });
});
