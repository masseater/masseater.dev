import { Effect, Match } from "effect";

import { issueToken, listTokens, revokeToken } from "./api-token-api.server";
import { offset, upload } from "./conversation-upload.server";
import { methodNotAllowed, storageFailed } from "./http-json";
import { importMemos } from "./memory-api.server";
import { asOwner, asOwnerOrTokenHolder } from "./request-auth.server";
import type { Principal } from "./request-auth.server";

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

const serveConversations = (request: Request): Promise<Response> =>
  asOwnerOrTokenHolder({ request, scope: "conversation:write", handle: conversations });

const serveMemories = (request: Request): Promise<Response> =>
  asOwnerOrTokenHolder({ request, scope: "memory:write", handle: memories });

const serveApiTokens: (request: Request) => Promise<Response> = asOwner(tokens);

export { serveApiTokens, serveConversations, serveMemories };
