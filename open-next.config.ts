import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// OpenNext serves EVERY prerendered page through the incremental cache — not just
// revalidating ones. With no cache configured, the prerendered HTML is built but
// never reachable and every route 404s (verified on a live deploy).
//
// staticAssetsIncrementalCache serves that HTML from the same Workers static-assets
// binding, which is exactly right here: norma has no ISR and no revalidation, so
// there is nothing to write back. It also needs no R2 bucket or KV namespace. The
// HTML read is a free static-asset fetch, but the request is still a Worker
// invocation: the cache lives under `cdn-cgi/_next_cache/`, which only the Worker
// can read. Prerendering makes each invocation cheap, not free — see CLAUDE.md.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
