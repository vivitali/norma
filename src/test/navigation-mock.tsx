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
  useParams: () => ({ locale: "en" }),
  usePathname: () => "/",
};

export const intlNavigation = {
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
};
