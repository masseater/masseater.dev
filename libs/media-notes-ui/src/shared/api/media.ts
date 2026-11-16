import { McpAccessSchema, OpenedSchema } from "@masseater.dev/media-notes-protocol";
import type { McpAccess, Opened } from "@masseater.dev/media-notes-protocol";
import { invoke } from "@tauri-apps/api/core";
import { Effect, Option, Schema } from "effect";

const taggedError = Schema.TaggedError;

export class ApiFailed extends taggedError<ApiFailed, { readonly brand: unique symbol }>()(
  "ApiFailed",
  { message: Schema.String },
) {}

const RefusalSchema = Schema.Struct({ message: Schema.String });

const failed = (cause: unknown): ApiFailed =>
  ApiFailed.make({
    message: Option.match(Schema.decodeUnknownOption(RefusalSchema)(cause), {
      onNone: () => String(cause),
      onSome: ({ message }) => message,
    }),
  });

type Decode<Value> = (input: unknown) => Effect.Effect<Value, Schema.SchemaError>;

const called = <Value>(
  decode: Decode<Value>,
  command: string,
  input: Readonly<Record<string, unknown>>,
): Effect.Effect<Value, ApiFailed> =>
  Effect.tryPromise({ try: () => invoke<unknown>(command, input), catch: failed }).pipe(
    Effect.flatMap(decode),
    Effect.catchTag("SchemaError", (cause) => Effect.fail(failed(cause))),
  );

const decodeOpened = Schema.decodeUnknownEffect(OpenedSchema);

const decodeChosen = Schema.decodeUnknownEffect(Schema.NullOr(OpenedSchema));

const decodeAccess = Schema.decodeUnknownEffect(McpAccessSchema);

export const openLink = (link: string): Effect.Effect<Opened, ApiFailed> =>
  called(decodeOpened, "open_link", { link });

export const openFile = (path: string): Effect.Effect<Opened, ApiFailed> =>
  called(decodeOpened, "open_file", { path });

export const chooseFile: Effect.Effect<Option.Option<Opened>, ApiFailed> = Effect.suspend(() =>
  called(decodeChosen, "choose_file", {}),
).pipe(Effect.map(Option.fromNullishOr));

export const mcpAccess: Effect.Effect<McpAccess, ApiFailed> = Effect.suspend(() =>
  called(decodeAccess, "mcp_access", {}),
);
