/**
 * Cloudflare Web Analytics. Cookieless and server-aggregated, which keeps
 * PRODUCT.md's "nothing is stored on a server" commitment intact and avoids the
 * consent banner a cookie-based tool would oblige under Quebec's Law 25 — on a
 * site whose French audience is substantially Quebec.
 *
 * Env-gated so the component is committable before the Cloudflare property
 * exists, and so local development and tests send no beacons.
 */
export function Analytics() {
  const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  if (!token) return null;

  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
