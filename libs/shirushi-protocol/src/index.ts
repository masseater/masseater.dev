import { Schema } from "effect";

export const Site = Schema.Literals(["youtube", "niconico", "soundcloud"]).annotate({
  identifier: "Site",
});

export const Source = Schema.Struct({ site: Site, id: Schema.NonEmptyString }).annotate({
  identifier: "Source",
});

export const Verb = Schema.Literals(["like", "dislike"]).annotate({ identifier: "Verb" });

export const Aspect = Schema.Literals([
  "rhythm",
  "bass",
  "chords",
  "melody",
  "tone",
  "voice",
  "arrangement",
  "mix",
]).annotate({ identifier: "Aspect" });

export const Song = Schema.Struct({
  source: Source,
  title: Schema.String,
  artist: Schema.String,
}).annotate({ identifier: "Song" });

export const MarkInput = Schema.Struct({
  song: Song,
  from: Schema.Finite,
  to: Schema.Finite,
  verb: Verb,
  aspects: Schema.Array(Aspect),
  words: Schema.String,
}).annotate({ identifier: "MarkInput" });

export const Mark = Schema.Struct({
  id: Schema.String,
  ...MarkInput.fields,
  at: Schema.Int,
}).annotate({ identifier: "Mark" });

export const Saved = Schema.Struct({ id: Schema.String, at: Schema.Int }).annotate({
  identifier: "Saved",
});

export const McpAccess = Schema.Struct({ url: Schema.String, token: Schema.String }).annotate({
  identifier: "McpAccess",
});

export type Site = typeof Site.Type;

export type Source = typeof Source.Type;

export type Verb = typeof Verb.Type;

export type Aspect = typeof Aspect.Type;

export type Song = typeof Song.Type;

export type MarkInput = typeof MarkInput.Type;

export type Mark = typeof Mark.Type;

export type Saved = typeof Saved.Type;

export type McpAccess = typeof McpAccess.Type;
