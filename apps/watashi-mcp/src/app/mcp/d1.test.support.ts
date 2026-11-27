import { makeD1 } from "@masseater.dev/d1-test";
import { Effect } from "effect";

import { Embedder } from "#/entities/trait/index.server.ts";
import { Database, databaseOf } from "#/shared/db/index.server.ts";

const testD1 = makeD1({
  migrations: new URL("../../../drizzle/", import.meta.url).href,
  tables: [
    "life_record",
    "memory",
    "revision",
    "owner_trait",
    "owner_trait_evidence",
    "trait_cursor",
  ],
});

export const { closeDatabase, resetDatabase } = testD1;

const drizzled = testD1.database.pipe(Effect.map(databaseOf));

const unusedEmbedder = (): Promise<never> => Promise.reject(new Error("these tests do not embed"));

export const provided = <Success, Failure, Services>(
  effect: Effect.Effect<Success, Failure, Services>,
): Effect.Effect<Success, Failure, Exclude<Exclude<Services, Database>, Embedder>> =>
  effect.pipe(
    Effect.provideServiceEffect(Database, drizzled),
    Effect.provideService(Embedder, unusedEmbedder),
  );

export const sql = (statement: string): Effect.Effect<unknown> =>
  testD1.database.pipe(
    Effect.flatMap((database) => Effect.promise(() => database.prepare(statement).run())),
  );
