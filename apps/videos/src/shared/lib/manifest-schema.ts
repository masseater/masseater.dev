import { Schema } from "effect";

const TachieSchema = Schema.Struct({
  closed: Schema.String,
  open: Schema.optionalKey(Schema.String),
});

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
