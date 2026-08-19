import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incrementalCache override: norma has no ISR or revalidation — every page is
// prerendered at build time (enforced by scripts/assert-prerendered.mjs), so there
// is no cache for R2 to back.
export default defineCloudflareConfig({});
