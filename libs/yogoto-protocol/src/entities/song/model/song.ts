import { Schema } from "effect";

export const SONG_MANIFEST = "song.json";

export const UrlOriginSchema = Schema.Struct({
  kind: Schema.Literal("url"),
  url: Schema.String,
  route: Schema.String,
}).annotate({ identifier: "UrlOrigin" });

export const FileOriginSchema = Schema.Struct({
  kind: Schema.Literal("file"),
  name: Schema.String,
}).annotate({ identifier: "FileOrigin" });

export const OriginSchema = Schema.Union([UrlOriginSchema, FileOriginSchema]).annotate({
  identifier: "Origin",
});

export const SongSourceSchema = Schema.Struct({
  id: Schema.String,
  origin: OriginSchema,
  file: Schema.String,
  sha256: Schema.String,
  sampleRate: Schema.Int,
  frames: Schema.Int,
  addedAt: Schema.Int,
}).annotate({ identifier: "SongSource" });

export const StemFileSchema = Schema.Struct({
  stem: Schema.String,
  file: Schema.String,
}).annotate({ identifier: "StemFile" });

export const SeparationSchema = Schema.Struct({
  id: Schema.String,
  source: Schema.String,
  model: Schema.String,
  revision: Schema.String,
  stems: Schema.Array(StemFileSchema),
  sampleRate: Schema.Int,
  frames: Schema.Int,
  createdAt: Schema.Int,
}).annotate({ identifier: "Separation" });

export const BarSchema = Schema.Struct({
  beat: Schema.Int,
  beats: Schema.Int,
}).annotate({ identifier: "Bar" });

export const KeySpanSchema = Schema.Struct({
  bar: Schema.Int,
  bars: Schema.Int,
  key: Schema.String,
}).annotate({ identifier: "KeySpan" });

export const AnalysisSchema = Schema.Struct({
  source: Schema.String,
  separation: Schema.NullOr(Schema.String),
  beatModel: Schema.String,
  keyModel: Schema.String,
  beats: Schema.Array(Schema.Finite),
  bars: Schema.Array(BarSchema),
  keys: Schema.Array(KeySpanSchema),
  createdAt: Schema.Int,
}).annotate({ identifier: "Analysis" });

export const SongSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  artist: Schema.String,
  addedAt: Schema.Int,
  primary: Schema.String,
  sources: Schema.Array(SongSourceSchema),
  separations: Schema.Array(SeparationSchema),
  analysis: Schema.NullOr(AnalysisSchema),
}).annotate({ identifier: "Song" });

export type Origin = typeof OriginSchema.Type;

export type SongSource = typeof SongSourceSchema.Type;

export type StemFile = typeof StemFileSchema.Type;

export type Separation = typeof SeparationSchema.Type;

export type Bar = typeof BarSchema.Type;

export type KeySpan = typeof KeySpanSchema.Type;

export type Analysis = typeof AnalysisSchema.Type;

export type Song = typeof SongSchema.Type;
