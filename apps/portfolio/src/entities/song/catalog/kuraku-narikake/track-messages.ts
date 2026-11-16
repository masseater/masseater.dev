import { Schema } from "effect";

import { LoggedSchema } from "#/entities/song/model/program.ts";

const owning = <View extends ArrayBufferView>(
  view: abstract new (...input: readonly never[]) => View,
): Schema.declare<View & ArrayBufferView<ArrayBuffer>> =>
  Schema.declare(
    (input): input is View & ArrayBufferView<ArrayBuffer> =>
      input instanceof view && input.buffer instanceof ArrayBuffer,
  );

const LENGTH = "n";

const Entries = Schema.Array(Schema.NullOr(LoggedSchema));

export const StemSchema = Schema.Struct({
  name: Schema.String,
  [LENGTH]: Schema.Finite,
  scale: Schema.Finite,
  segs: owning(Int32Array),
  data: owning(Int16Array),
  drum: Schema.Boolean,
});

const Ready = Schema.Struct({ ready: Schema.Literal(true) });

const Built = Schema.Struct({ name: Schema.String, stem: StemSchema, entries: Entries });

export const ReplySchema = Schema.Union([Ready, Built]);

export type Reply = typeof ReplySchema.Type;

const Loaded = Schema.Struct({
  samples: Schema.Record(
    Schema.String,
    Schema.declare((input): input is Float32Array => input instanceof Float32Array),
  ),
  table: Schema.Record(Schema.String, Schema.Unknown),
});

export const AskSchema = Schema.Union([Loaded, Schema.Struct({ name: Schema.String })]);

export type Ask = typeof AskSchema.Type;
