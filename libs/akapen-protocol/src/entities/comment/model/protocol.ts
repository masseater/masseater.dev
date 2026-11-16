import { MediaSchema } from "@masseater.dev/media-notes-protocol";
import { Schema } from "effect";

export const CommentInputSchema = Schema.Struct({
  media: MediaSchema,
  location: Schema.String,
  from: Schema.Finite,
  to: Schema.Finite,
  words: Schema.String,
}).annotate({ identifier: "CommentInput" });

export const ResolutionSchema = Schema.Struct({
  at: Schema.Int,
  words: Schema.String,
}).annotate({ identifier: "Resolution" });

export const CommentSchema = Schema.Struct({
  id: Schema.String,
  ...CommentInputSchema.fields,
  at: Schema.Int,
  resolution: Schema.NullOr(ResolutionSchema),
}).annotate({ identifier: "Comment" });

export type CommentInput = typeof CommentInputSchema.Type;

export type Resolution = typeof ResolutionSchema.Type;

export type Comment = typeof CommentSchema.Type;
