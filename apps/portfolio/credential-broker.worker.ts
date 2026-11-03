import { createToken, deleteToken, listTokens } from "@distilled.cloud/cloudflare/accounts";
import type { CloudflareOpContext, CreateTokenError } from "@distilled.cloud/cloudflare/accounts";
import { fromApiToken } from "@distilled.cloud/cloudflare/Credentials";
import { createInstallationAccessToken, getUserInstallation } from "@distilled.cloud/github/apps";
import type { Installation } from "@distilled.cloud/github/apps";
import type { GithubOpContext } from "@distilled.cloud/github/Protocol";
import {
  Array as Arr,
  DateTime,
  Effect,
  Layer,
  Logger,
  ManagedRuntime,
  Option,
  Record as Rec,
  Redacted,
  Schema,
  Stream,
  String as Str,
  flow,
  pipe,
} from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

import { CREDENTIAL_BROKER_AUDIENCE } from "./app-name.ts";
import { failed, gitHubAppCredentials, readApp, route } from "./github-app.ts";
import type { GitHubAppEnv, GitHubAppFailed } from "./github-app.ts";
import type { Claims } from "./github-oidc.ts";
import { OWNER, OWNER_ID, Rejected, repositoryName, verify } from "./github-oidc.ts";

const TOKEN_PREFIX = `${CREDENTIAL_BROKER_AUDIENCE}:`;
const TOKEN_LIFETIME = { hours: 1 } as const;

type CredentialBrokerEnv = GitHubAppEnv &
  Readonly<{
    ROOT_TOKEN: SecretsStoreSecret;
    OPENROUTER_API_KEY: SecretsStoreSecret;
    CLAUDE_CODE_OAUTH_TOKEN: SecretsStoreSecret;
    ACCOUNT_ID: string;
    GRANTS: string;
  }>;

const PermissionGroups = Schema.mutable(Schema.Array(Schema.Struct({ id: Schema.String })));

const Policy = Schema.Struct({
  effect: Schema.Literal("allow"),
  permissionGroups: PermissionGroups,
  resources: Schema.Record(Schema.String, Schema.String),
});

const Policies = Schema.mutable(Schema.Array(Policy));

const Permissions = Schema.Record(Schema.String, Schema.String);

const Grants = Schema.fromJsonString(
  Schema.Struct({
    profiles: Schema.Record(Schema.String, Policies),
    repositories: Schema.Record(Schema.String, Schema.String),
    github: Schema.Record(Schema.String, Permissions),
  }),
);

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const cloudflare = (env: CredentialBrokerEnv): Layer.Layer<CloudflareOpContext> =>
  Layer.unwrap(
    Effect.promise(() => env.ROOT_TOKEN.get()).pipe(
      Effect.map((apiToken) =>
        Layer.mergeAll(fromApiToken({ apiToken: Redacted.make(apiToken) }), fetchHttpClient),
      ),
    ),
  );

const toTokenTime = flow(
  DateTime.add(TOKEN_LIFETIME),
  DateTime.formatIso,
  Str.replace(/\.\d{3}Z$/u, "Z"),
);

const expiry: Effect.Effect<string> = DateTime.now.pipe(Effect.map(toTokenTime));

const OWNER_ACCOUNT = { login: OWNER, id: OWNER_ID } as const;

type BrokerContext = CloudflareOpContext | GithubOpContext;

type Issued = Readonly<Record<string, unknown>>;

type IssueError = CreateTokenError | GitHubAppFailed | Schema.SchemaError;

const decodeGrants = (
  env: CredentialBrokerEnv,
): Effect.Effect<typeof Grants.Type, Schema.SchemaError> => Schema.decodeEffect(Grants)(env.GRANTS);

const issueCloudflareToken = (
  env: CredentialBrokerEnv,
  claims: typeof Claims.Type,
): Effect.Effect<Option.Option<Issued>, IssueError, CloudflareOpContext> =>
  Effect.gen(function* createCloudflareToken() {
    const repository = repositoryName(claims);
    const grants = yield* decodeGrants(env);
    const policies = Option.fromNullishOr(grants.profiles[grants.repositories[repository] ?? ""]);
    if (Option.isNone(policies)) {
      return Option.none();
    }
    const created = yield* createToken({
      accountId: env.ACCOUNT_ID,
      name: `${TOKEN_PREFIX}${repository}:${claims.run_id}:${claims.run_attempt}`,
      policies: policies.value,
      expiresOn: yield* expiry,
    });
    yield* Effect.logInfo("credential.issued").pipe(
      Effect.annotateLogs({ repository, runId: claims.run_id, tokenId: created.id }),
    );
    return Option.some({ token: created.value, accountId: env.ACCOUNT_ID });
  });

const findInstallation = (
  owner: typeof OWNER_ACCOUNT,
): Effect.Effect<Option.Option<Installation>, never, GithubOpContext> =>
  getUserInstallation({ username: owner.login }).pipe(
    Effect.tapError((failure) => Effect.logWarning("github_app.not_installed", failure)),
    Effect.option,
  );

const mint = (
  installationId: number,
  permissions: Readonly<Record<string, string>>,
): Effect.Effect<Option.Option<string>, GitHubAppFailed, GithubOpContext> =>
  createInstallationAccessToken({ installation_id: installationId, permissions }).pipe(
    Effect.mapBoth({ onSuccess: ({ token }) => Option.some(token), onFailure: failed }),
  );

const installationToken = (
  env: CredentialBrokerEnv,
  permissions: Readonly<Record<string, string>>,
): Effect.Effect<Option.Option<string>, GitHubAppFailed, GithubOpContext> =>
  readApp(env).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.logWarning("github_app.missing").pipe(Effect.as(Option.none())),
        onSome: () =>
          findInstallation(OWNER_ACCOUNT).pipe(
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.succeedNone,
                onSome: (installation) => mint(installation.id, permissions),
              }),
            ),
          ),
      }),
    ),
  );

const issueGitHubToken = (
  env: CredentialBrokerEnv,
  claims: typeof Claims.Type,
): Effect.Effect<Option.Option<Issued>, IssueError, GithubOpContext> =>
  decodeGrants(env).pipe(
    Effect.flatMap((grants) =>
      Option.match(Option.fromNullishOr(grants.github[repositoryName(claims)]), {
        onNone: () => Effect.succeedNone,
        onSome: (permissions) =>
          installationToken(env, permissions).pipe(
            Effect.map(Option.map((githubToken) => ({ githubToken }))),
          ),
      }),
    ),
  );

const issueGranted = (
  env: CredentialBrokerEnv,
  claims: typeof Claims.Type,
): Effect.Effect<readonly Issued[], IssueError, BrokerContext> =>
  Effect.all([issueCloudflareToken(env, claims), issueGitHubToken(env, claims)]).pipe(
    Effect.map(Arr.getSomes),
  );

const sharedKeys = (env: CredentialBrokerEnv): Effect.Effect<Readonly<Record<string, string>>> =>
  Effect.promise(() =>
    Promise.all([env.OPENROUTER_API_KEY.get(), env.CLAUDE_CODE_OAUTH_TOKEN.get()]),
  ).pipe(
    Effect.map(([openrouterApiKey, claudeCodeOauthToken]) => ({
      openrouterApiKey,
      claudeCodeOauthToken,
    })),
  );

const issue = (
  request: Request,
  env: CredentialBrokerEnv,
): Effect.Effect<Response, never, BrokerContext> =>
  Effect.gen(function* issueToken() {
    const claims = yield* verify(request);
    const repository = repositoryName(claims);
    const grants = yield* decodeGrants(env);
    if (!Rec.has(grants.repositories, repository) && !Rec.has(grants.github, repository)) {
      return yield* Rejected.make({ reason: `no grant for ${repository}` });
    }
    const issued = yield* issueGranted(env, claims);
    const keys = yield* sharedKeys(env);
    return Response.json(Object.assign({}, ...issued, keys));
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

const handle = (
  request: Request,
  env: CredentialBrokerEnv,
): Effect.Effect<Response, never, BrokerContext> =>
  Option.match(route({ request, env }), {
    onNone: () => issue(request, env),
    onSome: (handled) =>
      handled.pipe(
        Effect.catchCause((cause) =>
          Effect.logError("github_app.failed", cause).pipe(
            Effect.as(new Response("", { status: 502 })),
          ),
        ),
      ),
  });

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
  effect: Effect.Effect<Value, never, BrokerContext>,
): Promise<Value> =>
  ManagedRuntime.make(
    Layer.mergeAll(logger, cloudflare(env), gitHubAppCredentials(env)),
  ).runPromise(effect);

const worker = {
  fetch: (request: Request, env: CredentialBrokerEnv): Promise<Response> =>
    run(env, handle(request, env)),
  scheduled: (_controller: unknown, env: CredentialBrokerEnv): Promise<void> =>
    run(env, sweep(env)),
};

export default worker;
