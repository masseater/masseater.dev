import { requireMcpAuth } from "@better-auth/mcp";
import type { Run } from "@r_masseater/workers-tracing/effect";
import { Effect, Equal, Option, String as Str, pipe } from "effect";

import { FORBIDDEN, UNAUTHORIZED, storageFailed, withStatus } from "#/shared/api/index.ts";
import { createAuth } from "#/shared/auth/index.server.ts";
import type { AuthBindings } from "#/shared/auth/index.server.ts";
import { MCP_URL } from "#/shared/config/index.ts";
import type { Database } from "#/shared/db/index.server.ts";
import type { ApiToken, TokenScope } from "#/shared/db/index.ts";

import { activeTokenByHash } from "./api-token-store.server.ts";
import { hashApiToken, isApiToken } from "./api-token.ts";

export type Principal = Readonly<{ via: "oauth" | "token" }>;

export type Serve = (request: Request) => Promise<Response>;

export type Guard = (handle: Serve) => Serve;

export type Gate<Services> = Readonly<{ guard: Guard; run: Run<Services> }>;

export type Handler<Services> = (
  request: Request,
  principal: Principal,
) => Effect.Effect<Response, never, Services>;

export type Guarded<Services> = Readonly<{
  request: Request;
  scope: TokenScope;
  handle: Handler<Services>;
}>;

const BEARER_PREFIX = "Bearer ";

export const ownerGuard =
  (bindings: AuthBindings): Guard =>
  (handle) =>
    requireMcpAuth(createAuth(bindings), handle, { resource: MCP_URL });

const bearerOf = (request: Request): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(request.headers.get("authorization")),
    Option.filter(Str.startsWith(BEARER_PREFIX)),
    Option.map(Str.slice(BEARER_PREFIX.length)),
  );

export const asOwner =
  <Services>({ guard, run }: Gate<Services>) =>
  (handle: Handler<Services>): Serve =>
    guard((authorized) => run(handle(authorized, { via: "oauth" })));

const forbidden = (): Response => withStatus(FORBIDDEN)({ error: "insufficient scope" });

const invalidToken = (): Response => withStatus(UNAUTHORIZED)({ error: "invalid token" });

const withScope =
  <Services>({ request, scope, handle }: Guarded<Services>) =>
  (token: Readonly<{ scope: TokenScope }>): Effect.Effect<Response, never, Services> =>
    Option.match(Option.liftPredicate(token.scope, Equal.equals(scope)), {
      onNone: () => Effect.succeed(forbidden()),
      onSome: () => handle(request, { via: "token" }),
    });

const authorizeToken = <Services>(
  guarded: Guarded<Services>,
): ((found: Option.Option<ApiToken>) => Effect.Effect<Response, never, Services>) =>
  Option.match({
    onNone: () => Effect.succeed(invalidToken()),
    onSome: withScope(guarded),
  });

const verified =
  <Services>(guarded: Guarded<Services>) =>
  (token: string): Effect.Effect<Response, never, Database | Services> =>
    hashApiToken(token).pipe(
      Effect.flatMap(activeTokenByHash),
      Effect.flatMap(authorizeToken(guarded)),
      Effect.orElseSucceed(storageFailed),
    );

export const asOwnerOrTokenHolder =
  <Services>(gate: Gate<Database | Services>) =>
  (guarded: Guarded<Services>): Promise<Response> =>
    Option.match(Option.filter(bearerOf(guarded.request), isApiToken), {
      onNone: () => asOwner(gate)(guarded.handle)(guarded.request),
      onSome: (token) => gate.run(verified(guarded)(token)),
    });
