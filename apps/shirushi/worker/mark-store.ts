import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import { AspectSchema, MarkSchema } from "#protocol";
import type { Mark, Source } from "#protocol";

import { marks } from "./marks.table.ts";
import { StoreFailed } from "./store-failed.ts";

type Row = typeof marks.$inferSelect;

const failed = (cause: unknown): StoreFailed => StoreFailed.make({ message: String(cause) });

const db = drizzle(env.MARKS);

const AspectsJson = Schema.fromJsonString(Schema.Array(AspectSchema));

const encodeAspects = Schema.encodeEffect(AspectsJson);

const decodeAspects = Schema.decodeUnknownEffect(AspectsJson);

const decodeMark = Schema.decodeUnknownEffect(MarkSchema);

const markOf = (row: Row): Effect.Effect<Mark, Schema.SchemaError> =>
  decodeAspects(row.aspects).pipe(
    Effect.flatMap((aspects) =>
      decodeMark({
        id: row.id,
        song: {
          source: { site: row.site, id: row.sourceId },
          title: row.title,
          artist: row.artist,
        },
        from: row.fromSeconds,
        to: row.toSeconds,
        verb: row.verb,
        aspects,
        words: row.words,
        at: row.createdAt,
      }),
    ),
  );

const selected = (source: Option.Option<Source>): Promise<Row[]> => {
  const all = db.select().from(marks);
  return Option.match(source, {
    onNone: () => all.orderBy(desc(marks.createdAt)),
    onSome: ({ site, id }) =>
      all.where(and(eq(marks.site, site), eq(marks.sourceId, id))).orderBy(desc(marks.createdAt)),
  });
};

export const listMarks = (
  source: Option.Option<Source>,
): Effect.Effect<readonly Mark[], StoreFailed> =>
  Effect.tryPromise({ try: () => selected(source), catch: failed }).pipe(
    Effect.flatMap((rows) => pipe(rows, Effect.forEach(markOf), Effect.mapError(failed))),
  );

const inserted =
  (mark: Mark) =>
  (aspects: string): Effect.Effect<unknown, StoreFailed> =>
    Effect.tryPromise({
      try: () =>
        db.insert(marks).values({
          id: mark.id,
          site: mark.song.source.site,
          sourceId: mark.song.source.id,
          title: mark.song.title,
          artist: mark.song.artist,
          fromSeconds: mark.from,
          toSeconds: mark.to,
          verb: mark.verb,
          aspects,
          words: mark.words,
          createdAt: mark.at,
        }),
      catch: failed,
    });

export const storeMark = (mark: Mark): Effect.Effect<void, StoreFailed> =>
  encodeAspects(mark.aspects).pipe(
    Effect.mapError(failed),
    Effect.flatMap(inserted(mark)),
    Effect.asVoid,
  );

export const removeMark = (id: string): Effect.Effect<boolean, StoreFailed> =>
  Effect.tryPromise({
    try: () => db.delete(marks).where(eq(marks.id, id)).returning({ id: marks.id }),
    catch: failed,
  }).pipe(Effect.map(Arr.isReadonlyArrayNonEmpty));
