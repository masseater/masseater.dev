import { Array as Arr, Effect, Number, Option, Order, pipe, Record, String as Str } from "effect";

import { catalogDb } from "./db.server";
import { quoteReach, sourcesByVideo, videoSummaries } from "./quote-reach.server";
import type { QuotePair, VideoSummary } from "./quote-reach.server";

const findSong = Effect.fn("catalog.song.find")(function* findSong(id: number) {
  const found = yield* Effect.promise(() =>
    catalogDb.query.song.findFirst({
      columns: { id: true, title: true, artist: true, url: true, genre: true, note: true },
      with: {
        aliases: { columns: { alias: true } },
        parts: {
          columns: { id: true, position: true, startSec: true },
          with: { video: { columns: { id: true, title: true, kind: true, thumbnailUrl: true } } },
          orderBy: { position: "asc" },
        },
      },
      where: { id },
    }),
  );
  return Option.fromUndefinedOr(found);
});

type FoundSong =
  Effect.Success<ReturnType<typeof findSong>> extends Option.Option<infer Song> ? Song : never;

type UsedPart = FoundSong["parts"][number];

type DirectUse = VideoSummary & Readonly<{ parts: readonly UsedPart[] }>;

type IndirectUse = VideoSummary & Readonly<{ via: readonly VideoSummary[] }>;

const byTitle = Order.make<VideoSummary>((left, right) =>
  Number.sign(pipe(left.title, Str.localeCompare(right.title))),
);

const byVideo = (parts: readonly UsedPart[]): readonly DirectUse[] =>
  pipe(
    Record.values(Arr.groupBy(parts, (used) => used.video.id.toString())),
    Arr.map((uses): DirectUse => {
      const { video } = Arr.headNonEmpty(uses);
      return {
        id: video.id,
        title: video.title,
        kind: video.kind,
        thumbnailUrl: video.thumbnailUrl,
        parts: uses,
      };
    }),
    (uses) => Arr.sort(uses, byTitle),
  );

const indirectUsage = (reach: readonly QuotePair[]): Effect.Effect<readonly IndirectUse[]> =>
  videoSummaries(reach.flat()).pipe(
    Effect.map((summaries) => {
      const summaryOf = (videoId: number): readonly VideoSummary[] =>
        Option.toArray(Option.fromUndefinedOr(summaries.get(videoId)));
      return pipe(
        [...sourcesByVideo(reach)],
        Arr.flatMap(([videoId, sources]) =>
          pipe(
            summaryOf(videoId),
            Arr.map((quoting): IndirectUse => ({
              id: quoting.id,
              title: quoting.title,
              kind: quoting.kind,
              thumbnailUrl: quoting.thumbnailUrl,
              via: pipe(sources, Arr.flatMap(summaryOf)),
            })),
          ),
        ),
        (uses) => Arr.sort(uses, byTitle),
      );
    }),
  );

const getSong = Effect.fn("catalog.song")(function* getSong(id: number) {
  const found = yield* findSong(id);
  if (Option.isNone(found)) {
    return Option.none();
  }
  const song = found.value;
  const direct = byVideo(song.parts);
  const indirect = yield* quoteReach(
    pipe(
      direct,
      Arr.map((use) => use.id),
    ),
  ).pipe(Effect.flatMap(indirectUsage));
  return Option.some({
    id: song.id,
    title: song.title,
    artist: song.artist,
    url: song.url,
    genre: song.genre,
    note: song.note,
    aliases: pipe(
      song.aliases,
      Arr.map(({ alias }) => alias),
    ),
    direct,
    indirect,
  });
});

export { getSong };
