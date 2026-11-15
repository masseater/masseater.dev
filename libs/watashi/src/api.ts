import {
  CONVERSATIONS_PATH,
  ChunkQuery,
  Committed,
  Conflict,
  FileQuery,
  IssuedToken,
  Revoked,
  TOKENS_PATH,
  TokenBody,
  TokenList,
} from "@masseater.dev/watashi-protocol";
import type { ChunkParams, FileParams, TokenFields } from "@masseater.dev/watashi-protocol";
import { Context, Effect, Redacted, Schedule, Schema } from "effect";
import type { Duration } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import type { JsonError } from "./errors.ts";
import { okBody } from "./http-json.ts";

/** @internal */
export type Upload =
  | Readonly<{ status: "ok"; committed: number }>
  | Readonly<{ status: "conflict"; expected: number }>;

/** @internal */
export type Target = Readonly<{ url: string; authorization: Redacted.Redacted }>;

const RETRIES = 3;
const CONFLICT = 409;

/** @internal */
export const RetryDelay = Context.Reference<Duration.Input>("watashi/RetryDelay", {
  defaultValue: () => "1 second",
});

const watashiClient = (
  target: Target,
): Effect.Effect<HttpClient.HttpClient, never, HttpClient.HttpClient> =>
  Effect.gen(function* client() {
    const base = yield* HttpClient.HttpClient;
    const delay = yield* RetryDelay;
    const token = Redacted.value(target.authorization);
    return base.pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl(target.url)),
      HttpClient.mapRequest(HttpClientRequest.bearerToken(token)),
      HttpClient.retryTransient({
        retryOn: "errors-and-responses",
        schedule: Schedule.exponential(delay),
        times: RETRIES,
      }),
    );
  });

/** @internal */
export const asWatashi =
  (target: Target) =>
  <Value, Failure, Requirement>(
    effect: Effect.Effect<Value, Failure, Requirement>,
  ): Effect.Effect<Value, Failure, Requirement | HttpClient.HttpClient> =>
    watashiClient(target).pipe(
      Effect.flatMap((client) => Effect.provideService(effect, HttpClient.HttpClient, client)),
    );

/** @internal */
export const committedOffset = (
  key: FileParams,
): Effect.Effect<number, JsonError, HttpClient.HttpClient> =>
  Schema.encodeEffect(FileQuery)(key).pipe(
    Effect.map((urlParams) => HttpClientRequest.get(CONVERSATIONS_PATH, { urlParams })),
    Effect.flatMap(HttpClient.execute),
    Effect.flatMap(okBody({ schema: Committed, url: CONVERSATIONS_PATH })),
    Effect.map(({ committed }) => committed),
  );

const uploaded = (
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<Upload, JsonError> => {
  if (response.status === CONFLICT) {
    return HttpClientResponse.schemaBodyJson(Conflict)(response).pipe(
      Effect.map(({ expected }): Upload => ({ status: "conflict", expected })),
    );
  }
  return okBody({ schema: Committed, url: CONVERSATIONS_PATH })(response).pipe(
    Effect.map(({ committed }): Upload => ({ status: "ok", committed })),
  );
};

/** @internal */
export const uploadChunk = (
  upload: Readonly<{ params: ChunkParams; body: Uint8Array }>,
): Effect.Effect<Upload, JsonError, HttpClient.HttpClient> =>
  Schema.encodeEffect(ChunkQuery)(upload.params).pipe(
    Effect.map((urlParams) =>
      HttpClientRequest.put(CONVERSATIONS_PATH, { urlParams }).pipe(
        HttpClientRequest.bodyUint8Array(upload.body, "application/gzip"),
      ),
    ),
    Effect.flatMap(HttpClient.execute),
    Effect.flatMap(uploaded),
  );

/** @internal */
export const issueToken = (
  fields: TokenFields,
): Effect.Effect<typeof IssuedToken.Type, JsonError, HttpClient.HttpClient> =>
  HttpClientRequest.post(TOKENS_PATH).pipe(
    HttpClientRequest.schemaBodyJson(TokenBody)(fields),
    Effect.flatMap(HttpClient.execute),
    Effect.flatMap(okBody({ schema: IssuedToken, url: TOKENS_PATH })),
  );

/** @internal */
export const listTokens: Effect.Effect<typeof TokenList.Type, JsonError, HttpClient.HttpClient> =
  HttpClient.get(TOKENS_PATH).pipe(Effect.flatMap(okBody({ schema: TokenList, url: TOKENS_PATH })));

/** @internal */
export const revokeToken = (
  id: string,
): Effect.Effect<typeof Revoked.Type, JsonError, HttpClient.HttpClient> =>
  HttpClient.execute(HttpClientRequest.delete(TOKENS_PATH, { urlParams: { id } })).pipe(
    Effect.flatMap(okBody({ schema: Revoked, url: TOKENS_PATH })),
  );
