import { Schema } from "effect";

export const SiteSchema = Schema.Literals(["youtube", "niconico", "soundcloud"]).annotate({
  identifier: "Site",
});

export const SourceSchema = Schema.Struct({ site: SiteSchema, id: Schema.NonEmptyString }).annotate(
  {
    identifier: "Source",
  },
);

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

export const SongSchema = Schema.Struct({
  source: SourceSchema,
  title: Schema.String,
  artist: Schema.String,
}).annotate({ identifier: "Song" });

export const MarkInputSchema = Schema.Struct({
  song: SongSchema,
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

export const SavedSchema = Schema.Struct({ id: Schema.String, at: Schema.Int }).annotate({
  identifier: "Saved",
});

export const McpAccessSchema = Schema.Struct({ url: Schema.String, token: Schema.String }).annotate(
  {
    identifier: "McpAccess",
  },
);

export type Site = typeof SiteSchema.Type;

export type Source = typeof SourceSchema.Type;

export type Verb = typeof VerbSchema.Type;

export type Aspect = typeof AspectSchema.Type;

export type Song = typeof SongSchema.Type;

export type MarkInput = typeof MarkInputSchema.Type;

export type Mark = typeof MarkSchema.Type;

export type Saved = typeof SavedSchema.Type;

export type McpAccess = typeof McpAccessSchema.Type;
