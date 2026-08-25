import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { ThemeProvider } from "./theme-provider";
import { AppHeader } from "./app-header";

import enMessages from "../../messages/en.json";

/** The trigger label, from the catalogue — not a literal that a rename breaks. */
const TRIGGER = enMessages.Nav.menu;

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

function renderHeader() {
  return renderWithIntl(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <JurisdictionProvider>
        <AppHeader />
      </JurisdictionProvider>
    </ThemeProvider>,
  );
}

describe("AppHeader", () => {
  afterEach(() => cleanup());

  it("renders the brand link, jurisdiction picker, locale switcher, and theme toggle together", async () => {
    renderHeader();
    expect(screen.getByRole("link", { name: "AffordMath" })).toHaveAttribute("href", "/");
    expect(await screen.findByRole("combobox", { name: "Change location" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Change language" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Theme" })).toBeInTheDocument();
  });

  it("keeps the settings in the header rather than inside the menu, at every width", async () => {
    // Issue #9's constraint, stated as behaviour: the jurisdiction picker, locale switcher and
    // theme toggle are settings, not destinations, so they live outside the nav panel and stay
    // present whether it is open or closed. The single-row/two-row split that makes that fit at
    // 320px is CSS, which jsdom cannot measure -- this pins the DOM containment it depends on.
    renderHeader();
    const nav = document.querySelector("nav")!;
    const picker = await screen.findByRole("combobox", { name: "Change location" });
    expect(nav.contains(picker)).toBe(false);
    // Both settings are selects since the locale switcher stopped being a button row -- four
    // locales do not fit a 44px-per-option segmented control beside the picker at 320px.
    expect(nav.contains(screen.getByRole("combobox", { name: "Change language" }))).toBe(false);

    await userEvent.setup().click(screen.getByRole("button", { name: TRIGGER }));
    expect(screen.getByRole("combobox", { name: "Change location" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Change language" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Theme" })).toBeInTheDocument();
  });
});
