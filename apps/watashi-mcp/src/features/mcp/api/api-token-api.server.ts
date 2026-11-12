import { TOKEN_SCOPES, TokenRequest } from "@masseater.dev/watashi-protocol";
import type { TokenFields } from "@masseater.dev/watashi-protocol";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import { hashApiToken, newApiToken } from "./api-token";
import { listApiTokens } from "./api-token-store.server";
import { createApiToken, revokeApiToken } from "./api-token-writer.server";
import { paramsOf } from "./conversation-query";
import { BAD_REQUEST, NOT_FOUND, json, withStatus } from "./http-json";
import { nowIso } from "./storage.server";

const NONE_REVOKED = 0;

const SCOPE_LIST = pipe(TOKEN_SCOPES, Arr.join("・"));

const listTokens = listApiTokens.pipe(Effect.map((rows) => json({ tokens: rows })));

const mintToken = Effect.fn("apiToken.mint")(function* mintToken(fields: TokenFields) {
  const { id, token } = newApiToken();
  const tokenHash = yield* hashApiToken(token);
  const createdAt = yield* nowIso;
  yield* createApiToken({ id, tokenHash, createdAt, ...fields });
  return { id, token, ...fields };
});

const issueToken = Effect.fn("apiToken.issue")(function* issueToken(request: Request) {
  const text = yield* Effect.promise(() => request.text());
  const decoded = Schema.decodeOption(TokenRequest)(text);
  if (Option.isNone(decoded)) {
    return withStatus(BAD_REQUEST)({ error: `scope は ${SCOPE_LIST}、label は文字列で送る` });
  }
  const issued = yield* mintToken(decoded.value);
  return json(issued);
});

const revokeToken = Effect.fn("apiToken.revoke")(function* revokeToken(request: Request) {
  const id = Option.fromNullishOr(paramsOf(request)["id"]);
  if (Option.isNone(id)) {
    return withStatus(BAD_REQUEST)({ error: "id を送る" });
  }
  const at = yield* nowIso;
  const revoked = yield* revokeApiToken({ id: id.value, at });
  return Option.match(
    Option.liftPredicate(revoked, (rows) => rows.length > NONE_REVOKED),
    {
      onNone: () => withStatus(NOT_FOUND)({ error: "not found" }),
      onSome: () => json({ revoked: id.value }),
    },
  );
});

export { issueToken, listTokens, mintToken, revokeToken };
