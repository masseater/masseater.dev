import { Website } from "@alchemy.run/cloudflare";
import { Effect } from "effect";

const ZONE = "masseater.dev";
const CF_BEACON_TOKEN = "021b4961f3fd419297b186136a5a8a0a";
const COMPATIBILITY = { date: "2026-08-25" } as const;

const startStaticSite = Effect.fn("startStaticSite")(function* startStaticSite(basePath: string) {
  return yield* Website.StaticSite("Web", {
    env: { VITE_CF_BEACON_TOKEN: CF_BEACON_TOKEN },
    compatibility: COMPATIBILITY,
    logpush: true,
    routes: [{ pattern: `${ZONE}${basePath}*`, zoneName: ZONE }],
    command: "vp run build",
    outdir: "dist/client",
    assets: { htmlHandling: "auto-trailing-slash" },
    dev: { command: "vp dev" },
  });
});

export { startStaticSite };
