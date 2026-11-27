import { Schema } from "effect";

const ImageTachieSchema = Schema.Struct({
  closed: Schema.String,
  open: Schema.optionalKey(Schema.String),
});

const PatternsSchema = Schema.Struct({
  closed: Schema.String,
  half: Schema.optionalKey(Schema.String),
  open: Schema.String,
});

const PsdTachieSchema = Schema.Struct({
  psd: Schema.String,
  favorites: Schema.optionalKey(Schema.String),
  state: Schema.optionalKey(Schema.String),
  blink: Schema.optionalKey(PatternsSchema),
  mouth: Schema.optionalKey(PatternsSchema),
});

const TachieSchema = Schema.Union([PsdTachieSchema, ImageTachieSchema]);

/** @internal */
export type TachieEntry = typeof TachieSchema.Type;

const ManifestSchema = Schema.Struct({
  narration: Schema.Record(Schema.String, Schema.Struct({ seconds: Schema.Finite })),
  speakers: Schema.Record(Schema.String, Schema.String),
  tachie: Schema.optionalKey(Schema.Record(Schema.String, TachieSchema)),
});

/** @internal */
export type Manifest = typeof ManifestSchema.Type;

/** @internal */
export const ManifestJson = Schema.fromJsonString(ManifestSchema);

/** @internal */
export const EMPTY_MANIFEST: Manifest = { narration: {}, speakers: {}, tachie: {} };
