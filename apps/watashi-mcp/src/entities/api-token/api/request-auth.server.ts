import { requireMcpAuth } from "@better-auth/mcp";
import { runner } from "@r_masseater/workers-tracing/effect";
import { Effect, Equal, Layer, Option, String as Str, pipe } from "effect";

import { FORBIDDEN, UNAUTHORIZED, storageFailed, withStatus } from "#/shared/api/index.ts";
import { createAuth } from "#/shared/auth/index.server.ts";
import { MCP_URL } from "#/shared/config/index.ts";
import type { ApiToken, TokenScope } from "#/shared/db/index.ts";

import { hashApiToken, isApiToken } from "./api-token";
import { activeTokenByHash } from "./api-token-store.server.ts";

export type Principal = Readonly<{ via: "oauth" | "token" }>;

export type Handler = (request: Request, principal: Principal) => Effect.Effect<Response>;

export type Guarded = Readonly<{ request: Request; scope: TokenScope; handle: Handler }>;

const BEARER_PREFIX = "Bearer ";

const run = runner(Layer.empty);

const bearerOf = (request: Request): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(request.headers.get("authorization")),
    Option.filter(Str.startsWith(BEARER_PREFIX)),
    Option.map(Str.slice(BEARER_PREFIX.length)),
  );

export const asOwner =
  (handle: Handler) =>
  (request: Request): Promise<Response> =>
    requireMcpAuth(createAuth(), (authorized) => run(handle(authorized, { via: "oauth" })), {
      resource: MCP_URL,
    })(request);

const forbidden = (): Response => withStatus(FORBIDDEN)({ error: "insufficient scope" });

const invalidToken = (): Response => withStatus(UNAUTHORIZED)({ error: "invalid token" });

const withScope =
  ({ request, scope, handle }: Guarded) =>
  (token: Readonly<{ scope: TokenScope }>): Effect.Effect<Response> =>
    Option.match(Option.liftPredicate(token.scope, Equal.equals(scope)), {
      onNone: () => Effect.succeed(forbidden()),
      onSome: () => handle(request, { via: "token" }),
    });

const authorizeToken = (
  guarded: Guarded,
): ((found: Option.Option<ApiToken>) => Effect.Effect<Response>) =>
  Option.match({
    onNone: () => Effect.succeed(invalidToken()),
    onSome: withScope(guarded),
  });

const verified =
  (guarded: Guarded) =>
  (token: string): Effect.Effect<Response> =>
    hashApiToken(token).pipe(
      Effect.flatMap(activeTokenByHash),
      Effect.flatMap(authorizeToken(guarded)),
      Effect.orElseSucceed(storageFailed),
    );

const asTokenHolder =
  (guarded: Guarded) =>
  (token: string): Promise<Response> =>
    run(verified(guarded)(token));

export const asOwnerOrTokenHolder = (guarded: Guarded): Promise<Response> =>
  Option.match(Option.filter(bearerOf(guarded.request), isApiToken), {
    onNone: () => asOwner(guarded.handle)(guarded.request),
    onSome: asTokenHolder(guarded),
  });
