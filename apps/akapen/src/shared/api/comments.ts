import { CommentSchema } from "@masseater.dev/akapen-protocol";
import type { Comment, CommentInput } from "@masseater.dev/akapen-protocol";
import { settled, settledAs } from "@masseater.dev/media-notes-ui";
import type { ApiFailed } from "@masseater.dev/media-notes-ui";
import { Effect, Schema } from "effect";

import { commands } from "./generated/bindings.ts";

/** @internal */
export const fetchComments: Effect.Effect<readonly Comment[], ApiFailed> = settledAs(
  Schema.decodeUnknownEffect(Schema.Array(CommentSchema)),
)(() => commands.listComments());

/** @internal */
export const postComment = (input: CommentInput): Effect.Effect<void, ApiFailed> =>
  settled(() =>
    commands.saveComment({
      ...input,
      media: { ...input.media, source: { ...input.media.source } },
    }),
  ).pipe(Effect.asVoid);

/** @internal */
export const deleteComment = (id: string): Effect.Effect<void, ApiFailed> =>
  settled(() => commands.removeComment(id)).pipe(Effect.asVoid);

/** @internal */
export const restoreComment = (comment: Comment): Effect.Effect<void, ApiFailed> =>
  settled(() =>
    commands.restoreComment({
      ...comment,
      media: { ...comment.media, source: { ...comment.media.source } },
    }),
  ).pipe(Effect.asVoid);
