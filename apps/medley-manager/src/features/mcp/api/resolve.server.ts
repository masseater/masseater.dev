import { eq, or } from "drizzle-orm";
import { Effect, Option } from "effect";

import {
  catalogDb,
  person,
  personAlias,
  song,
  songAlias,
  video,
} from "#/entities/catalog/index.server";

import type { ToolError } from "./tool-error";
import { query } from "./tool-result.server";

const UNKNOWN_URL = "urn:medley-manager:unknown";
const STUB_NOTE = "パートの登録で作った。元動画の URL は未確認";

type Row = Readonly<{ id: number }>;

type Lookup = Readonly<{
  find: () => Promise<Row | undefined>;
  create: () => Promise<Row>;
}>;

const findOrCreate = (lookup: Lookup): Effect.Effect<number, ToolError> =>
  query(lookup.find).pipe(
    Effect.flatMap((found) =>
      Option.fromUndefinedOr(found).pipe(
        Option.match({ onNone: () => query(lookup.create), onSome: Effect.succeed }),
      ),
    ),
    Effect.map((row) => row.id),
  );

const songByTitle = (title: string): Effect.Effect<number, ToolError> =>
  findOrCreate({
    find: () =>
      catalogDb
        .select({ id: song.id })
        .from(song)
        .leftJoin(songAlias, eq(songAlias.songId, song.id))
        .where(or(eq(song.title, title), eq(songAlias.alias, title)))
        .get(),
    create: () => catalogDb.insert(song).values({ title }).returning({ id: song.id }).get(),
  });

const videoByTitle = (title: string): Effect.Effect<number, ToolError> =>
  findOrCreate({
    find: () =>
      catalogDb
        .select({ id: video.id })
        .from(video)
        .where(or(eq(video.title, title), eq(video.videoId, title)))
        .get(),
    create: () =>
      catalogDb
        .insert(video)
        .values({ title, url: UNKNOWN_URL, note: STUB_NOTE })
        .returning({ id: video.id })
        .get(),
  });

const personByName = (name: string): Effect.Effect<number, ToolError> =>
  findOrCreate({
    find: () =>
      catalogDb
        .select({ id: person.id })
        .from(person)
        .leftJoin(personAlias, eq(personAlias.personId, person.id))
        .where(or(eq(person.name, name), eq(personAlias.alias, name)))
        .get(),
    create: () => catalogDb.insert(person).values({ name }).returning({ id: person.id }).get(),
  });

export { personByName, songByTitle, videoByTitle };
