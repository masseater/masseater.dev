import { D1, Website, Workers, providers, state } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { edgeGuard } from "@masseater.dev/cloudflare-account/edge-guard";
import { logArchive } from "@masseater.dev/cloudflare-account/log-archive";
import { webAnalyticsReader } from "@masseater.dev/cloudflare-account/web-analytics-reader";
import { withWorkersTracing } from "@r_masseater/workers-tracing/alchemy";
import { Stack, Stage, makeRandom } from "alchemy";
import type { CompiledStack } from "alchemy";
import { Effect, Option } from "effect";
import type { ConfigError } from "effect/Config";

import {
  APP_NAME,
  CI_TELEMETRY_AUDIENCE,
  TRACE_DESTINATION,
  requireAppPrefix,
} from "./app-name.ts";
import { site } from "./src/shared/config/site.ts";

const DOMAIN = new URL(site.url).hostname;
const PRODUCTION_STAGE = "prod";
const CF_BEACON_TOKEN = "021b4961f3fd419297b186136a5a8a0a";

const OWNED_ZONE = Option.some(DOMAIN);

const web = Effect.gen(function* web() {
  const production = (yield* Stage) === PRODUCTION_STAGE;
  const STARS = yield* D1.Database("Stars", { migrations: "./drizzle" });
  const VISITOR_SALT = yield* makeRandom("VisitorSalt");
  return yield* Website.StaticSite("Web", {
    ...(production && { domain: { name: DOMAIN, redirects: [`www.${DOMAIN}`] } }),
    command: "vp run build",
    outdir: "dist/client",
    main: "./worker/site.worker.ts",
    logpush: true,
    env: { STARS, VISITOR_SALT, VITE_CF_BEACON_TOKEN: CF_BEACON_TOKEN },
    assets: {
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "404-page",
      runWorkerFirst: ["/*", "!/assets/*"],
    },
    dev: { command: "vp dev" },
  });
});

const ciTelemetry = Workers.Worker("CiTelemetry", {
  name: CI_TELEMETRY_AUDIENCE,
  main: "./worker/ci-telemetry.worker.ts",
  logpush: true,
});

type WebEnv = InferEnv<typeof web>;

const stack: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  APP_NAME,
  {
    providers: withWorkersTracing({ destinations: [TRACE_DESTINATION] })(providers()),
    state: state(),
  },
  Effect.gen(function* stack() {
    const { url } = yield* web;
    if ((yield* Stage) === PRODUCTION_STAGE) {
      yield* Option.match(OWNED_ZONE, {
        onNone: () => Effect.void,
        onSome: (domain) => edgeGuard({ appName: APP_NAME, domain }),
      });
      yield* logArchive(APP_NAME);
      yield* webAnalyticsReader(APP_NAME);
    }
    yield* ciTelemetry;
    yield* requireAppPrefix;
    return { url };
  }),
);

export type { WebEnv };
export default stack;
