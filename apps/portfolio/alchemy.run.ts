import { Stack, Stage } from "alchemy";
import { Website, providers, state } from "alchemy/Cloudflare";
import { Effect } from "effect";

const DOMAIN = "masseater.dev";
const PRODUCTION_STAGE = "prod";

const web = Effect.gen(function* web() {
  const production = (yield* Stage) === PRODUCTION_STAGE;
  return yield* Website.StaticSite("Web", {
    ...(production && { domain: { name: DOMAIN, redirects: [`www.${DOMAIN}`] } }),
    command: "vp build",
    outdir: "dist/client",
    assets: { htmlHandling: "auto-trailing-slash", notFoundHandling: "404-page" },
    dev: { command: "vp dev" },
  });
});

export default Stack(
  "masseater-dev",
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { url } = yield* web;
    return { url };
  }),
);
