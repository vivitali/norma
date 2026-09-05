import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/lib/locales";
import { CountrySwitcher } from "./country-switcher";

const replace = vi.fn();
let mockLocale: Locale = "en-CA";
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: mockLocale }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace }),
}));

afterEach(() => {
  cleanup();
  replace.mockClear();
  mockLocale = "en-CA";
  mockPathname = "/";
});

describe("CountrySwitcher", () => {
  it("renders both entries", async () => {
    const user = userEvent.setup();
    renderWithIntl(<CountrySwitcher />);
    await user.click(screen.getByRole("combobox", { name: "Change country" }));
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Canada", "United States"]);
  });

  it("shows the active country on the trigger", () => {
    renderWithIntl(<CountrySwitcher />);
    expect(screen.getByRole("combobox", { name: "Change country" })).toHaveTextContent("Canada");
  });

  it("marks the active country as selected", async () => {
    const user = userEvent.setup();
    renderWithIntl(<CountrySwitcher />);
    await user.click(screen.getByRole("combobox"));
    const list = screen.getByRole("listbox");
    expect(within(list).getByRole("option", { selected: true })).toHaveTextContent("Canada");
  });

  it("from /ca/fr/affordability, the US link carries the route but drops French — en-US, not fr-US", async () => {
    mockLocale = "fr-CA";
    mockPathname = "/affordability";
    const user = userEvent.setup();
    renderWithIntl(<CountrySwitcher />, { locale: "fr-CA" });
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "États-Unis" }));
    expect(replace).toHaveBeenCalledWith("/affordability", { locale: "en-US" });
  });

  it("from /ca/en/rrsp-hbp, the US link lands on the US home — the route has no US page", async () => {
    mockLocale = "en-CA";
    mockPathname = "/rrsp-hbp";
    const user = userEvent.setup();
    renderWithIntl(<CountrySwitcher />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "United States" }));
    expect(replace).toHaveBeenCalledWith("/", { locale: "en-US" });
  });

  it("keeps the current language when the destination country ships it", async () => {
    mockLocale = "en-US";
    mockPathname = "/affordability";
    const user = userEvent.setup();
    renderWithIntl(<CountrySwitcher />, { locale: "en-US" });
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Canada" }));
    expect(replace).toHaveBeenCalledWith("/affordability", { locale: "en-CA" });
  });

  it("carries the data-slot the header's own 320px rule targets", () => {
    // jsdom has no layout engine (see CLAUDE.md, the segmented-group note): the real check is
    // a browser at 320px. AppHeader applies `min-w-0` at 320px via
    // `[&_[data-slot=select-trigger]]:min-w-0` on the settings row -- a CSS rule reused
    // rather than restated, so this control gives way exactly where LocaleSwitcher's
    // trigger already does, as long as it renders the SAME shadcn Select the rule targets.
    renderWithIntl(<CountrySwitcher />);
    expect(screen.getByRole("combobox", { name: "Change country" })).toHaveAttribute(
      "data-slot",
      "select-trigger",
    );
  });
});
