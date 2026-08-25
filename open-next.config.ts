import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// OpenNext serves EVERY prerendered page through the incremental cache — not just
// revalidating ones. With no cache configured, the prerendered HTML is built but
// never reachable and every route 404s (verified on a live deploy).
//
// staticAssetsIncrementalCache serves that HTML from the same Workers static-assets
// binding, which is exactly right here: norma has no ISR and no revalidation, so
// there is nothing to write back. It also needs no R2 bucket or KV namespace, so
// prerendered pages stay free static-asset reads.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
