import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Nothing is disallowed. The preview hostnames that would otherwise duplicate
 * this content are handled by turning off workers.dev in wrangler.jsonc, not by
 * a rule here — a rule would be served from the preview host too, and would
 * then be wrong for production.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
