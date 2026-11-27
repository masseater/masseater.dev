import { eq, or } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Effect, Option } from "effect";

import { query } from "#/shared/api/index.server.ts";
import type { ToolError } from "#/shared/api/index.ts";
import type { CatalogRelations, CatalogDb } from "#/shared/db/index.server.ts";
import { person, personAlias, song, songAlias, video } from "#/shared/db/index.ts";

const UNKNOWN_URL = "urn:med-db:unknown";
const STUB_NOTE = "パートの登録で作った。元動画の URL は未確認";

type Row = Readonly<{ id: number }>;

type Lookup = Readonly<{
  find: (db: DrizzleD1Database<CatalogRelations>) => Promise<Row | undefined>;
  create: (db: DrizzleD1Database<CatalogRelations>) => Promise<Row>;
}>;

const findOrCreate = (lookup: Lookup): Effect.Effect<number, ToolError, CatalogDb> =>
  query(lookup.find).pipe(
    Effect.flatMap((found) =>
      Option.fromUndefinedOr(found).pipe(
        Option.match({ onNone: () => query(lookup.create), onSome: Effect.succeed }),
      ),
    ),
    Effect.map((row) => row.id),
  );

export const songByTitle = (title: string): Effect.Effect<number, ToolError, CatalogDb> =>
  findOrCreate({
    find: (db) =>
      db
        .select({ id: song.id })
        .from(song)
        .leftJoin(songAlias, eq(songAlias.songId, song.id))
        .where(or(eq(song.title, title), eq(songAlias.alias, title)))
        .get(),
    create: (db) => db.insert(song).values({ title }).returning({ id: song.id }).get(),
  });

export const videoByTitle = (title: string): Effect.Effect<number, ToolError, CatalogDb> =>
  findOrCreate({
    find: (db) =>
      db
        .select({ id: video.id })
        .from(video)
        .where(or(eq(video.title, title), eq(video.videoId, title)))
        .get(),
    create: (db) =>
      db
        .insert(video)
        .values({ title, url: UNKNOWN_URL, note: STUB_NOTE })
        .returning({ id: video.id })
        .get(),
  });

export const personByName = (name: string): Effect.Effect<number, ToolError, CatalogDb> =>
  findOrCreate({
    find: (db) =>
      db
        .select({ id: person.id })
        .from(person)
        .leftJoin(personAlias, eq(personAlias.personId, person.id))
        .where(or(eq(person.name, name), eq(personAlias.alias, name)))
        .get(),
    create: (db) => db.insert(person).values({ name }).returning({ id: person.id }).get(),
  });
