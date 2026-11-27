import { makeD1 } from "@masseater.dev/d1-test";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { ConversationObjects } from "#/entities/conversation/index.server.ts";
import type { ObjectStore } from "#/entities/conversation/index.server.ts";
import type { StoredObject } from "#/entities/conversation/index.test.support.ts";
import { Embedder } from "#/entities/trait/index.server.ts";
import type { Embed } from "#/entities/trait/index.test.support.ts";
import { Database, databaseOf } from "#/shared/db/index.server.ts";

const testD1 = makeD1({
  migrations: new URL("../../../drizzle/", import.meta.url).href,
  tables: [
    "life_record",
    "memory",
    "revision",
    "owner_trait",
    "owner_trait_evidence",
    "owner_trait_ja",
    "owner_trait_vector",
    "owner_profile",
    "trait_cursor",
    "conversation_chunk",
    "conversation_session",
  ],
});

export const { closeDatabase, resetDatabase } = testD1;

const DIMENSIONS = 64;

export const transcripts = new Map<string, string>();

export const embeddedTexts: string[] = [];

const gzipped = (text: string): StoredObject["body"] =>
  new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));

const FIRST = 0;

const slotsOf = (text: string): readonly number[] =>
  pipe(
    Arr.fromIterable(text),
    Arr.flatMap((char) => pipe(char, Str.codePointAt(FIRST), Option.toArray)),
    Arr.map((code) => code % DIMENSIONS),
  );

const vectorOf = (text: string): number[] => {
  const slots = slotsOf(text);
  return Arr.makeBy(
    DIMENSIONS,
    (slot) =>
      pipe(
        slots,
        Arr.filter((filled) => filled === slot),
      ).length,
  );
};

const storedAt = (key: string): StoredObject | null =>
  pipe(
    Option.fromUndefinedOr(transcripts.get(key)),
    Option.map((text) => ({ body: gzipped(text) })),
    Option.getOrNull,
  );

const objects: ObjectStore = {
  get: (key) => Promise.resolve(storedAt(key)),
  put: () => Promise.reject(new Error("the trait builder does not write objects")),
  delete: () => Promise.reject(new Error("the trait builder does not delete objects")),
};

const embed: Embed = (text) => {
  embeddedTexts.push(...text);
  return Promise.resolve({ data: pipe(text, Arr.map(vectorOf)) });
};

const drizzled = testD1.database.pipe(Effect.map(databaseOf));

export const provided = <Success, Failure, Services>(
  effect: Effect.Effect<Success, Failure, Services>,
): Effect.Effect<
  Success,
  Failure,
  Exclude<Exclude<Exclude<Services, Database>, Embedder>, ConversationObjects>
> =>
  effect.pipe(
    Effect.provideServiceEffect(Database, drizzled),
    Effect.provideService(Embedder, embed),
    Effect.provideService(ConversationObjects, objects),
  );

export const sql = (statement: string): Effect.Effect<unknown> =>
  testD1.database.pipe(
    Effect.flatMap((database) => Effect.promise(() => database.prepare(statement).run())),
  );
