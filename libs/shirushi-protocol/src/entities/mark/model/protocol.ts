import { MediaSchema } from "@masseater.dev/media-notes-protocol";
import { Schema } from "effect";

export const VerbSchema = Schema.Literals(["like", "dislike"]).annotate({ identifier: "Verb" });

export const AspectSchema = Schema.Literals([
  "rhythm",
  "bass",
  "chords",
  "melody",
  "tone",
  "voice",
  "arrangement",
  "mix",
]).annotate({ identifier: "Aspect" });

export const MarkInputSchema = Schema.Struct({
  song: MediaSchema,
  from: Schema.Finite,
  to: Schema.Finite,
  verb: VerbSchema,
  aspects: Schema.Array(AspectSchema),
  words: Schema.String,
}).annotate({ identifier: "MarkInput" });

export const MarkSchema = Schema.Struct({
  id: Schema.String,
  ...MarkInputSchema.fields,
  at: Schema.Int,
}).annotate({ identifier: "Mark" });

export type Verb = typeof VerbSchema.Type;

export type Aspect = typeof AspectSchema.Type;

export type MarkInput = typeof MarkInputSchema.Type;

export type Mark = typeof MarkSchema.Type;
