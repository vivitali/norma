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
};

export default withNextIntl(nextConfig);
