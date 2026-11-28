import { Website } from "@alchemy.run/cloudflare";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { Stack } from "alchemy";
import { Effect } from "effect";

import { APP_NAME, HOST, OUTDIR, requireAppPrefix } from "./src/shared/config/index.ts";

const site = Website.StaticSite("Site", {
  command: "node bin/write-site.ts",
  outdir: OUTDIR,
  logpush: true,
  domain: HOST,
  workersDev: false,
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
