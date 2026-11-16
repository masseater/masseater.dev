import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { startStaticSite } from "@masseater.dev/start-site/site";
import { Stack } from "alchemy";
import { Effect } from "effect";

import { APP_NAME, requireAppPrefix } from "./src/shared/config/app-name.ts";
import { BASE_PATH } from "./src/shared/config/site-base-path.ts";

export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    const { url } = yield* startStaticSite(BASE_PATH);
    yield* requireAppPrefix;
    return { url };
  }),
);
