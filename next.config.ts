import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { redirects } from "./src/lib/redirects";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The one-time 301 from the pre-/ca/ URL shape (`/en/affordability`) to the
  // country-qualified one (`/ca/en/affordability`). next.config's own `redirects()`
  // runs before middleware and @opennextjs/cloudflare honours it; see
  // src/lib/redirects.ts and redirects.test.ts for the rule shapes and their coverage.
  redirects,
  // A styled, localised 404 for URLs that match no route at all (src/app/global-not-found.tsx).
  // Without it Next answers /ca/en/nope with its own unstyled English page: the [locale] layout
  // is the root layout and sits under a dynamic segment, so no app/not-found.tsx can compose one.
  // Experimental in Next 16 — verify on a deployed preview, not just the build (CLAUDE.md).
  experimental: { globalNotFound: true },
};

export default withNextIntl(nextConfig);
