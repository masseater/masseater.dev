import { Schema } from "effect";

import { LoggedSchema, SampleTableSchema } from "#/entities/song/lib/studio/placement.ts";

const owning = <View extends ArrayBufferView>(
  view: abstract new (...input: readonly never[]) => View,
): Schema.declare<View & ArrayBufferView<ArrayBuffer>> =>
  Schema.declare(
    (input): input is View & ArrayBufferView<ArrayBuffer> =>
      input instanceof view && input.buffer instanceof ArrayBuffer,
  );

export const StemSchema = Schema.Struct({
  name: Schema.String,
  frames: Schema.Finite,
  scale: Schema.Finite,
  segments: owning(Int32Array),
  data: owning(Int16Array),
  drum: Schema.Boolean,
});

const Ready = Schema.Struct({ ready: Schema.Literal(true) });

const Built = Schema.Struct({
  name: Schema.String,
  stem: StemSchema,
  entries: Schema.Array(LoggedSchema),
});

export const ReplySchema = Schema.Union([Ready, Built]);

export type Reply = typeof ReplySchema.Type;

const Loaded = Schema.Struct({
  samples: Schema.Record(
    Schema.String,
    Schema.declare((input): input is Float32Array => input instanceof Float32Array),
  ),
  table: SampleTableSchema,
  clips: Schema.String,
});

export const AskSchema = Schema.Union([Loaded, Schema.Struct({ name: Schema.String })]);

export type Ask = typeof AskSchema.Type;
