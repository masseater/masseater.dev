import { Website } from "@alchemy.run/cloudflare";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { Stack } from "alchemy";
import { Array as Arr, Effect, pipe } from "effect";

import { APP_NAME, requireAppPrefix } from "./src/shared/config/app-name.ts";
import { ZONE } from "./src/shared/config/cloudflare.ts";
import { ASSETS_DIR, PAGES } from "./src/shared/config/pages.ts";

const route = (path: string): Readonly<{ pattern: string; zoneName: string }> => ({
  pattern: `${ZONE}/${path}*`,
  zoneName: ZONE,
});

const site = Website.StaticSite("Labs", {
  command: "vp build",
  outdir: "dist",
  logpush: true,
  routes: pipe([...PAGES, ASSETS_DIR], Arr.map(route)),
  assets: { htmlHandling: "auto-trailing-slash" },
  dev: { command: "vp dev" },
});

export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    const { url } = yield* site;
    yield* requireAppPrefix;
    return { url };
  }),
);
