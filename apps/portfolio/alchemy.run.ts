import { Stack, Stage } from "alchemy";
import { adopt } from "alchemy/AdoptPolicy";
import {
  AnalyticsEngine,
  Ruleset,
  Website,
  Workers,
  Zone,
  providers,
  state,
} from "alchemy/Cloudflare";
import type { InferEnv } from "alchemy/Cloudflare";
import { Config, Effect, Schema } from "effect";

import { APP_NAME, CI_TELEMETRY_AUDIENCE, requireAppPrefix } from "./app-name.ts";
import { logArchive } from "./log-archive.ts";
import { site } from "./src/shared/config/site.ts";

const DOMAIN = new URL(site.url).hostname;
const PRODUCTION_STAGE = "prod";
const COMPATIBILITY = { date: "2026-08-25" } as const;

const SCANNER_PATH_FRAGMENTS = [
  ".php",
  ".asp",
  ".jsp",
  ".cgi",
  ".sql",
  ".bak",
  "/wp-",
  "/cgi-bin/",
  "/phpmyadmin",
  "/actuator",
  "/vendor/",
] as const;

const HONEYPOT_PATHS = ["/.env", "/wp-login.php"] as const;

const PATH = "lower(http.request.uri.path)";

const HONEYPOT_EXPRESSION = `(http.host eq "${DOMAIN}" and http.request.uri.path in {${HONEYPOT_PATHS.map((path) => `"${path}"`).join(" ")}})`;

const SCANNER_EXPRESSION = `(${[
  ...SCANNER_PATH_FRAGMENTS.map((fragment) => `${PATH} contains "${fragment}"`),
  `(${PATH} contains "/." and not starts_with(${PATH}, "/.well-known/"))`,
].join(" or ")}) and not ${HONEYPOT_EXPRESSION}`;

const scannerBlock = Effect.gen(function* scannerBlock() {
  const zone = yield* Zone.Zone("Zone", { name: DOMAIN }).pipe(adopt(true));
  return yield* Ruleset.Ruleset("ScannerBlock", {
    zone,
    name: `${APP_NAME}-scanner-block`,
    phase: "http_request_firewall_custom",
    rules: [
      {
        description: "Block vulnerability scanner probes",
        expression: SCANNER_EXPRESSION,
        action: "block",
      },
    ],
  });
});

const honeypot = Effect.gen(function* honeypot() {
  const HONEYPOT = yield* AnalyticsEngine.Dataset("Honeypot", {
    dataset: `${APP_NAME.replaceAll("-", "_")}_honeypot`,
  });
  return yield* Workers.Worker("Honeypot", {
    name: `${APP_NAME}-honeypot`,
    main: "./honeypot.worker.ts",
    compatibility: COMPATIBILITY,
    logpush: true,
    env: { HONEYPOT },
    routes: HONEYPOT_PATHS.map((path) => ({ pattern: `${DOMAIN}${path}`, zoneName: DOMAIN })),
  });
});

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
type HoneypotEnv = InferEnv<typeof honeypot>;

export type { CiTelemetryEnv, HoneypotEnv };
export default Stack(
  APP_NAME,
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { url } = yield* web;
    if ((yield* Stage) === PRODUCTION_STAGE) {
      yield* scannerBlock;
      yield* honeypot;
      yield* logArchive;
    }
    yield* ciTelemetry;
    yield* requireAppPrefix;
    return { url };
  }),
);
