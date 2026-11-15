import { Array as Arr, Effect, Option, Record, Schema, String as Str, pipe } from "effect";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { CREDENTIAL_BROKER_AUDIENCE } from "#/shared/config/index.ts";

const ISSUER = "https://token.actions.githubusercontent.com";
export const OWNER = "masseater";
export const OWNER_ID = "62135405";
const UNTRUSTED_EVENTS: ReadonlySet<string> = new Set(["pull_request_target", "workflow_run"]);
const DEFAULT_BRANCH = "refs/heads/main";

const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

export const Claims = Schema.Struct({
  repository_owner: Schema.String,
  repository_owner_id: Schema.String,
  repository: Schema.String,
  repository_id: Schema.String,
  event_name: Schema.String,
  ref: Schema.String,
  run_id: Schema.String,
  run_attempt: Schema.String,
  workflow_ref: Schema.String,
  environment: Schema.optionalKey(Schema.String),
});

const taggedError = Schema.TaggedError;

export class Rejected extends taggedError<Rejected, { readonly brand: unique symbol }>()(
  "Rejected",
  {
    reason: Schema.String,
  },
) {}

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

export const verify = (
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

export const repositoryName = (claims: typeof Claims.Type): string =>
  Str.replace(`${OWNER}/`, "")(claims.repository);

export const grantKeys = (claims: typeof Claims.Type): readonly string[] =>
  Arr.flatMap([repositoryName(claims), claims.repository_id], (repository) =>
    pipe(
      Option.fromNullishOr(claims.environment),
      Option.map((environment) => [`${repository}/${environment}`, repository]),
      Option.getOrElse(() => [repository]),
    ),
  );

const WORKFLOWS_DIRECTORY = "/.github/workflows/";

export const workflowFile = (claims: typeof Claims.Type): Option.Option<string> =>
  pipe(
    Str.split("@")(claims.workflow_ref),
    Arr.head,
    Option.filter(Str.includes(WORKFLOWS_DIRECTORY)),
    Option.map(Str.split("/")),
    Option.flatMap(Arr.last),
  );

export const workflowGrant =
  (workflows: Readonly<Record<string, Readonly<Record<string, string>>>>) =>
  (
    claims: typeof Claims.Type,
  ): Option.Option<
    Readonly<{
      permissions: Readonly<Record<string, string>>;
      repositories: string[];
    }>
  > =>
    pipe(
      workflowFile(claims),
      Option.flatMap((file) => Option.fromNullishOr(workflows[file])),
      Option.map((permissions) => ({ permissions, repositories: [repositoryName(claims)] })),
    );

export const isGranted =
  (
    grants: Readonly<{
      repositories: Readonly<Record<string, string>>;
      github: Readonly<Record<string, unknown>>;
      workflows: Readonly<Record<string, Readonly<Record<string, string>>>>;
      npm: readonly string[];
    }>,
  ) =>
  (claims: typeof Claims.Type): boolean =>
    Arr.some(
      grantKeys(claims),
      (key) =>
        Record.has(grants.repositories, key) ||
        Record.has(grants.github, key) ||
        Arr.contains(grants.npm, key),
    ) || Option.isSome(workflowGrant(grants.workflows)(claims));
