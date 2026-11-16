import { CommentSchema } from "@masseater.dev/akapen-protocol";
import type { Comment, CommentInput } from "@masseater.dev/akapen-protocol";
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

const decodeComments = Schema.decodeUnknownEffect(Schema.Array(CommentSchema));

const malformed = (cause: unknown): Effect.Effect<never, ApiFailed> => Effect.fail(failed(cause));

/** @internal */
export const fetchComments: Effect.Effect<readonly Comment[], ApiFailed> = Effect.suspend(() =>
  call(() => commands.listComments()),
).pipe(Effect.flatMap(decodeComments), Effect.catchTag("SchemaError", malformed));

/** @internal */
export const postComment = (input: CommentInput): Effect.Effect<void, ApiFailed> =>
  call(() =>
    commands.saveComment({
      ...input,
      media: { ...input.media, source: { ...input.media.source } },
    }),
  ).pipe(Effect.asVoid);

/** @internal */
export const deleteComment = (id: string): Effect.Effect<void, ApiFailed> =>
  call(() => commands.removeComment(id)).pipe(Effect.asVoid);

/** @internal */
export const restoreComment = (comment: Comment): Effect.Effect<void, ApiFailed> =>
  call(() =>
    commands.restoreComment({
      ...comment,
      media: { ...comment.media, source: { ...comment.media.source } },
    }),
  ).pipe(Effect.asVoid);
