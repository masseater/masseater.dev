import { Workers, providers, state } from "@alchemy.run/cloudflare";
import { tracedProviders } from "@masseater.dev/cloudflare-account/traced-providers";
import { Stack } from "alchemy";
import { Build } from "alchemy/Command";
import { Effect } from "effect";

import { APP_NAME, requireAppPrefix } from "./app-name.ts";
import { BASE_PATH } from "./base-path.ts";
import { ZONE } from "./cloudflare.ts";

const CF_BEACON_TOKEN = "021b4961f3fd419297b186136a5a8a0a";

const web = Effect.gen(function* web() {
  const site = yield* Build("WebBuild", {
    command: "vp run build",
    env: { VITE_CF_BEACON_TOKEN: CF_BEACON_TOKEN },
    outdir: "dist/client",
    memo: false,
  });
  return yield* Workers.Worker("Web", {
    main: "./worker/web.worker.ts",
    logpush: true,
    routes: [{ pattern: `${ZONE}${BASE_PATH}*`, zoneName: ZONE }],
    assets: {
      directory: site.outdir,
      base: BASE_PATH,
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "404-page",
    },
  });
});

export default Stack(
  APP_NAME,
  {
    providers: tracedProviders(providers()),
    state: state(),
  },
  Effect.gen(function* stack() {
    const { url } = yield* web;
    yield* requireAppPrefix;
    return { url };
  }),
);
