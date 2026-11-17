import { Schema } from "effect";

import { AtSchema, LengthSchema } from "#/entities/song/lib/studio/moment.ts";

const Text = Schema.String;
const maybe = Schema.optionalKey;
const Times = Schema.Array(Schema.Finite);
const PitchPoint = Schema.Tuple([Schema.Finite, Schema.Finite]);
const Sweep = Schema.Struct({ from: Schema.Finite, to: Schema.Finite });
const Reversal = Schema.Struct({ from: maybe(Schema.Finite) });
const LoopPart = Schema.Struct({ steps: Schema.Finite, count: Schema.Finite });

export const ClipSchema = Schema.Struct({
  lane: Text,
  sample: Text,
  at: AtSchema,
  length: maybe(LengthSchema),
  gain: maybe(Schema.Finite),
  pan: maybe(Schema.Finite),
  rate: maybe(Schema.Finite),
  semitones: maybe(Schema.Finite),
  offset: maybe(Schema.Finite),
  attack: maybe(Schema.Finite),
  release: maybe(Schema.Finite),
  decay: maybe(Schema.Finite),
  pitch: maybe(Schema.Array(PitchPoint)),
  lowPass: maybe(Schema.Union([Schema.Finite, Sweep])),
  highPass: maybe(Schema.Finite),
  resonance: maybe(Schema.Finite),
  drive: maybe(Schema.Finite),
  reverse: maybe(Reversal),
  midi: maybe(Schema.Finite),
});

export type Clip = typeof ClipSchema.Type;

const Timed = { at: AtSchema, seconds: Schema.Finite };

const EditSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("mute"), ...Timed }),
  Schema.Struct({ kind: Schema.Literal("reverse"), ...Timed }),
  Schema.Struct({ kind: Schema.Literal("tapeStop"), ...Timed, endRate: Schema.Finite }),
  Schema.Struct({
    kind: Schema.Literal("repeat"),
    ...Timed,
    count: Schema.Finite,
    semitones: maybe(Schema.Finite),
  }),
  Schema.Struct({
    kind: Schema.Literal("loop"),
    from: AtSchema,
    parts: Schema.Array(LoopPart),
    to: AtSchema,
  }),
]);

export type CueEdit = typeof EditSchema.Type;

export const CuesSchema = Schema.Struct({
  kicks: Times,
  snares: Times,
  edits: Schema.Array(EditSchema),
  drumEdits: Schema.Array(EditSchema),
  flashes: Schema.Array(Schema.Struct({ from: AtSchema, to: AtSchema })),
  roots: Times,
});

const PointSchema = Schema.Struct({
  at: AtSchema,
  shift: maybe(Schema.Finite),
  value: Schema.Finite,
});

export const AutomationSchema = Schema.Struct({
  drumLowPass: Schema.Array(PointSchema),
  drumHighPass: Schema.Array(PointSchema),
  museumLowPass: Schema.Array(PointSchema),
  mainGain: Schema.Array(PointSchema),
  museumGain: Schema.Array(PointSchema),
  breakHighPass: Schema.Array(PointSchema),
});

export type Automation = typeof AutomationSchema.Type;

export type CurveName = keyof Automation;

const RoleSchema = Schema.Literals(["main", "plate", "delay", "museum", "direct", "top"]);

export type Role = typeof RoleSchema.Type;

const FilterSchema = Schema.Union([
  Schema.Struct({
    svf: Schema.Literals(["low", "high"]),
    cutoff: Schema.Finite,
    resonance: Schema.Finite,
  }),
  Schema.Struct({
    svf: Schema.Literals(["low", "high"]),
    curve: Schema.Literal("breakHighPass"),
    resonance: Schema.Finite,
  }),
  Schema.Struct({
    biquad: Schema.Literals(["peak", "low", "high"]),
    hertz: Schema.Finite,
    gain: Schema.Finite,
    resonance: Schema.Finite,
  }),
  Schema.Struct({ drive: Schema.Finite, post: Schema.Finite }),
]);

export type Filter = typeof FilterSchema.Type;

const Window = { from: AtSchema, to: AtSchema };
const Boost = Schema.Struct({ ...Window, gain: Schema.Finite });

const StepSchema = Schema.Union([
  Schema.Struct({
    op: Schema.Literal("flush"),
    into: RoleSchema,
    lane: Text,
    mono: maybe(Schema.Boolean),
  }),
  Schema.Struct({ op: Schema.Literal("gather"), into: RoleSchema, lane: Text }),
  Schema.Struct({ op: Schema.Literal("empty"), into: RoleSchema, mono: Schema.Boolean }),
  Schema.Struct({
    op: Schema.Literal("filter"),
    bus: RoleSchema,
    chain: Schema.Array(FilterSchema),
  }),
  Schema.Struct({
    op: Schema.Literal("compress"),
    bus: RoleSchema,
    threshold: Schema.Finite,
    ratio: Schema.Finite,
    attack: Schema.Finite,
    release: Schema.Finite,
    makeup: Schema.Finite,
  }),
  Schema.Struct({
    op: Schema.Literal("tremolo"),
    bus: RoleSchema,
    rate: Schema.Finite,
    depth: Schema.Finite,
  }),
  Schema.Struct({
    op: Schema.Literal("chorus"),
    bus: RoleSchema,
    depth: Schema.Finite,
    rate: Schema.Finite,
    amount: Schema.Finite,
  }),
  Schema.Struct({
    op: Schema.Literal("phaser"),
    bus: RoleSchema,
    rate: Schema.Finite,
    low: Schema.Finite,
    high: Schema.Finite,
    feedback: Schema.Finite,
    amount: Schema.Finite,
    ...Window,
  }),
  Schema.Struct({
    op: Schema.Literal("width"),
    bus: RoleSchema,
    width: Schema.Finite,
    monoBelow: Schema.Finite,
  }),
  Schema.Struct({
    op: Schema.Literal("widen"),
    bus: RoleSchema,
    milliseconds: Schema.Finite,
    amount: Schema.Finite,
    highPass: Schema.Finite,
  }),
  Schema.Struct({
    op: Schema.Literal("send"),
    from: RoleSchema,
    into: RoleSchema,
    gain: Schema.Finite,
    boost: maybe(Boost),
  }),
  Schema.Struct({
    op: Schema.Literal("duck"),
    bus: RoleSchema,
    by: Schema.Literals(["kicks", "hits"]),
    depth: Schema.Finite,
  }),
  Schema.Struct({ op: Schema.Literal("scale"), bus: RoleSchema, gain: Schema.Finite }),
  Schema.Struct({
    op: Schema.Literal("mix"),
    from: RoleSchema,
    into: RoleSchema,
    gain: Schema.Finite,
  }),
  Schema.Struct({ op: Schema.Literal("stereo"), bus: RoleSchema }),
]);

export type Step = typeof StepSchema.Type;

const TrackSchema = Schema.Struct({
  name: Text,
  drum: maybe(Schema.Boolean),
  steps: Schema.Array(StepSchema),
});

export const MixSchema = Schema.Struct({
  order: Schema.Array(Text),
  returns: Schema.Struct({ delay: Schema.Finite, reverb: Schema.Finite, museum: Schema.Finite }),
  tracks: Schema.Array(TrackSchema),
});

export type Mix = typeof MixSchema.Type;

export type Track = Mix["tracks"][number];

const SpanSchema = Schema.Struct({
  from: AtSchema,
  to: maybe(AtSchema),
  after: maybe(Schema.Finite),
});

const ClosedSchema = Schema.Struct({ from: AtSchema, to: AtSchema });

export type TimeSpan = typeof SpanSchema.Type;

export const SectionsSchema = Schema.Struct({
  museum: ClosedSchema,
  hallRise: ClosedSchema,
  museumOpen: Schema.Array(ClosedSchema),
  museumShown: Schema.Array(ClosedSchema),
  masterOpen: ClosedSchema,
  drumLowPass: Schema.Array(SpanSchema),
  drumHighPass: Schema.Array(SpanSchema),
  museumLowPass: Schema.Array(SpanSchema),
});
