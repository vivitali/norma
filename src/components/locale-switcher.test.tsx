/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { LocaleSwitcher } from "./locale-switcher";

// Mock next/navigation's useParams
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
}));

// Mock @/i18n/navigation
vi.mock("@/i18n/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

import { useParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";

afterEach(() => cleanup());

describe("LocaleSwitcher", () => {
  it("renders EN and FR locale buttons", () => {
    const mockRouter = { replace: vi.fn() };
    const mockParams = { locale: "en" };

    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
    vi.mocked(useParams).mockReturnValue(mockParams as any);
    vi.mocked(usePathname).mockReturnValue("/");

    renderWithIntl(<LocaleSwitcher />);

    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FR" })).toBeInTheDocument();
  });

  it("navigates to EN locale when EN button is clicked", async () => {
    const user = userEvent.setup();
    const mockRouter = { replace: vi.fn() };
    const mockParams = { locale: "fr" };

    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
    vi.mocked(useParams).mockReturnValue(mockParams as any);
    vi.mocked(usePathname).mockReturnValue("/fr");

    renderWithIntl(<LocaleSwitcher />);

    const enButton = screen.getByRole("button", { name: "EN" });
    await user.click(enButton);

    expect(mockRouter.replace).toHaveBeenCalledWith("/en", { locale: "en" });
  });

  it("navigates to FR locale when FR button is clicked", async () => {
    const user = userEvent.setup();
    const mockRouter = { replace: vi.fn() };
    const mockParams = { locale: "en" };

    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
    vi.mocked(useParams).mockReturnValue(mockParams as any);
    vi.mocked(usePathname).mockReturnValue("/");

    renderWithIntl(<LocaleSwitcher />);

    const frButton = screen.getByRole("button", { name: "FR" });
    await user.click(frButton);

    expect(mockRouter.replace).toHaveBeenCalledWith("/fr", { locale: "fr" });
  });
});
