import { Array as Arr, Duration, Effect, Record, Schema, pipe } from "effect";
import type { HttpClient, HttpClientError } from "effect/http";

import { getJson } from "./client.ts";

const ENDPOINT = "https://snapshot.search.nicovideo.jp/api/v2/snapshot/video/contents/search";
const BATCH = 100;
const CONTEXT = "nimado";
const BACKOFF_SECONDS = 10;
const MIN_PAUSE_MILLIS = 500;
const BACKOFF = Duration.seconds(BACKOFF_SECONDS);
const MIN_PAUSE = Duration.millis(MIN_PAUSE_MILLIS);
const QUERY_PARAM = "q";
const EVERYTHING = "";

const Hit = Schema.Struct({ contentId: Schema.String, viewCounter: Schema.Int });

const SearchResponse = Schema.Struct({ data: Schema.Array(Hit) });

type Failure = HttpClientError.HttpClientError | Schema.SchemaError;

const idParams = (ids: readonly string[]): Readonly<Record<string, string>> =>
  pipe(
    ids,
    Arr.map((id, index) => [`filters[contentId][${index.toString()}]`, id] as const),
    Arr.prepend([QUERY_PARAM, EVERYTHING] as const),
    Record.fromEntries,
  );

const fetchBatch = (
  ids: readonly string[],
): Effect.Effect<readonly (readonly [string, number])[], Failure, HttpClient.HttpClient> =>
  getJson({
    codec: SearchResponse,
    url: ENDPOINT,
    backoff: BACKOFF,
    params: {
      targets: "title",
      fields: "contentId,viewCounter",
      _sort: "-viewCounter",
      _limit: BATCH.toString(),
      _context: CONTEXT,
      ...idParams(ids),
    },
  }).pipe(
    Effect.timed,
    Effect.tap(([elapsed]) => Effect.sleep(Duration.max(elapsed, MIN_PAUSE))),
    Effect.map(([, body]) =>
      pipe(
        body.data,
        Arr.map(({ contentId, viewCounter }) => [contentId, viewCounter] as const),
      ),
    ),
  );

/** @internal */
const fetchNicoViews = Effect.fn("niconico.views")(function* nicoViews(ids: readonly string[]) {
  const batches = yield* pipe(Arr.chunksOf(ids, BATCH), Effect.forEach(fetchBatch));
  return Record.fromEntries(Arr.flatten(batches));
});

export { BATCH as NICO_BATCH, fetchNicoViews };
