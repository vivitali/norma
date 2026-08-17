import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { LocaleSwitcher } from "./locale-switcher";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace }),
}));

afterEach(() => cleanup());

describe("LocaleSwitcher", () => {
  it("renders a button for every configured locale", () => {
    renderWithIntl(<LocaleSwitcher />);
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FR" })).toBeInTheDocument();
  });

  it("marks the active locale as current", () => {
    renderWithIntl(<LocaleSwitcher />);
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "FR" })).toHaveAttribute("aria-current", "false");
  });

  it("navigates to the same path in the other locale on click", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LocaleSwitcher />);
    await user.click(screen.getByRole("button", { name: "FR" }));
    expect(replace).toHaveBeenCalledWith("/", { locale: "fr" });
  });
});
