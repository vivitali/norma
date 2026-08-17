import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { ThemeProvider } from "./theme-provider";
import { AppHeader } from "./app-header";

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => cleanup());

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
