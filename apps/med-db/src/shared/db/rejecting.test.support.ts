import { Effect } from "effect";

import { database } from "./d1.test.support.ts";

const TRIGGER = "reject_write_in_test";

const startRejecting = (event: string, table: string): Effect.Effect<unknown> =>
  database.pipe(
    Effect.flatMap((db) =>
      Effect.promise(() =>
        db
          .prepare(
            `CREATE TRIGGER ${TRIGGER} BEFORE ${event} ON ${table} BEGIN SELECT RAISE(ABORT, 'rejected in test'); END`,
          )
          .run(),
      ),
    ),
  );

const stopRejecting = database.pipe(
  Effect.flatMap((db) =>
    Effect.promise(() => db.prepare(`DROP TRIGGER IF EXISTS ${TRIGGER}`).run()),
  ),
);

export const whileRejecting =
  ({ event, table }: Readonly<{ event: "DELETE" | "INSERT"; table: string }>) =>
  <Value, Failure, Services>(
    write: Effect.Effect<Value, Failure, Services>,
  ): Effect.Effect<Value, Failure, Services> =>
    Effect.acquireUseRelease(
      startRejecting(event, table),
      () => write,
      () => stopRejecting,
    );
