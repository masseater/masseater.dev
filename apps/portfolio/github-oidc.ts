import { Array as Arr, Effect, Record, Schema, String as Str } from "effect";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { CREDENTIAL_BROKER_AUDIENCE } from "./app-name.ts";

const ISSUER = "https://token.actions.githubusercontent.com";
const OWNER = "masseater";
const OWNER_ID = "62135405";
const UNTRUSTED_EVENTS: ReadonlySet<string> = new Set(["pull_request_target", "workflow_run"]);
const DEFAULT_BRANCH = "refs/heads/main";

const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

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

export { Claims, OWNER, OWNER_ID, Rejected, repositoryName, verify };
