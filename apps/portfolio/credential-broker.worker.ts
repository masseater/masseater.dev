import { createToken, deleteToken, listTokens } from "@distilled.cloud/cloudflare/accounts";
import type { CloudflareOpContext } from "@distilled.cloud/cloudflare/accounts";
import { fromApiToken } from "@distilled.cloud/cloudflare/Credentials";
import {
  Array as Arr,
  DateTime,
  Effect,
  Layer,
  Logger,
  ManagedRuntime,
  Option,
  Record,
  Redacted,
  Schema,
  Stream,
  String as Str,
  flow,
  pipe,
} from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { CREDENTIAL_BROKER_AUDIENCE } from "./app-name.ts";

const ISSUER = "https://token.actions.githubusercontent.com";
const OWNER = "masseater";
const OWNER_ID = "62135405";
const UNTRUSTED_EVENTS: ReadonlySet<string> = new Set(["pull_request_target", "workflow_run"]);
const DEFAULT_BRANCH = "refs/heads/main";
const TOKEN_PREFIX = `${CREDENTIAL_BROKER_AUDIENCE}:`;
const TOKEN_LIFETIME = { hours: 1 } as const;

type CredentialBrokerEnv = Readonly<{
  ROOT_TOKEN: SecretsStoreSecret;
  OPENROUTER_API_KEY: SecretsStoreSecret;
  CLAUDE_CODE_OAUTH_TOKEN: SecretsStoreSecret;
  ACCOUNT_ID: string;
  GRANTS: string;
}>;

const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

const PermissionGroups = Schema.mutable(Schema.Array(Schema.Struct({ id: Schema.String })));

const Policy = Schema.Struct({
  effect: Schema.Literal("allow"),
  permissionGroups: PermissionGroups,
  resources: Schema.Record(Schema.String, Schema.String),
});

const Policies = Schema.mutable(Schema.Array(Policy));

const Grants = Schema.fromJsonString(
  Schema.Struct({
    profiles: Schema.Record(Schema.String, Policies),
    repositories: Schema.Record(Schema.String, Schema.String),
  }),
);

const Claims = Schema.Struct({
  repository_owner: Schema.String,
  repository_owner_id: Schema.String,
  repository: Schema.String,
  event_name: Schema.String,
  ref: Schema.String,
  run_id: Schema.String,
  run_attempt: Schema.String,
});

const taggedError = Schema.TaggedError;

class Rejected extends taggedError<Rejected, { readonly brand: unique symbol }>()("Rejected", {
  reason: Schema.String,
}) {}

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const cloudflare = (env: CredentialBrokerEnv): Layer.Layer<CloudflareOpContext> =>
  Layer.unwrap(
    Effect.promise(() => env.ROOT_TOKEN.get()).pipe(
      Effect.map((apiToken) =>
        Layer.mergeAll(fromApiToken({ apiToken: Redacted.make(apiToken) }), fetchHttpClient),
      ),
    ),
  );

const bearer = (request: Request): string =>
  Str.replace(/^Bearer /u, "")(request.headers.get("authorization") ?? "");

const TRUSTED_CLAIMS = {
  repository_owner_id: OWNER_ID,
  repository_owner: OWNER,
  ref: DEFAULT_BRANCH,
} as const;

const isTrusted = (claims: typeof Claims.Type): boolean =>
  Arr.every(Record.toEntries(TRUSTED_CLAIMS), ([key, value]) => claims[key] === value) &&
  !UNTRUSTED_EVENTS.has(claims.event_name);

const verify = (
  request: Request,
): Effect.Effect<typeof Claims.Type, Rejected | Schema.SchemaError> =>
  Effect.gen(function* verifyClaims() {
    const { payload } = yield* Effect.tryPromise({
      try: () =>
        jwtVerify(bearer(request), jwks, { issuer: ISSUER, audience: CREDENTIAL_BROKER_AUDIENCE }),
      catch: (error) => Rejected.make({ reason: String(error) }),
    });
    const claims = yield* Schema.decodeUnknownEffect(Claims)(payload);
    if (!isTrusted(claims)) {
      return yield* Rejected.make({
        reason: `rejected ${claims.repository} at ${claims.ref} on ${claims.event_name}`,
      });
    }
    return claims;
  });

const repositoryName = (claims: typeof Claims.Type): string =>
  Str.replace(`${OWNER}/`, "")(claims.repository);

const toTokenTime = flow(
  DateTime.add(TOKEN_LIFETIME),
  DateTime.formatIso,
  Str.replace(/\.\d{3}Z$/u, "Z"),
);

const expiry: Effect.Effect<string> = DateTime.now.pipe(Effect.map(toTokenTime));

const issue = (
  request: Request,
  env: CredentialBrokerEnv,
): Effect.Effect<Response, never, CloudflareOpContext> =>
  Effect.gen(function* issueToken() {
    const claims = yield* verify(request);
    const repository = repositoryName(claims);
    const grants = yield* Schema.decodeEffect(Grants)(env.GRANTS);
    const policies = yield* Option.match(
      Option.fromNullishOr(grants.profiles[grants.repositories[repository] ?? ""]),
      {
        onNone: () => Rejected.make({ reason: `no grant for ${repository}` }),
        onSome: Effect.succeed,
      },
    );
    const created = yield* createToken({
      accountId: env.ACCOUNT_ID,
      name: `${TOKEN_PREFIX}${repository}:${claims.run_id}:${claims.run_attempt}`,
      policies,
      expiresOn: yield* expiry,
    });
    yield* Effect.logInfo("credential.issued").pipe(
      Effect.annotateLogs({ repository, runId: claims.run_id, tokenId: created.id }),
    );
    const [openrouterApiKey, claudeCodeOauthToken] = yield* Effect.promise(() =>
      Promise.all([env.OPENROUTER_API_KEY.get(), env.CLAUDE_CODE_OAUTH_TOKEN.get()]),
    );
    return Response.json({
      token: created.value,
      accountId: env.ACCOUNT_ID,
      openrouterApiKey,
      claudeCodeOauthToken,
    });
  }).pipe(
    Effect.catchTag("Rejected", (rejected) =>
      Effect.logWarning("credential.unauthorized").pipe(
        Effect.annotateLogs({ reason: rejected.reason }),
        Effect.as(new Response("", { status: 401 })),
      ),
    ),
    Effect.catchCause((cause) =>
      Effect.logError("credential.failed", cause).pipe(
        Effect.as(new Response("", { status: 502 })),
      ),
    ),
  );

const sweep = (env: CredentialBrokerEnv): Effect.Effect<void, never, CloudflareOpContext> =>
  Effect.gen(function* sweepExpired() {
    const now = yield* DateTime.now;
    const expired = yield* pipe(
      listTokens.items({ accountId: env.ACCOUNT_ID }),
      Stream.filter(
        (token) =>
          Str.startsWith(TOKEN_PREFIX)(token.name ?? "") &&
          Option.exists(DateTime.make(token.expiresOn ?? ""), DateTime.isLessThan(now)),
      ),
      Stream.runCollect,
    );
    yield* pipe(
      expired,
      Effect.forEach((token) =>
        deleteToken({ accountId: env.ACCOUNT_ID, tokenId: token.id ?? "" }),
      ),
    );
    yield* Effect.logInfo("credential.swept").pipe(Effect.annotateLogs({ count: expired.length }));
  }).pipe(Effect.catchCause((cause) => Effect.logError("credential.sweep_failed", cause)));

const run = <Value>(
  env: CredentialBrokerEnv,
  effect: Effect.Effect<Value, never, CloudflareOpContext>,
): Promise<Value> =>
  ManagedRuntime.make(Layer.mergeAll(logger, cloudflare(env))).runPromise(effect);

const worker = {
  fetch: (request: Request, env: CredentialBrokerEnv): Promise<Response> =>
    run(env, issue(request, env)),
  scheduled: (_controller: unknown, env: CredentialBrokerEnv): Promise<void> =>
    run(env, sweep(env)),
};

export default worker;
