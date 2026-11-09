import { Array as Arr, Duration, Effect, Option, Record, Redacted, Schema, pipe } from "effect";
import type { HttpClient, HttpClientError } from "effect/http";

import { getJson } from "./client.ts";

const ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
const BATCH = 50;
const BACKOFF_SECONDS = 5;
const BACKOFF = Duration.seconds(BACKOFF_SECONDS);

const Statistics = Schema.Struct({ viewCount: Schema.optionalKey(Schema.FiniteFromString) });

const Item = Schema.Struct({ id: Schema.String, statistics: Schema.optionalKey(Statistics) });

const VideosResponse = Schema.Struct({ items: Schema.optionalKey(Schema.Array(Item)) });

type ItemValue = typeof Item.Type;
type Failure = HttpClientError.HttpClientError | Schema.SchemaError;

const countOf = ({ id, statistics }: ItemValue): readonly (readonly [string, number])[] =>
  pipe(
    Option.fromNullishOr(statistics),
    Option.flatMap(({ viewCount }) => Option.fromNullishOr(viewCount)),
    Option.map((views) => [id, views] as const),
    Option.toArray,
  );

const fetchBatch =
  (key: Redacted.Redacted) =>
  (
    ids: readonly string[],
  ): Effect.Effect<readonly (readonly [string, number])[], Failure, HttpClient.HttpClient> =>
    getJson({
      codec: VideosResponse,
      url: ENDPOINT,
      backoff: BACKOFF,
      params: {
        part: "statistics",
        id: Arr.join(ids, ","),
        fields: "items(id,statistics(viewCount))",
        key: Redacted.value(key),
      },
    }).pipe(Effect.map(({ items }) => pipe(items ?? [], Arr.flatMap(countOf))));

/** @internal */
const fetchYoutubeViews = Effect.fn("youtube.views")(function* youtubeViews({
  key,
  ids,
}: Readonly<{ key: Redacted.Redacted; ids: readonly string[] }>) {
  const batches = yield* pipe(Arr.chunksOf(ids, BATCH), Effect.forEach(fetchBatch(key)));
  return Record.fromEntries(Arr.flatten(batches));
});

export { BATCH as YOUTUBE_BATCH, fetchYoutubeViews };
