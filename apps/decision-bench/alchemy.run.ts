import { Workers, providers, state } from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";
import { Build } from "alchemy/Command";
import { Effect } from "effect";

import { APP_NAME, requireAppPrefix } from "./app-name.ts";
import { BASE_PATH } from "./base-path.ts";

const ZONE = "masseater.dev";

const COMPATIBILITY = { date: "2026-08-25" } as const;
const CF_BEACON_TOKEN = "021b4961f3fd419297b186136a5a8a0a";

const site = Effect.gen(function* site() {
  const build = yield* Build("WebBuild", {
    command: "vp run build",
    env: { VITE_CF_BEACON_TOKEN: CF_BEACON_TOKEN },
    outdir: "dist/client",
    memo: false,
  });
  return yield* Workers.Worker("Web", {
    compatibility: COMPATIBILITY,
    logpush: true,
    routes: [{ pattern: `${ZONE}${BASE_PATH}*`, zoneName: ZONE }],
    assets: {
      directory: build.outdir,
      htmlHandling: "auto-trailing-slash",
    },
  });
});

export default Stack(
  APP_NAME,
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { url } = yield* site;
    yield* requireAppPrefix;
    return { url };
  }),
);
