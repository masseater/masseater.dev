import { D1, SecretsStore } from "@alchemy.run/cloudflare";
import { RemovalPolicy, makeRandom } from "alchemy";
import { Config, Effect, Option, Redacted, Schema, pipe } from "effect";

import { grantBindings, WORKFLOW_GITHUB_GRANTS } from "#/entities/credential/index.ts";
import type { GitHubAppEnv } from "#/entities/credential/index.ts";
import { PREFIX } from "#/shared/config/index.ts";

const GITHUB_APP_DATABASE = `${PREFIX}GitHubApp-prod-zcxmorxkzgzaqw2z`;
const SEAL_KEY_BYTES = 32;

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

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

export const encodedGrants = Effect.fn("encodedGrants")(function* encodedGrants(
  ids: Readonly<{ accountId: string; zoneId: string }>,
) {
  const bindings = grantBindings(ids);
  return yield* Effect.all({
    GRANTS: encodeJson(bindings.GRANTS),
    GRANT_PROFILES: encodeJson(bindings.GRANT_PROFILES),
    WORKFLOW_GRANTS: encodeJson(WORKFLOW_GITHUB_GRANTS),
  }).pipe(Effect.orDie);
});

export const ciKeys = Effect.fn("ciKeys")(function* ciKeys(store: SecretsStore.Store) {
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

export const githubAppStore = Effect.all({
  GITHUB_APP: D1.Database("GitHubApp", {
    name: GITHUB_APP_DATABASE,
    migrations: "./github-app-migrations",
  }).pipe(RemovalPolicy.protect()),
  SEAL_KEY: makeRandom("SealKey", { bytes: SEAL_KEY_BYTES }),
}).pipe(Effect.map((store) => store satisfies Readonly<Record<keyof GitHubAppEnv, unknown>>));
