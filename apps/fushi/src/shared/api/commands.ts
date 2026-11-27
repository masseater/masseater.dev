import { Effect, Option, Schema } from "effect";

import { commands } from "./generated/bindings.ts";
import type { Failure } from "./generated/bindings.ts";

const taggedError = Schema.TaggedError;

export class CommandFailed extends taggedError<CommandFailed, { readonly brand: unique symbol }>()(
  "CommandFailed",
  { message: Schema.String },
  { identifier: "CommandFailed" },
) {}

type Answer<Value> =
  | Readonly<{ status: "ok"; data: Value }>
  | Readonly<{ status: "error"; error: Readonly<Failure> }>;

const answered = <Value>(answer: Answer<Value>): Effect.Effect<Value, CommandFailed> => {
  if (answer.status === "ok") {
    return Effect.succeed(answer.data);
  }
  return Effect.fail(CommandFailed.make({ message: answer.error.message }));
};

const invoked = <Value>(call: () => Promise<Answer<Value>>): Effect.Effect<Value, CommandFailed> =>
  Effect.tryPromise({
    try: call,
    catch: (cause) => CommandFailed.make({ message: String(cause) }),
  }).pipe(Effect.flatMap(answered));

/** @internal */
export const fetchLibraryText: Effect.Effect<Option.Option<string>, CommandFailed> = invoked(() =>
  commands.loadLibrary(),
).pipe(Effect.map(Option.fromNullishOr));

/** @internal */
export const saveLibraryText = (json: string): Effect.Effect<void, CommandFailed> =>
  invoked(() => commands.saveLibrary(json)).pipe(Effect.asVoid);

/** @internal */
export const fetchBaselines: Effect.Effect<readonly string[], CommandFailed> = invoked(() =>
  commands.listBaselines(),
);

/** @internal */
export const fetchBaselineText = (name: string): Effect.Effect<string, CommandFailed> =>
  invoked(() => commands.readBaseline(name));
