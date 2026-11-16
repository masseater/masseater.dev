import { MarkSchema, McpAccessSchema, SongSchema } from "@masseater.dev/shirushi-protocol";
import type { Mark, MarkInput, McpAccess, Song } from "@masseater.dev/shirushi-protocol";
import { Effect, Schema } from "effect";

import { commands } from "./generated/bindings.ts";
import type { Failure } from "./generated/bindings.ts";

const taggedError = Schema.TaggedError;

/** @internal */
export class ApiFailed extends taggedError<ApiFailed, { readonly brand: unique symbol }>()(
  "ApiFailed",
  { message: Schema.String },
) {}

type Settled<Value> =
  | Readonly<{ status: "ok"; data: Value }>
  | Readonly<{ status: "error"; error: Failure }>;

const failed = (cause: unknown): ApiFailed => ApiFailed.make({ message: String(cause) });

const call = <Value>(run: () => Promise<Settled<Value>>): Effect.Effect<Value, ApiFailed> =>
  Effect.tryPromise({ try: run, catch: failed }).pipe(
    Effect.flatMap((answer) => {
      if (answer.status === "ok") {
        return Effect.succeed(answer.data);
      }
      return Effect.fail(ApiFailed.make({ message: answer.error.message }));
    }),
  );

const decodeMarks = Schema.decodeUnknownEffect(Schema.Array(MarkSchema));

const decodeSong = Schema.decodeUnknownEffect(SongSchema);

const decodeAccess = Schema.decodeUnknownEffect(McpAccessSchema);

const malformed = (cause: unknown): Effect.Effect<never, ApiFailed> => Effect.fail(failed(cause));

/** @internal */
export const fetchMarks = (link: string): Effect.Effect<readonly Mark[], ApiFailed> =>
  call(() => commands.listMarks(link)).pipe(
    Effect.flatMap(decodeMarks),
    Effect.catchTag("SchemaError", malformed),
  );

/** @internal */
export const fetchSong = (link: string): Effect.Effect<Song, ApiFailed> =>
  call(() => commands.songAt(link)).pipe(
    Effect.flatMap(decodeSong),
    Effect.catchTag("SchemaError", malformed),
  );

/** @internal */
export const postMark = (input: MarkInput): Effect.Effect<void, ApiFailed> =>
  call(() => commands.saveMark({ ...input, aspects: [...input.aspects] })).pipe(Effect.asVoid);

/** @internal */
export const deleteMark = (id: string): Effect.Effect<void, ApiFailed> =>
  call(() => commands.removeMark(id)).pipe(Effect.asVoid);

/** @internal */
export const mcpAccess: Effect.Effect<McpAccess, ApiFailed> = Effect.suspend(() =>
  call(() => commands.mcpAccess()),
).pipe(Effect.flatMap(decodeAccess), Effect.catchTag("SchemaError", malformed));
