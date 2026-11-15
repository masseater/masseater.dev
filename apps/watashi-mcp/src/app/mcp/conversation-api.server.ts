import { Effect, Match } from "effect";

import { asOwner, asOwnerOrTokenHolder } from "#/entities/api-token/index.server";
import type { Principal } from "#/entities/api-token/index.server";
import { offset, upload } from "#/features/conversation-tools/index.server";
import { importMemos } from "#/features/memory-tools/index.server";
import { issueToken, listTokens, revokeToken } from "#/features/token-tools/index.server";
import { methodNotAllowed, storageFailed } from "#/shared/api";

const conversations = (request: Request, principal: Principal): Effect.Effect<Response> =>
  Match.value(request.method).pipe(
    Match.when("GET", () => offset(request)),
    Match.when("PUT", () => upload(request, principal)),
    Match.orElse(() => Effect.succeed(methodNotAllowed())),
  );

const memories = (request: Request, principal: Principal): Effect.Effect<Response> =>
  Match.value(request.method).pipe(
    Match.when("PUT", () => importMemos(request, principal)),
    Match.orElse(() => Effect.succeed(methodNotAllowed())),
  );

const tokens = (request: Request): Effect.Effect<Response> =>
  Match.value(request.method).pipe(
    Match.when("GET", () => listTokens),
    Match.when("POST", () => issueToken(request)),
    Match.when("DELETE", () => revokeToken(request)),
    Match.orElse(() => Effect.succeed(methodNotAllowed())),
    Effect.tapError((failure) => Effect.logError("api_token.failed", failure)),
    Effect.orElseSucceed(storageFailed),
  );

export const serveConversations = (request: Request): Promise<Response> =>
  asOwnerOrTokenHolder({ request, scope: "conversation:write", handle: conversations });

export const serveMemories = (request: Request): Promise<Response> =>
  asOwnerOrTokenHolder({ request, scope: "memory:write", handle: memories });

export const serveApiTokens: (request: Request) => Promise<Response> = asOwner(tokens);
