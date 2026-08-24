import { writeFileSync } from "node:fs";
// next has no "./og" entry in its export map, so this resolves the shipped
// module by path. Verified present at next 16.3.1.
import { ImageResponse } from "next/dist/server/og/image-response.js";

/**
 * Renders the social card once, at author time, into public/og.png.
 *
 * Deliberately NOT an opengraph-image route: a route renders per request on the
 * Worker, under a 10ms CPU cap, for an image that never changes — which is
 * exactly what scripts/verify-prerender exists to prevent.
 *
 * Re-run with: node scripts/generate-og.mjs
 */
const image = new ImageResponse(
  {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: "#0b0b0c",
        color: "#fafafa",
        fontSize: 64,
        fontWeight: 600,
      },
      children: [
        { type: "div", props: { children: "AffordMath" } },
        {
          type: "div",
          props: {
            style: {
              fontSize: 34,
              marginTop: 24,
              color: "#a1a1aa",
              lineHeight: 1.35,
            },
            children: "What a lender would approve, and what you can actually carry.",
          },
        },
      ],
    },
  },
  { width: 1200, height: 630 },
);

writeFileSync("public/og.png", Buffer.from(await image.arrayBuffer()));
console.log("wrote public/og.png");
