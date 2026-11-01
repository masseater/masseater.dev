import {
  ApiToken,
  CloudflareEnvironment,
  D1,
  SecretsStore,
  Website,
  Workers,
  Zone,
  providers,
  state,
} from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { Stack, Stage, makeRandom } from "alchemy";
import type { CompiledStack } from "alchemy";
import { Config, Effect, Option, Schema } from "effect";
import type { ConfigError } from "effect/Config";

import {
  APP_NAME,
  CI_TELEMETRY_AUDIENCE,
  CREDENTIAL_BROKER_AUDIENCE,
  PREFIX,
  requireAppPrefix,
} from "./app-name.ts";
import { grantPolicies } from "./credential-grants.ts";
import { edgeGuard } from "./edge-guard.ts";
import { logArchive } from "./log-archive.ts";
import { site } from "./src/shared/config/site.ts";

const DOMAIN = new URL(site.url).hostname;
const PRODUCTION_STAGE = "prod";
const COMPATIBILITY = { date: "2026-08-25" } as const;
const CF_BEACON_TOKEN = "021b4961f3fd419297b186136a5a8a0a";
const CREDENTIAL_BROKER_HOST = `credentials.${DOMAIN}`;

const OWNED_ZONE = Option.some(DOMAIN);

const web = Effect.gen(function* web() {
  const production = (yield* Stage) === PRODUCTION_STAGE;
  const STARS = yield* D1.Database("Stars", { migrations: "./drizzle" });
  const VISITOR_SALT = yield* makeRandom("VisitorSalt");
  return yield* Website.StaticSite("Web", {
    ...(production && { domain: { name: DOMAIN, redirects: [`www.${DOMAIN}`] } }),
    command: "vp build",
    outdir: "dist/client",
    main: "./site.worker.ts",
    compatibility: COMPATIBILITY,
    logpush: true,
    env: { STARS, VISITOR_SALT, VITE_CF_BEACON_TOKEN: CF_BEACON_TOKEN },
    observability: {
      enabled: true,
      logs: { enabled: true, invocationLogs: false, persist: true },
      traces: { enabled: true, persist: true },
    },
    assets: {
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "404-page",
      runWorkerFirst: [`${site.starsApiPath}/*`],
    },
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

const credentialBroker = Effect.gen(function* credentialBroker() {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const zoneId = yield* Zone.resolveZoneId({ accountId, zone: DOMAIN, hostname: DOMAIN }).pipe(
    Effect.orDie,
  );
  const root = yield* ApiToken.AccountApiToken("CredentialRoot", {
    name: `${PREFIX}credential-root`,
    accountId,
    policies: [
      {
        effect: "allow",
        permissionGroups: ["Account API Tokens Write"],
        resources: { [`com.cloudflare.api.account.${accountId}`]: "*" },
      },
    ],
  });
  const store = yield* SecretsStore.Store("Secrets");
  const ROOT_TOKEN = yield* SecretsStore.Secret("CredentialRootToken", {
    store,
    name: `${PREFIX}credential-root-token`,
    value: root.value,
  });
  const GRANTS = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(
    grantPolicies({ accountId, zoneId }),
  ).pipe(Effect.orDie);
  return yield* Workers.Worker("CredentialBroker", {
    name: CREDENTIAL_BROKER_AUDIENCE,
    main: "./credential-broker.worker.ts",
    compatibility: COMPATIBILITY,
    logpush: true,
    domain: CREDENTIAL_BROKER_HOST,
    crons: ["17 18 * * *"],
    env: {
      ROOT_TOKEN,
      ACCOUNT_ID: accountId,
      GRANTS,
    },
    observability: {
      enabled: true,
      logs: { enabled: true, invocationLogs: false, persist: true },
    },
  });
});

type CiTelemetryEnv = InferEnv<typeof ciTelemetry>;
type WebEnv = InferEnv<typeof web>;

const stack: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  APP_NAME,
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { url } = yield* web;
    if ((yield* Stage) === PRODUCTION_STAGE) {
      yield* Option.match(OWNED_ZONE, {
        onNone: () => Effect.void,
        onSome: (domain) => edgeGuard(domain, COMPATIBILITY).pipe(Effect.andThen(credentialBroker)),
      });
      yield* logArchive;
    }
    yield* ciTelemetry;
    yield* requireAppPrefix;
    return { url };
  }),
);

export type { CiTelemetryEnv, WebEnv };
export default stack;
