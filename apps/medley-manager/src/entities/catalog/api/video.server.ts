import { Array as Arr, Effect, Number, Option, Order, pipe, String as Str, Struct } from "effect";

import { catalogDb } from "./db.server";

const VIDEO_COLUMNS = {
  id: true,
  title: true,
  kind: true,
  videoId: true,
  url: true,
  uploader: true,
  publishedAt: true,
  thumbnailUrl: true,
  note: true,
  comment: true,
} as const;

const byTitle = Order.make<Readonly<{ title: string }>>((left, right) =>
  Number.sign(pipe(left.title, Str.localeCompare(right.title))),
);

const getVideo = Effect.fn("catalog.video")(function* getVideo(id: number) {
  const promiseResult = yield* Effect.promise(() =>
    catalogDb.query.video.findFirst({
      columns: VIDEO_COLUMNS,
      with: {
        parts: {
          columns: {
            id: true,
            position: true,
            label: true,
            bpm: true,
            bars: true,
            startSec: true,
            note: true,
            comment: true,
          },
          with: {
            song: { columns: { id: true, title: true } },
            refVideo: { columns: { id: true, title: true } },
            staff: {
              columns: { role: true },
              with: { person: { columns: { id: true, name: true } } },
            },
          },
          orderBy: { position: "asc" },
        },
        quotedBy: {
          columns: { id: true },
          with: { video: { columns: { id: true, title: true, kind: true, thumbnailUrl: true } } },
        },
      },
      where: { id },
    }),
  );
  const found = Option.fromUndefinedOr(promiseResult);
  return found.pipe(
    Option.map(
      Struct.evolve({
        quotedBy: (quotes) =>
          pipe(
            quotes,
            Arr.map((quote) => quote.video),
            Arr.dedupeWith((left, right) => left.id === right.id),
            (videos) => Arr.sort(videos, byTitle),
          ),
      }),
    ),
  );
});

export { getVideo };
