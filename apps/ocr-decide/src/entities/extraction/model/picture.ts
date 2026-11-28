import { Schema } from "effect";

export const SourceSchema = Schema.Union([Schema.String, Schema.instanceOf(File)]);

export type Source = typeof SourceSchema.Type;

export const PictureSchema = Schema.Struct({
  name: Schema.String,
  url: Schema.String,
  source: SourceSchema,
});

export type Picture = typeof PictureSchema.Type;
