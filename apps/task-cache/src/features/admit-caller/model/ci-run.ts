import { OWNER_ID } from "@masseater.dev/repositories/github-oidc";
import { Effect, Option, Schema, String as Str, pipe } from "effect";

import { TokenVerifier } from "#/features/admit-caller/api/token.ts";
import { malformed } from "#/shared/lib/malformed.ts";

const DEFAULT_BRANCH = "refs/heads/main";
const PUBLIC = "public";
const NO_TOKEN = "";
const UNTRUSTED_EVENTS: ReadonlySet<string> = new Set(["pull_request_target", "workflow_run"]);

const Claims = Schema.Struct({
  repository: Schema.String,
  repository_owner_id: Schema.String,
  repository_visibility: Schema.String,
  event_name: Schema.String,
  ref: Schema.String,
});

type Claimed = typeof Claims.Type;

export interface CiRun {
  readonly publicRepository: boolean;
  readonly defaultBranch: boolean;
}

export interface Target {
  readonly audience: string;
  readonly namespace: string;
}

const bearer = (request: Request): string =>
  Str.replace(/^Bearer /u, NO_TOKEN)(request.headers.get("authorization") ?? NO_TOKEN);

const ownsNamespace = (claims: Claimed, namespace: string): boolean =>
  claims.repository_owner_id === OWNER_ID && Str.endsWith(`/${namespace}`)(claims.repository);

const runOf = (claims: Claimed): CiRun => ({
  publicRepository: claims.repository_visibility === PUBLIC,
  defaultBranch: claims.ref === DEFAULT_BRANCH && !UNTRUSTED_EVENTS.has(claims.event_name),
});

export const ciRunOf = Effect.fn("admitCaller.ciRunOf")(function* ciRunOf(
  request: Request,
  target: Target,
) {
  const verify = yield* TokenVerifier;
  const verified = yield* Effect.tryPromise({
    try: () => verify({ token: bearer(request), audience: target.audience }),
    catch: malformed,
  }).pipe(
    Effect.flatMap(({ payload }) => Schema.decodeUnknownEffect(Claims)(payload)),
    Effect.option,
  );
  return pipe(
    verified,
    Option.filter((claims) => ownsNamespace(claims, target.namespace)),
    Option.map(runOf),
  );
});
