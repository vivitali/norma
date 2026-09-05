import { vi } from "vitest";
import type { ReactNode } from "react";

/**
 * next-intl's navigation helpers pull in `next/navigation`, which vitest cannot
 * resolve outside a Next build. Every test that renders a component containing a
 * `Link` needs both mocks, so they live here rather than being retyped per file.
 *
 * Use with the async form, because vi.mock's factory is hoisted above imports:
 *
 *   vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
 *   vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);
 */
export const nextNavigation = {
  useParams: () => ({ locale: "en-CA" }),
  usePathname: () => "/",
};

export const intlNavigation = {
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  /**
   * Accepts both href forms. Typed `pathnames` makes `href` a union of route keys, so a
   * link carrying a hash has to pass `{ pathname, hash }` — see src/components/provenance.tsx.
   * The double formats it the way next-intl would for the default locale; it does NOT
   * localize the slug, which is why assertions here use the English key.
   */
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string | { pathname: string; hash?: string };
    children: ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : `${href.pathname}${href.hash ?? ""}`} {...props}>
      {children}
    </a>
  ),
};
