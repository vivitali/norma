import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { localesForCountry } from "@/i18n/countries";
import { LOCALES } from "@/lib/locales";
import { LocaleSwitcher } from "./locale-switcher";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en-CA" }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace }),
}));

afterEach(() => {
  cleanup();
  replace.mockClear();
});

describe("LocaleSwitcher", () => {
  it("shows the active locale on the trigger", () => {
    renderWithIntl(<LocaleSwitcher />);
    expect(screen.getByRole("combobox", { name: "Change language" })).toHaveTextContent("EN");
  });

  it("offers every locale of the CURRENT COUNTRY, and nothing else", async () => {
    // Read off localesForCountry(activeLocale) rather than the full registry: the
    // active locale here is "en-CA" (mocked useParams above), so this must offer only
    // Canada's four locales — not the US's en-US/es-US too, which would be a language
    // the reader cannot actually reach the current page in.
    const user = userEvent.setup();
    renderWithIntl(<LocaleSwitcher />);
    await user.click(screen.getByRole("combobox"));
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(
      localesForCountry("en-CA").map((locale) => LOCALES[locale].label),
    );
  });

  it("labels Ukrainian in Cyrillic, because 'UK' reads as a country", () => {
    // The one label that is not its own ISO code, and the reason is legibility to the
    // reader it is for: every other entry on the list is a two-letter Latin code, so
    // "UK" beside "EN" and "FR" reads as the United Kingdom.
    expect(LOCALES["uk-CA"].label).toBe("УКР");
  });

  it("marks the active locale as selected", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LocaleSwitcher />);
    await user.click(screen.getByRole("combobox"));
    const list = screen.getByRole("listbox");
    expect(within(list).getByRole("option", { selected: true })).toHaveTextContent("EN");
  });

  it("navigates to the same path in the chosen locale", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LocaleSwitcher />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "FR" }));
    expect(replace).toHaveBeenCalledWith("/", { locale: "fr-CA" });
  });
});
