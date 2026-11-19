import { Schema } from "effect";
import type { Effect } from "effect";

import { LoggedSchema } from "#/shared/lib/studio/placement.ts";
import type { Logged } from "#/shared/lib/studio/placement.ts";
import type { Stem } from "#/shared/lib/studio/stem.ts";

export interface PartDone {
  readonly key: string;
  readonly stem: Stem;
  readonly logged: readonly Logged[];
}

export type PartRunner = (
  keys: readonly string[],
) => (done: (part: PartDone) => void) => Effect.Effect<readonly string[]>;

const owning = <View extends ArrayBufferView>(
  view: abstract new (...input: readonly never[]) => View,
): Schema.declare<View & ArrayBufferView<ArrayBuffer>> =>
  Schema.declare(
    (input): input is View & ArrayBufferView<ArrayBuffer> =>
      input instanceof view && input.buffer instanceof ArrayBuffer,
  );

const StemSchema = Schema.Struct({
  frames: Schema.Finite,
  scale: Schema.Finite,
  segments: owning(Int32Array),
  data: owning(Int16Array),
});

const Ready = Schema.Struct({ ready: Schema.Literal(true) });

const Rendered = Schema.Struct({
  key: Schema.String,
  stem: StemSchema,
  logged: Schema.Array(LoggedSchema),
});

export const PartReplySchema = Schema.Union([Ready, Rendered]);

export type PartReply = typeof PartReplySchema.Type;

const Loaded = Schema.Struct({
  song: Schema.String,
  samples: Schema.Record(
    Schema.String,
    Schema.declare((input): input is Float32Array => input instanceof Float32Array),
  ),
});

export const PartAskSchema = Schema.Union([Loaded, Schema.Struct({ key: Schema.String })]);

export type PartAsk = typeof PartAskSchema.Type;
