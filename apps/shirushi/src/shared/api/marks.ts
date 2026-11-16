import { Effect, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import { MARKS_PATH, MarkInputSchema, MarksSchema, SONG_PATH, SongSchema } from "#protocol";
import type { Mark, MarkInput, Song } from "#protocol";

const taggedError = Schema.TaggedError;

/** @internal */
export class ApiFailed extends taggedError<ApiFailed, { readonly brand: unique symbol }>()(
  "ApiFailed",
  { message: Schema.String },
) {}

const failed = (cause: unknown): ApiFailed => ApiFailed.make({ message: String(cause) });

const send = (
  request: HttpClientRequest.HttpClientRequest,
): Effect.Effect<
  HttpClientResponse.HttpClientResponse,
  HttpClientError.HttpClientError,
  HttpClient.HttpClient
> =>
  HttpClient.HttpClient.pipe(
    Effect.flatMap((client) =>
      HttpClient.filterStatusOk(client).execute(
        HttpClientRequest.prependUrl(request, globalThis.location.origin),
      ),
    ),
  );

/** @internal */
export const fetchMarks = (
  url: string,
): Effect.Effect<readonly Mark[], ApiFailed, HttpClient.HttpClient> =>
  HttpClientRequest.get(MARKS_PATH, { urlParams: { url } }).pipe(
    send,
    Effect.flatMap(HttpClientResponse.schemaBodyJson(MarksSchema)),
    Effect.mapError(failed),
  );

/** @internal */
export const fetchSong = (url: string): Effect.Effect<Song, ApiFailed, HttpClient.HttpClient> =>
  HttpClientRequest.get(SONG_PATH, { urlParams: { url } }).pipe(
    send,
    Effect.flatMap(HttpClientResponse.schemaBodyJson(SongSchema)),
    Effect.mapError(failed),
  );

/** @internal */
export const postMark = (input: MarkInput): Effect.Effect<void, ApiFailed, HttpClient.HttpClient> =>
  HttpClientRequest.post(MARKS_PATH).pipe(
    HttpClientRequest.schemaBodyJson(MarkInputSchema)(input),
    Effect.flatMap(send),
    Effect.asVoid,
    Effect.mapError(failed),
  );

/** @internal */
export const deleteMark = (id: string): Effect.Effect<void, ApiFailed, HttpClient.HttpClient> =>
  HttpClientRequest.delete(`${MARKS_PATH}/${encodeURIComponent(id)}`).pipe(
    send,
    Effect.asVoid,
    Effect.mapError(failed),
  );
