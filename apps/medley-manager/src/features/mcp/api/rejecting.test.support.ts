import { Effect } from "effect";

import { env } from "./d1.test.support";

const TRIGGER = "reject_write_in_test";

const startRejecting = (event: string, table: string): Effect.Effect<unknown> =>
  Effect.promise(() =>
    env.DB.prepare(
      `CREATE TRIGGER ${TRIGGER} BEFORE ${event} ON ${table} BEGIN SELECT RAISE(ABORT, 'rejected in test'); END`,
    ).run(),
  );

const stopRejecting = Effect.promise(() =>
  env.DB.prepare(`DROP TRIGGER IF EXISTS ${TRIGGER}`).run(),
);

const whileRejecting =
  ({ event, table }: Readonly<{ event: "DELETE" | "INSERT"; table: string }>) =>
  <Value, Failure>(write: Effect.Effect<Value, Failure>): Effect.Effect<Value, Failure> =>
    Effect.acquireUseRelease(
      startRejecting(event, table),
      () => write,
      () => stopRejecting,
    );

export { whileRejecting };
