import { Schema } from "effect";

import { AtSchema, LengthSchema } from "#/entities/song/lib/studio/moment.ts";

const { Finite } = Schema;
const Text = Schema.String;
const maybe = Schema.optionalKey;
const Times = Schema.Array(Finite);
const PitchPoint = Schema.Tuple([Finite, Finite]);
const LoopPart = Schema.Struct({ steps: Finite, count: Finite });

export const ClipSchema = Schema.Struct({
  lane: Text,
  sample: Text,
  at: AtSchema,
  length: maybe(LengthSchema),
  gain: maybe(Finite),
  pan: maybe(Finite),
  rate: maybe(Finite),
  semitones: maybe(Finite),
  offset: maybe(Finite),
  attack: maybe(Finite),
  release: maybe(Finite),
  decay: maybe(Finite),
  pitch: maybe(Schema.Array(PitchPoint)),
  lowPass: maybe(Finite),
  lowPassEnd: maybe(Finite),
  highPass: maybe(Finite),
  resonance: maybe(Finite),
  drive: maybe(Finite),
  reverse: maybe(Schema.Boolean),
  reverseFrom: maybe(Finite),
  midi: maybe(Finite),
});

export type Clip = typeof ClipSchema.Type;

const Timed = { at: AtSchema, seconds: Finite };

const EditSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("mute"), ...Timed }),
  Schema.Struct({ kind: Schema.Literal("reverse"), ...Timed }),
  Schema.Struct({ kind: Schema.Literal("tapeStop"), ...Timed, endRate: Finite }),
  Schema.Struct({
    kind: Schema.Literal("repeat"),
    ...Timed,
    count: Finite,
    semitones: maybe(Finite),
  }),
  Schema.Struct({
    kind: Schema.Literal("loop"),
    from: AtSchema,
    parts: Schema.Array(LoopPart),
    to: AtSchema,
  }),
]);

export type Edit = typeof EditSchema.Type;

export const CuesSchema = Schema.Struct({
  kicks: Times,
  snares: Times,
  edits: Schema.Array(EditSchema),
  drumEdits: Schema.Array(EditSchema),
  flashes: Schema.Array(Schema.Struct({ from: AtSchema, to: AtSchema })),
  roots: Times,
});

export type Cues = typeof CuesSchema.Type;

const PointSchema = Schema.Struct({ at: AtSchema, shift: maybe(Finite), value: Finite });

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
  Schema.Struct({ svf: Schema.Literals(["low", "high"]), cutoff: Finite, resonance: Finite }),
  Schema.Struct({
    svf: Schema.Literals(["low", "high"]),
    curve: Schema.Literal("breakHighPass"),
    resonance: Finite,
  }),
  Schema.Struct({
    biquad: Schema.Literals(["peak", "low", "high"]),
    hertz: Finite,
    gain: Finite,
    resonance: Finite,
  }),
  Schema.Struct({ drive: Finite, post: Finite }),
]);

export type Filter = typeof FilterSchema.Type;

const Window = { from: AtSchema, to: AtSchema };
const Boost = Schema.Struct({ ...Window, gain: Finite });

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
    threshold: Finite,
    ratio: Finite,
    attack: Finite,
    release: Finite,
    makeup: Finite,
  }),
  Schema.Struct({ op: Schema.Literal("tremolo"), bus: RoleSchema, rate: Finite, depth: Finite }),
  Schema.Struct({
    op: Schema.Literal("chorus"),
    bus: RoleSchema,
    depth: Finite,
    rate: Finite,
    amount: Finite,
  }),
  Schema.Struct({
    op: Schema.Literal("phaser"),
    bus: RoleSchema,
    rate: Finite,
    low: Finite,
    high: Finite,
    feedback: Finite,
    amount: Finite,
    ...Window,
  }),
  Schema.Struct({ op: Schema.Literal("width"), bus: RoleSchema, width: Finite, monoBelow: Finite }),
  Schema.Struct({
    op: Schema.Literal("widen"),
    bus: RoleSchema,
    milliseconds: Finite,
    amount: Finite,
    highPass: Finite,
  }),
  Schema.Struct({
    op: Schema.Literal("send"),
    from: RoleSchema,
    into: RoleSchema,
    gain: Finite,
    boost: maybe(Boost),
  }),
  Schema.Struct({
    op: Schema.Literal("duck"),
    bus: RoleSchema,
    by: Schema.Literals(["kicks", "hits"]),
    depth: Finite,
  }),
  Schema.Struct({ op: Schema.Literal("scale"), bus: RoleSchema, gain: Finite }),
  Schema.Struct({ op: Schema.Literal("mix"), from: RoleSchema, into: RoleSchema, gain: Finite }),
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
  returns: Schema.Struct({ delay: Finite, reverb: Finite, museum: Finite }),
  tracks: Schema.Array(TrackSchema),
});

export type Mix = typeof MixSchema.Type;

export type Track = Mix["tracks"][number];

const SpanSchema = Schema.Struct({ from: AtSchema, to: maybe(AtSchema), after: maybe(Finite) });

const ClosedSchema = Schema.Struct({ from: AtSchema, to: AtSchema });

export type Span = typeof SpanSchema.Type;

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

export type Sections = typeof SectionsSchema.Type;
