import {
  CloudflareEnvironment,
  D1,
  SecretsStore,
  Workers,
  Zone,
  state,
} from "@alchemy.run/cloudflare";
import type { ClaudeRequestsRpc } from "@masseater.dev/exposure-protocol/claude-requests";
import { Stack, makeRandom } from "alchemy";
import type { CompiledStack } from "alchemy";
import { adopt } from "alchemy/AdoptPolicy";
import { Config, Effect, Option, Redacted, Schema, pipe } from "effect";
import type { ConfigError } from "effect/Config";

import { CREDENTIAL_BROKER_AUDIENCE, PREFIX } from "./broker-names.ts";
import { brokerProviders, tailnetEnv } from "./broker-tailnet.ts";
import { grantBindings, WORKFLOW_GITHUB_GRANTS } from "./credential-grants.ts";
import type { GitHubAppEnv } from "./github-app.ts";

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const DOMAIN = "masseater.dev";
const CREDENTIAL_BROKER_HOST = `credentials.${DOMAIN}`;
const GITHUB_APP_DATABASE = `${PREFIX}GitHubApp-prod-zcxmorxkzgzaqw2z`;
const SEAL_KEY_BYTES = 32;
const SUNDRIES = { stack: "masseater-dev-sundries", stage: "prod" } as const;

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

const encodedGrants = Effect.fn("encodedGrants")(function* encodedGrants(
  ids: Readonly<{ accountId: string; zoneId: string }>,
) {
  const bindings = grantBindings(ids);
  return yield* Effect.all({
    GRANTS: encodeJson(bindings.GRANTS),
    GRANT_PROFILES: encodeJson(bindings.GRANT_PROFILES),
    WORKFLOW_GRANTS: encodeJson(WORKFLOW_GITHUB_GRANTS),
  }).pipe(Effect.orDie);
});

const ciKeys = Effect.fn("ciKeys")(function* ciKeys(store: SecretsStore.Store) {
  const CLAUDE_CODE_OAUTH_TOKEN = yield* SecretsStore.Secret("CiClaudeCodeOauthToken", {
    store,
    name: `${PREFIX}ci-claude-code-oauth-token`,
    value: yield* Config.Redacted("CLAUDE_CODE_OAUTH_TOKEN"),
  });
  return {
    CLAUDE_CODE_OAUTH_TOKEN,
    ...(yield* npmTokenBinding(store)),
  };
});

const broker: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  CREDENTIAL_BROKER_AUDIENCE,
  {
    providers: brokerProviders,
    state: state(),
  },
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
    const appStore = {
      GITHUB_APP: yield* D1.Database("GitHubApp", {
        name: GITHUB_APP_DATABASE,
        migrations: "./github-app-migrations",
      }),
      SEAL_KEY: yield* makeRandom("SealKey", { bytes: SEAL_KEY_BYTES }),
    } satisfies Readonly<Record<keyof GitHubAppEnv, unknown>>;
    const grants = yield* encodedGrants({ accountId, zoneId });
    const sundries = yield* Workers.Worker.ref("Mcp", SUNDRIES);
    const { url } = yield* Workers.Worker("CredentialBroker", {
      name: CREDENTIAL_BROKER_AUDIENCE,
      main: "./credential-broker.worker.ts",
      logpush: true,
      domain: CREDENTIAL_BROKER_HOST,
      crons: ["17 18 * * *"],
      env: {
        ROOT_TOKEN,
        ...keys,
        ...appStore,
        ACCOUNT_ID: accountId,
        ...grants,
        ...(yield* tailnetEnv),
        CLAUDE_REQUESTS: Workers.WorkerEntrypoint<ClaudeRequestsRpc>(sundries, "ClaudeRequests"),
      },
    });
    return { url };
  }).pipe(adopt(true)),
);

export default broker;
