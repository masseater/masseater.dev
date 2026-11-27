import { Effect, Match } from "effect";

import { asOwner, asOwnerOrTokenHolder } from "#/entities/api-token/index.server.ts";
import type { Gate, Principal, Serve } from "#/entities/api-token/index.server.ts";
import { issueToken, listTokens, revokeToken } from "#/features/issue-tokens/index.server.ts";
import { importMemos } from "#/features/manage-memory/index.server.ts";
import { offset, upload } from "#/features/store-conversations/index.server.ts";
import { methodNotAllowed, storageFailed } from "#/shared/api/index.ts";

import type { WatashiServices } from "./bindings.server.ts";

const conversations = (
  request: Request,
  principal: Principal,
): Effect.Effect<Response, never, WatashiServices> =>
  Match.value(request.method).pipe(
    Match.when("GET", () => offset(request)),
    Match.when("PUT", () => upload(request, principal)),
    Match.orElse(() => Effect.succeed(methodNotAllowed())),
  );

const memories = (
  request: Request,
  principal: Principal,
): Effect.Effect<Response, never, WatashiServices> =>
  Match.value(request.method).pipe(
    Match.when("PUT", () => importMemos(request, principal)),
    Match.orElse(() => Effect.succeed(methodNotAllowed())),
  );

const tokens = (request: Request): Effect.Effect<Response, never, WatashiServices> =>
  Match.value(request.method).pipe(
    Match.when("GET", () => listTokens),
    Match.when("POST", () => issueToken(request)),
    Match.when("DELETE", () => revokeToken(request)),
    Match.orElse(() => Effect.succeed(methodNotAllowed())),
    Effect.tapError((failure) => Effect.logError("api_token.failed", failure)),
    Effect.orElseSucceed(storageFailed),
  );

/** @internal */
export const serveConversations =
  (gate: Gate<WatashiServices>): Serve =>
  (request) =>
    asOwnerOrTokenHolder<WatashiServices>(gate)({
      request,
      scope: "conversation:write",
      handle: conversations,
    });

/** @internal */
export const serveMemories =
  (gate: Gate<WatashiServices>): Serve =>
  (request) =>
    asOwnerOrTokenHolder<WatashiServices>(gate)({
      request,
      scope: "memory:write",
      handle: memories,
    });

/** @internal */
export const serveApiTokens = (gate: Gate<WatashiServices>): Serve => asOwner(gate)(tokens);
