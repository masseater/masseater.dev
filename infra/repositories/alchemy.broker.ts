import {
  CloudflareEnvironment,
  D1,
  SecretsStore,
  Workers,
  Zone,
  providers,
  state,
} from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { adopt } from "alchemy/AdoptPolicy";
import { Config, Effect, Option, Redacted, Schema, pipe } from "effect";
import type { ConfigError } from "effect/Config";

import { CREDENTIAL_BROKER_AUDIENCE, PREFIX } from "./broker-names.ts";
import { grantPolicies } from "./credential-grants.ts";

const DOMAIN = "masseater.dev";
const CREDENTIAL_BROKER_HOST = `credentials.${DOMAIN}`;
const COMPATIBILITY = { date: "2026-08-25" } as const;
const GITHUB_APP_DATABASE = `${PREFIX}GitHubApp-prod-zcxmorxkzgzaqw2z`;

const npmTokenBinding = Effect.fn("npmTokenBinding")(function* npmTokenBinding(
  store: SecretsStore.Store,
) {
  const token = yield* Config.option(Config.Redacted("NPM_TOKEN"));
  const filled = pipe(
    token,
    Option.filter((value) => Redacted.value(value) !== ""),
  );
  if (Option.isNone(filled)) {
    return {};
  }
  const NPM_TOKEN = yield* SecretsStore.Secret("CiNpmToken", {
    store,
    name: `${PREFIX}ci-npm-token`,
    value: filled.value,
  });
  return { NPM_TOKEN };
});

const ciKeys = Effect.fn("ciKeys")(function* ciKeys(store: SecretsStore.Store) {
  const OPENROUTER_API_KEY = yield* SecretsStore.Secret("CiOpenrouterApiKey", {
    store,
    name: `${PREFIX}ci-openrouter-api-key`,
    value: yield* Config.Redacted("OPENROUTER_API_KEY"),
  });
  const CLAUDE_CODE_OAUTH_TOKEN = yield* SecretsStore.Secret("CiClaudeCodeOauthToken", {
    store,
    name: `${PREFIX}ci-claude-code-oauth-token`,
    value: yield* Config.Redacted("CLAUDE_CODE_OAUTH_TOKEN"),
  });
  return {
    OPENROUTER_API_KEY,
    CLAUDE_CODE_OAUTH_TOKEN,
    ...(yield* npmTokenBinding(store)),
  };
});

const broker: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  CREDENTIAL_BROKER_AUDIENCE,
  { providers: providers(), state: state() },
  Effect.gen(function* stack() {
    const { accountId } = yield* yield* CloudflareEnvironment;
    const zoneId = yield* Zone.resolveZoneId({ accountId, zone: DOMAIN, hostname: DOMAIN }).pipe(
      Effect.orDie,
    );
    const store = yield* SecretsStore.Store("Secrets");
    const ROOT_TOKEN = yield* SecretsStore.Secret("CredentialRootToken", {
      store,
      name: `${PREFIX}credential-root-token`,
      value: yield* Config.Redacted("CLOUDFLARE_API_TOKEN"),
    });
    const keys = yield* ciKeys(store);
    const GITHUB_APP = yield* D1.Database("GitHubApp", {
      name: GITHUB_APP_DATABASE,
      migrations: "./github-app-migrations",
    });
    const GRANTS = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(
      grantPolicies({ accountId, zoneId }),
    ).pipe(Effect.orDie);
    const { url } = yield* Workers.Worker("CredentialBroker", {
      name: CREDENTIAL_BROKER_AUDIENCE,
      main: "./credential-broker.worker.ts",
      compatibility: COMPATIBILITY,
      logpush: true,
      domain: CREDENTIAL_BROKER_HOST,
      crons: ["17 18 * * *"],
      env: {
        ROOT_TOKEN,
        ...keys,
        GITHUB_APP,
        ACCOUNT_ID: accountId,
        GRANTS,
      },
      observability: {
        enabled: true,
        logs: { enabled: true, invocationLogs: false, persist: true },
      },
    });
    return { url };
  }).pipe(adopt(true)),
);

export default broker;
