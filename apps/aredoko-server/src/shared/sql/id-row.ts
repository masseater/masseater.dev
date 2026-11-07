import { Array, Effect, Schema, pipe } from "effect";
import type { Cause } from "effect";

import { decodeRows } from "./decode-rows.ts";

const IdRow = Schema.Struct({ id: Schema.Int });

const decodeIds = decodeRows(IdRow);

const ids = <Failure, Requirements>(
  statement: Effect.Effect<readonly unknown[], Failure, Requirements>,
): Effect.Effect<readonly number[], Failure | Schema.SchemaError, Requirements> =>
  decodeIds(statement).pipe(Effect.map(Array.map(({ id }) => id)));

const firstId = <Failure, Requirements>(
  statement: Effect.Effect<readonly unknown[], Failure, Requirements>,
): Effect.Effect<number, Failure | Schema.SchemaError | Cause.NoSuchElementError, Requirements> =>
  pipe(
    ids(statement),
    Effect.flatMap((found) => Effect.fromOption(Array.head(found))),
  );

export { firstId, ids };
