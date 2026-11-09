import { Workers, providers, state } from "@alchemy.run/cloudflare";
import { tracedProviders } from "@masseater.dev/cloudflare-account/traced-providers";
import { DATA_DIR, DATA_WORKER } from "@masseater.dev/nimado";
import { Stack } from "alchemy";
import { Array as Arr, Effect, pipe } from "effect";
import { SECURITY_HEADERS } from "security-headers";
import { headerLines } from "security-headers/static";

import { APP_NAME, requireAppPrefix } from "./app-name.ts";
import { BASE_PATH } from "./base-path.ts";
import { ZONE } from "./cloudflare.ts";

const PUBLISHED_DIR = "./published";
const DATA_CACHE_CONTROL = "public, max-age=600";

const DATA_HEADERS = pipe(
  [
    `${BASE_PATH}/${DATA_DIR}/*`,
    ...headerLines(SECURITY_HEADERS),
    `  Cache-Control: ${DATA_CACHE_CONTROL}`,
    "",
  ],
  Arr.join("\n"),
);

export default Stack(
  APP_NAME,
  {
    providers: tracedProviders(providers()),
    state: state(),
  },
  Effect.gen(function* stack() {
    const { url } = yield* Workers.Worker("Data", {
      name: DATA_WORKER,
      logpush: true,
      routes: [{ pattern: `${ZONE}${BASE_PATH}/${DATA_DIR}/*`, zoneName: ZONE }],
      assets: {
        directory: PUBLISHED_DIR,
        base: BASE_PATH,
        headers: DATA_HEADERS,
      },
    });
    yield* requireAppPrefix;
    return { url };
  }),
);
