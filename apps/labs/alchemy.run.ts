import { Website, providers, state } from "@alchemy.run/cloudflare";
import { withWorkersTracing } from "@r_masseater/workers-tracing/alchemy";
import { Stack } from "alchemy";
import { Array as Arr, Effect, pipe } from "effect";

import { APP_NAME, requireAppPrefix } from "./app-name.ts";
import { ZONE } from "./cloudflare.ts";
import { ASSETS_DIR, PAGES } from "./pages.ts";

const route = (path: string): Readonly<{ pattern: string; zoneName: string }> => ({
  pattern: `${ZONE}/${path}*`,
  zoneName: ZONE,
});

const site = Website.StaticSite("Labs", {
  command: "vp run build",
  outdir: "dist",
  logpush: true,
  routes: pipe([...PAGES, ASSETS_DIR], Arr.map(route)),
  assets: { htmlHandling: "auto-trailing-slash" },
  dev: { command: "vp dev" },
});

export default Stack(
  APP_NAME,
  { providers: withWorkersTracing(providers()), state: state() },
  Effect.gen(function* stack() {
    const { url } = yield* site;
    yield* requireAppPrefix;
    return { url };
  }),
);
