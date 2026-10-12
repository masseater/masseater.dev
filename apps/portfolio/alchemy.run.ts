import { Stack, Stage } from "alchemy";
import { Website, Workers, providers, state } from "alchemy/Cloudflare";
import type { InferEnv } from "alchemy/Cloudflare";
import { Config, Effect, Option, Schema } from "effect";

import { APP_NAME, CI_TELEMETRY_AUDIENCE, requireAppPrefix } from "./app-name.ts";
import { edgeGuard } from "./edge-guard.ts";
import { logArchive } from "./log-archive.ts";
import { site } from "./src/shared/config/site.ts";

const DOMAIN = new URL(site.url).hostname;
const PRODUCTION_STAGE = "prod";
const COMPATIBILITY = { date: "2026-08-25" } as const;

const OWNED_ZONE = Option.some(DOMAIN);

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

const ciTelemetry = Effect.gen(function* ciTelemetry() {
  const GITHUB_REPOSITORY = yield* Config.schema(Schema.String, "GITHUB_REPOSITORY").pipe(
    Config.withDefault(""),
  );
  return yield* Workers.Worker("CiTelemetry", {
    name: CI_TELEMETRY_AUDIENCE,
    main: "./ci-telemetry.worker.ts",
    compatibility: COMPATIBILITY,
    logpush: true,
    env: { GITHUB_REPOSITORY },
    observability: {
      enabled: true,
      logs: { enabled: true, invocationLogs: false, persist: true },
    },
  });
});

type CiTelemetryEnv = InferEnv<typeof ciTelemetry>;

export type { CiTelemetryEnv };
export default Stack(
  APP_NAME,
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { url } = yield* web;
    if ((yield* Stage) === PRODUCTION_STAGE) {
      yield* Option.match(OWNED_ZONE, {
        onNone: () => Effect.void,
        onSome: (zone) => edgeGuard(zone, COMPATIBILITY),
      });
      yield* logArchive;
    }
    yield* ciTelemetry;
    yield* requireAppPrefix;
    return { url };
  }),
);
