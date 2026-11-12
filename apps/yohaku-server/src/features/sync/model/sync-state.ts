import { Effect, Option, Schema, pipe } from "effect";
import { SqlClient, SqlSchema } from "effect/sql";

const SyncKey = Schema.Literals(["client_id", "refresh_token", "cursor"]);

const selectValue = SqlSchema.findOneOption({
  Request: SyncKey,
  Result: Schema.Struct({ value: Schema.String }),
  execute: (key) =>
    SqlClient.SqlClient.pipe(
      Effect.flatMap((sql) => sql`select value from sync_state where key = ${key}`),
    ),
});

/** @internal */
const readState = Effect.fn("readState")(function* readState(key: typeof SyncKey.Type) {
  const found = yield* selectValue(key);
  return pipe(
    found,
    Option.map(({ value }) => value),
  );
});

/** @internal */
const writeState = Effect.fn("writeState")(function* writeState(
  key: typeof SyncKey.Type,
  value: string,
) {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`insert into sync_state (key, value) values (${key}, ${value})
    on conflict (key) do update set value = excluded.value`;
});

/** @internal */
const clearState = Effect.fn("clearState")(function* clearState(key: typeof SyncKey.Type) {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`delete from sync_state where key = ${key}`;
});

export { clearState, readState, writeState };
