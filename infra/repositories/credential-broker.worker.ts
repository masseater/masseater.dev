import { createToken, deleteToken, listTokens } from "@distilled.cloud/cloudflare/accounts";
import type { CloudflareOpContext, CreateTokenError } from "@distilled.cloud/cloudflare/accounts";
import { runner } from "@r_masseater/workers-tracing/effect";
import {
  Array as Arr,
  DateTime,
  Effect,
  Layer,
  Logger,
  Option,
  Schema,
  Stream,
  String as Str,
  flow,
  pipe,
} from "effect";

import { accessOAuthRoute } from "./access-oauth.ts";
import { atprotoRoute, issueAppPassword } from "./atproto.ts";
import { ISSUED_TOKEN_PREFIX, cloudflare } from "./cloudflare-root.ts";
import { issueKinds, selectKinds } from "./credential-kinds.ts";
import { route } from "./github-app.ts";
import type { GitHubAppEnv, GitHubAppFailed } from "./github-app.ts";
import type { Claims } from "./github-oidc.ts";
import {
  Rejected,
  grantKeys,
  isGranted,
  repositoryName,
  verify,
  workflowGrant,
} from "./github-oidc.ts";
import { mintGitHubToken } from "./github-token.ts";

const TOKEN_LIFETIME = { hours: 1 } as const;

type CredentialBrokerEnv = GitHubAppEnv &
  Readonly<{
    ROOT_TOKEN: SecretsStoreSecret;
    OPENROUTER_API_KEY: SecretsStoreSecret;
    CLAUDE_CODE_OAUTH_TOKEN: SecretsStoreSecret;
    NPM_TOKEN?: SecretsStoreSecret;
    ACCOUNT_ID: string;
    GRANTS: string;
    WORKFLOW_GRANTS: string;
  }>;

const PermissionGroups = Schema.mutable(Schema.Array(Schema.Struct({ id: Schema.String })));

const Policy = Schema.Struct({
  effect: Schema.Literal("allow"),
  permissionGroups: PermissionGroups,
  resources: Schema.Record(Schema.String, Schema.String),
});

const Policies = Schema.mutable(Schema.Array(Policy));

const Permissions = Schema.Record(Schema.String, Schema.String);

const RepositoryNames = Schema.mutable(Schema.Array(Schema.String));

const GitHubGrant = Schema.Struct({
  permissions: Permissions,
  repositories: Schema.optionalKey(RepositoryNames),
});

const Grants = Schema.fromJsonString(
  Schema.Struct({
    profiles: Schema.Record(Schema.String, Policies),
    repositories: Schema.Record(Schema.String, Schema.String),
    github: Schema.Record(Schema.String, GitHubGrant),
    npm: Schema.Array(Schema.String),
    atproto: Schema.Array(Schema.String),
  }),
);

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const toTokenTime = flow(
  DateTime.add(TOKEN_LIFETIME),
  DateTime.formatIso,
  Str.replace(/\.\d{3}Z$/u, "Z"),
);

const expiry: Effect.Effect<string> = DateTime.now.pipe(Effect.map(toTokenTime));

type BrokerContext = CloudflareOpContext;

type Issued = Readonly<Record<string, unknown>>;

type IssueError = CreateTokenError | GitHubAppFailed | Schema.SchemaError;

const isListed = (claims: typeof Claims.Type, listed: readonly string[]): boolean =>
  Arr.some(grantKeys(claims), (key) => Arr.contains(listed, key));

const WorkflowGrants = Schema.fromJsonString(Schema.Record(Schema.String, Permissions));

const decodeGrants = (
  env: CredentialBrokerEnv,
): Effect.Effect<
  typeof Grants.Type & Readonly<{ workflows: typeof WorkflowGrants.Type }>,
  Schema.SchemaError
> =>
  Effect.all({
    grants: Schema.decodeEffect(Grants)(env.GRANTS),
    workflows: Schema.decodeEffect(WorkflowGrants)(env.WORKFLOW_GRANTS),
  }).pipe(Effect.map(({ grants, workflows }) => ({ ...grants, workflows })));

const issueCloudflareToken = (
  env: CredentialBrokerEnv,
  claims: typeof Claims.Type,
): Effect.Effect<Option.Option<Issued>, IssueError, CloudflareOpContext> =>
  Effect.gen(function* createCloudflareToken() {
    const repository = repositoryName(claims);
    const grants = yield* decodeGrants(env);
    const policies = Arr.findFirst(grantKeys(claims), (key) =>
      Option.fromNullishOr(grants.profiles[grants.repositories[key] ?? ""]),
    );
    if (Option.isNone(policies)) {
      return Option.none();
    }
    const created = yield* createToken({
      accountId: env.ACCOUNT_ID,
      name: `${ISSUED_TOKEN_PREFIX}${repository}:${claims.run_id}:${claims.run_attempt}`,
      policies: policies.value,
      expiresOn: yield* expiry,
    });
    yield* Effect.logInfo("credential.issued").pipe(
      Effect.annotateLogs({ repository, runId: claims.run_id, tokenId: created.id }),
    );
    return Option.some({ token: created.value, accountId: env.ACCOUNT_ID });
  });

const issueGitHubToken = (
  env: CredentialBrokerEnv,
  claims: typeof Claims.Type,
): Effect.Effect<Option.Option<Issued>, IssueError> =>
  Effect.gen(function* createGitHubToken() {
    const grants = yield* decodeGrants(env);
    const grant = Option.orElse(workflowGrant(grants.workflows)(claims), () =>
      Arr.findFirst(grantKeys(claims), (key) => Option.fromNullishOr(grants.github[key])),
    );
    if (Option.isNone(grant)) {
      return Option.none();
    }
    const minted = yield* Effect.promise(() => mintGitHubToken({ env, grant: grant.value }));
    return pipe(
      minted,
      Option.map((githubToken) => ({ githubToken })),
    );
  });

const issueNpmToken = (
  env: CredentialBrokerEnv,
  claims: typeof Claims.Type,
): Effect.Effect<Option.Option<Issued>, Schema.SchemaError> =>
  decodeGrants(env).pipe(
    Effect.flatMap((grants) =>
      Option.match(
        Option.filter(Option.fromNullishOr(env.NPM_TOKEN), () => isListed(claims, grants.npm)),
        {
          onNone: () => Effect.succeedNone,
          onSome: (secret) =>
            Effect.promise(() => secret.get()).pipe(
              Effect.map((npmToken) => Option.some({ npmToken })),
            ),
        },
      ),
    ),
  );

const issueAtproto = (
  env: CredentialBrokerEnv,
  claims: typeof Claims.Type,
): Effect.Effect<Option.Option<Issued>, Schema.SchemaError> =>
  decodeGrants(env).pipe(
    Effect.flatMap((grants) =>
      issueAppPassword({ env, granted: isListed(claims, grants.atproto) }),
    ),
  );

const sharedKeys = (env: CredentialBrokerEnv): Effect.Effect<Option.Option<Issued>> =>
  Effect.promise(() =>
    Promise.all([env.OPENROUTER_API_KEY.get(), env.CLAUDE_CODE_OAUTH_TOKEN.get()]),
  ).pipe(
    Effect.map(([openrouterApiKey, claudeCodeOauthToken]) =>
      Option.some({ openrouterApiKey, claudeCodeOauthToken }),
    ),
  );

const BAD_REQUEST = 400;

const issue = (
  request: Request,
  env: CredentialBrokerEnv,
): Effect.Effect<Response, never, BrokerContext> =>
  Effect.gen(function* issueToken() {
    const claims = yield* verify(request);
    const grants = yield* decodeGrants(env);
    if (!isGranted(grants)(claims)) {
      return yield* Rejected.make({ reason: `no grant for ${claims.repository}` });
    }
    const kinds = yield* selectKinds(new URL(request.url).searchParams);
    const issued = yield* issueKinds({
      kinds,
      issuers: {
        cloudflare: issueCloudflareToken(env, claims),
        github: issueGitHubToken(env, claims),
        npm: issueNpmToken(env, claims),
        atproto: issueAtproto(env, claims),
        shared: sharedKeys(env),
      },
    });
    return Response.json(issued);
  }).pipe(
    Effect.catchTags({
      Rejected: (rejected) =>
        Effect.logWarning("credential.unauthorized").pipe(
          Effect.annotateLogs({ reason: rejected.reason }),
          Effect.as(new Response("", { status: 401 })),
        ),
      UnknownKind: ({ names }) =>
        Effect.logWarning("credential.unknown_kind").pipe(
          Effect.annotateLogs({ names }),
          Effect.as(new Response("", { status: BAD_REQUEST })),
        ),
    }),
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
    onNone: () =>
      pipe(
        atprotoRoute({ request, env }),
        Option.orElse(() => accessOAuthRoute({ request, env })),
        Option.getOrElse(() => issue(request, env)),
      ),
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
          Str.startsWith(ISSUED_TOKEN_PREFIX)(token.name ?? "") &&
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
): Promise<Value> => runner(Layer.mergeAll(logger, cloudflare(env)))(effect);

const worker = {
  fetch: (request: Request, env: CredentialBrokerEnv): Promise<Response> =>
    run(env, handle(request, env)),
  scheduled: (_controller: unknown, env: CredentialBrokerEnv): Promise<void> =>
    run(env, sweep(env)),
};

export { AccessOAuth } from "./access-oauth.ts";
export { SloppediaGitHub } from "./github-token.ts";
export default worker;
