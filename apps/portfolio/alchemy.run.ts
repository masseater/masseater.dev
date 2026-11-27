import { Website, Workers } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { accountResources } from "@masseater.dev/cloudflare-account/account";
import { edgeGuard } from "@masseater.dev/cloudflare-account/edge-guard";
import { japanDatabase } from "@masseater.dev/cloudflare-account/japan-database";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { makeRandom, Stack, Stage } from "alchemy";
import type { CompiledStack } from "alchemy";
import { Effect, Hash, Option } from "effect";
import type { ConfigError } from "effect/Config";

import { APP_NAME, requireAppPrefix } from "./src/app/app-name.ts";
import { site } from "./src/shared/config/site.ts";

const DOMAIN = new URL(site.url).hostname;
const PRODUCTION_STAGE = "prod";
const CF_BEACON_TOKEN = "021b4961f3fd419297b186136a5a8a0a";

const OWNED_ZONE = Option.some(DOMAIN);

const STAR_WRITES_PER_MINUTE = 20;

const STARS_LIMITER = Workers.RateLimit("STARS_LIMITER", {
  namespaceId: Math.abs(Hash.string(`${APP_NAME}-stars`)),
  simple: { limit: STAR_WRITES_PER_MINUTE, period: 60 },
});

const web = Effect.gen(function* web() {
  const production = (yield* Stage) === PRODUCTION_STAGE;
  const STARS = yield* japanDatabase("Stars", { migrations: "./drizzle", name: Option.none() });
  const VISITOR_SALT = yield* makeRandom("VisitorSalt");
  return yield* Website.StaticSite("Web", {
    limits: { cpuMs: 200 },
    ...(production && { domain: { name: DOMAIN, redirects: [`www.${DOMAIN}`] } }),
    command: "vp run build",
    outdir: "dist/client",
    main: "./src/app/site.ts",
    logpush: true,
    env: { STARS, STARS_LIMITER, VISITOR_SALT, VITE_CF_BEACON_TOKEN: CF_BEACON_TOKEN },
    assets: {
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "404-page",
      runWorkerFirst: ["/*", "!/assets/*"],
    },
    dev: { command: "vp dev" },
  });
});

export type WebEnv = InferEnv<typeof web>;

const stack: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    const { url } = yield* web;
    if ((yield* Stage) === PRODUCTION_STAGE) {
      yield* Option.match(OWNED_ZONE, {
        onNone: () => Effect.void,
        onSome: (domain) => edgeGuard({ appName: APP_NAME, domain }),
      });
      yield* accountResources(APP_NAME);
    }
    yield* requireAppPrefix;
    return { url };
  }),
);

export default stack;
