import { Schema } from "effect";

export const PROCESSOR = "daw-view-mix";

export const HEARD = { silent: 0, started: 1, ended: 2 } as const;

export const MixerSchema = Schema.Struct({
  volumeDecibels: Schema.Finite,
  pan: Schema.Finite,
  muted: Schema.Boolean,
});

export const OpeningSchema = Schema.Struct({
  init: Schema.Unknown,
  tape: Schema.optionalKey(Schema.instanceOf(MessagePort)),
  frames: Schema.optionalKey(Schema.Finite),
  blocks: Schema.optionalKey(Schema.Finite),
});

export const CommandSchema = Schema.Struct({
  play: Schema.optionalKey(Schema.Finite),
  stop: Schema.optionalKey(Schema.Literal(true)),
  mixers: Schema.optionalKey(Schema.Array(MixerSchema)),
});

export const TrackBlockSchema = Schema.Struct({
  channels: Schema.Finite,
  scale: Schema.Finite,
  data: Schema.instanceOf(Int16Array),
});

export const DeliverySchema = Schema.Struct({
  block: Schema.Finite,
  tracks: Schema.Array(TrackBlockSchema),
});

export const HeardSchema = Schema.Struct({
  heard: Schema.Literals([HEARD.started, HEARD.ended]),
  at: Schema.Finite,
  frame: Schema.Finite,
});

export type Heard = typeof HeardSchema.Type;
