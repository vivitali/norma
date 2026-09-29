import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { CATALOGUES } from "@/test/catalogues";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { jurisdictions } from "@/domain/jurisdictions";
import { STORE_KEY_V2 } from "@/lib/storage";
import { AREA_NAMES, TaxAreaPicker } from "./tax-area-picker";

function renderPicker(locale?: "en-CA" | "fr-CA") {
  return renderWithIntl(
    <JurisdictionProvider>
      <TaxAreaPicker />
    </JurisdictionProvider>,
    { locale },
  );
}

beforeEach(() => window.localStorage.clear());

describe("TaxAreaPicker", () => {
  it("names every area any record carries, in every catalogue", () => {
    const ids = jurisdictions.flatMap((j) => j.propTax.areas?.list.map((a) => a.id) ?? []);
    expect(ids.length).toBeGreaterThan(0);
    for (const [lang, catalogue] of Object.entries(CATALOGUES)) {
      const names = (catalogue.Inputs as unknown as Record<string, Record<string, string>>)[AREA_NAMES];
      for (const id of ids) expect(names?.[id], `${lang}: ${id}`).toBeTruthy();
      // And nothing stale: every named id is an area some record still carries.
      expect(Object.keys(names).sort(), lang).toEqual([...ids].sort());
    }
  });

  it("shows Winnipeg's default division, the range of rates and the tax credit", async () => {
    renderPicker();
    expect(await screen.findByRole("combobox", { name: "School division" })).toHaveTextContent("Winnipeg");
    // 25.223 and 29.530 combined mills at the 45% portion.
    expect(screen.getByText(/from 1\.14% to 1\.33% of the price/)).toBeInTheDocument();
    expect(screen.getByText(/Homeowners Affordability Tax Credit — up to \$1,600/)).toBeInTheDocument();
  });

  it("stores a chosen division, and stores the default as null", async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(await screen.findByRole("combobox", { name: "School division" }));
    await user.click(await screen.findByRole("option", { name: "Pembina Trails" }));
    expect(JSON.parse(window.localStorage.getItem(STORE_KEY_V2)!).taxArea).toBe("pembina-trails");
    await user.click(screen.getByRole("combobox", { name: "School division" }));
    await user.click(await screen.findByRole("option", { name: "Winnipeg" }));
    expect(JSON.parse(window.localStorage.getItem(STORE_KEY_V2)!).taxArea).toBeNull();
  });

  it("renders nothing where the record has no divisions", () => {
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ jurId: "toronto" }));
    const { container } = renderPicker();
    expect(container).toBeEmptyDOMElement();
  });

  it("speaks French", async () => {
    renderPicker("fr-CA");
    expect(await screen.findByRole("combobox", { name: "Division scolaire" })).toBeInTheDocument();
  });
});
