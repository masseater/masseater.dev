import { inArray } from "drizzle-orm";
import { Array as Arr, Effect, pipe } from "effect";

import type { VideoKind } from "#/entities/catalog/lib/video-kind";
import { part } from "#/entities/catalog/model/part.table";

import { catalogDb } from "./db.server";

type QuotePair = readonly [videoId: number, source: number];

type QuoteRow = Readonly<{ videoId: number; refVideoId: number | null }>;

type Expansion = Readonly<{
  sources: readonly number[];
  frontier: readonly QuotePair[];
  reached: readonly QuotePair[];
  depth: number;
}>;

type VideoSummary = Readonly<{
  id: number;
  title: string;
  kind: VideoKind;
  thumbnailUrl: string | null;
}>;

const D1_MAX_PARAMS = 90;
const MAX_QUOTE_DEPTH = 10;
const FIRST_DEPTH = 1;
const NO_VIDEO = -1;
const NO_SOURCES: readonly number[] = [];

const quotingRows = (videoIds: readonly number[]): Effect.Effect<readonly QuoteRow[]> =>
  Effect.forEach(
    Arr.chunksOf(Arr.dedupe(videoIds), D1_MAX_PARAMS),
    (chunk) =>
      Effect.promise(() =>
        catalogDb
          .selectDistinct({ videoId: part.videoId, refVideoId: part.refVideoId })
          .from(part)
          .where(inArray(part.refVideoId, [...chunk])),
      ),
    { concurrency: "unbounded" },
  ).pipe(Effect.map(Arr.flatten), Effect.withSpan("catalog.quotes.step"));

const pairKey = ([videoId, source]: QuotePair): string =>
  `${videoId.toString()}:${source.toString()}`;

const sourcesByVideo = (pairs: readonly QuotePair[]): ReadonlyMap<number, readonly number[]> => {
  const grouped = new Map<number, number[]>();
  for (const [videoId, source] of pairs) {
    grouped.set(videoId, [...(grouped.get(videoId) ?? NO_SOURCES), source]);
  }
  return grouped;
};

const nextFrontier = (state: Expansion, rows: readonly QuoteRow[]): readonly QuotePair[] => {
  const frontier = sourcesByVideo(state.frontier);
  const known = new Set(pipe(state.reached, Arr.map(pairKey)));
  const sources = new Set(state.sources);
  const candidates = pipe(
    rows,
    Arr.filter((row) => !sources.has(row.videoId)),
    Arr.flatMap((row) =>
      pipe(
        frontier.get(row.refVideoId ?? NO_VIDEO) ?? NO_SOURCES,
        Arr.map((source): QuotePair => [row.videoId, source]),
      ),
    ),
  );
  return Arr.dedupeWith(
    pipe(
      candidates,
      Arr.filter((pair) => !known.has(pairKey(pair))),
    ),
    (left, right) => pairKey(left) === pairKey(right),
  );
};

const expand = (state: Expansion): Effect.Effect<readonly QuotePair[]> => {
  if (Arr.isReadonlyArrayEmpty(state.frontier) || state.depth > MAX_QUOTE_DEPTH) {
    return Effect.succeed(state.reached);
  }
  return quotingRows(
    pipe(
      state.frontier,
      Arr.map(([videoId]) => videoId),
    ),
  ).pipe(
    Effect.map((rows) => nextFrontier(state, rows)),
    Effect.flatMap((frontier) =>
      expand({
        sources: state.sources,
        frontier,
        reached: [...state.reached, ...frontier],
        depth: state.depth + FIRST_DEPTH,
      }),
    ),
  );
};

const quoteReach = (sources: readonly number[]): Effect.Effect<readonly QuotePair[]> =>
  expand({
    sources,
    frontier: pipe(
      sources,
      Arr.map((id): QuotePair => [id, id]),
    ),
    reached: [],
    depth: FIRST_DEPTH,
  }).pipe(Effect.withSpan("catalog.quotes"));

const videoSummaries = (
  videoIds: readonly number[],
): Effect.Effect<ReadonlyMap<number, VideoSummary>> =>
  Effect.forEach(
    Arr.chunksOf(Arr.dedupe(videoIds), D1_MAX_PARAMS),
    (chunk) =>
      Effect.promise(() =>
        catalogDb.query.video.findMany({
          columns: { id: true, title: true, kind: true, thumbnailUrl: true },
          where: { id: { in: [...chunk] } },
        }),
      ),
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map(
      (chunks) =>
        new Map(
          pipe(
            Arr.flatten(chunks),
            Arr.map((row) => [row.id, row]),
          ),
        ),
    ),
    Effect.withSpan("catalog.quotes.titles"),
  );

export type { QuotePair, VideoSummary };
export { quoteReach, sourcesByVideo, videoSummaries };
