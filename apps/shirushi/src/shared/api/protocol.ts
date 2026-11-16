import { Schema } from "effect";

export const MARKS_PATH = "/api/marks";

export const SONG_PATH = "/api/song";

const SiteSchema = Schema.Literals(["youtube", "niconico", "soundcloud"]);

export type Site = typeof SiteSchema.Type;

const SourceSchema = Schema.Struct({ site: SiteSchema, id: Schema.NonEmptyString });

export type Source = typeof SourceSchema.Type;

export const VerbSchema = Schema.Literals(["like", "dislike"]);

export type Verb = typeof VerbSchema.Type;

export const ASPECTS = [
  "rhythm",
  "bass",
  "chords",
  "melody",
  "tone",
  "voice",
  "arrangement",
  "mix",
] as const;

export const AspectSchema = Schema.Literals(ASPECTS);

export type Aspect = typeof AspectSchema.Type;

export const SongSchema = Schema.Struct({
  source: SourceSchema,
  title: Schema.String,
  artist: Schema.String,
});

export type Song = typeof SongSchema.Type;

export const MarkInputSchema = Schema.Struct({
  song: SongSchema,
  from: Schema.Finite,
  to: Schema.Finite,
  verb: VerbSchema,
  aspects: Schema.Array(AspectSchema),
  words: Schema.String,
});

export type MarkInput = typeof MarkInputSchema.Type;

export const MarkSchema = Schema.Struct({
  id: Schema.String,
  ...MarkInputSchema.fields,
  at: Schema.Finite,
});

export type Mark = typeof MarkSchema.Type;

export const MarksSchema = Schema.Array(MarkSchema);

export const ASPECT_LABELS: Readonly<Record<Aspect, string>> = {
  rhythm: "リズム",
  bass: "ベース",
  chords: "コード",
  melody: "メロディ",
  tone: "音色",
  voice: "声",
  arrangement: "展開",
  mix: "ミックス",
};

export const VERB_LABELS: Readonly<Record<Verb, string>> = { like: "好き", dislike: "苦手" };
