import type { Schema } from "effect";
import { Effect } from "effect";

import { ApiFailed } from "./media.ts";

export type Settled<Value> =
  | Readonly<{ status: "ok"; data: Value }>
  | Readonly<{ status: "error"; error: Readonly<{ message: string }> }>;

const thrown = (cause: unknown): ApiFailed => ApiFailed.make({ message: String(cause) });

export const settled = <Value>(
  run: () => Promise<Settled<Value>>,
): Effect.Effect<Value, ApiFailed> =>
  Effect.tryPromise({ try: run, catch: thrown }).pipe(
    Effect.flatMap((answer) => {
      if (answer.status === "ok") {
        return Effect.succeed(answer.data);
      }
      return Effect.fail(ApiFailed.make({ message: answer.error.message }));
    }),
  );

export type Decode<Value> = (input: unknown) => Effect.Effect<Value, Schema.SchemaError>;

export const settledAs =
  <Value>(decode: Decode<Value>) =>
  (run: () => Promise<Settled<unknown>>): Effect.Effect<Value, ApiFailed> =>
    Effect.suspend(() => settled(run)).pipe(
      Effect.flatMap(decode),
      Effect.catchTag("SchemaError", (cause) => Effect.fail(thrown(cause))),
    );
