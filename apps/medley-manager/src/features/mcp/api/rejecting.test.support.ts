import { Effect } from "effect";

import { env } from "./d1.test.support";

type Rejection = Readonly<{ event: "DELETE" | "INSERT" | "UPDATE"; table: string }>;

const TRIGGER = "reject_write_in_test";

const startRejecting = ({ event, table }: Rejection): Effect.Effect<unknown> =>
  Effect.promise(() =>
    env.DB.prepare(
      `CREATE TRIGGER ${TRIGGER} BEFORE ${event} ON ${table} BEGIN SELECT RAISE(ABORT, 'rejected in test'); END`,
    ).run(),
  );

const stopRejecting = Effect.promise(() =>
  env.DB.prepare(`DROP TRIGGER IF EXISTS ${TRIGGER}`).run(),
);

const whileRejecting =
  (rejection: Rejection) =>
  <Value, Failure>(write: Effect.Effect<Value, Failure>): Effect.Effect<Value, Failure> =>
    Effect.acquireUseRelease(
      startRejecting(rejection),
      () => write,
      () => stopRejecting,
    );

export { whileRejecting };
