import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { ThemeProvider } from "./theme-provider";
import { AppHeader } from "./app-header";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

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
