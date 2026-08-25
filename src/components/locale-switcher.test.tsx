import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { routing } from "@/i18n/routing";
import { LOCALES } from "@/lib/locales";
import { LocaleSwitcher } from "./locale-switcher";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
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

  it("offers every configured locale, and nothing else", async () => {
    // Read off `routing.locales` rather than listed here: the whole point of the
    // rebuild is that a fifth locale needs no edit to this component or this test.
    const user = userEvent.setup();
    renderWithIntl(<LocaleSwitcher />);
    await user.click(screen.getByRole("combobox"));
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(
      routing.locales.map((locale) => LOCALES[locale].label),
    );
  });

  it("labels Ukrainian in Cyrillic, because 'UK' reads as a country", () => {
    // The one label that is not its own ISO code, and the reason is legibility to the
    // reader it is for: every other entry on the list is a two-letter Latin code, so
    // "UK" beside "EN" and "FR" reads as the United Kingdom.
    expect(LOCALES.uk.label).toBe("УКР");
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
    expect(replace).toHaveBeenCalledWith("/", { locale: "fr" });
  });
});
