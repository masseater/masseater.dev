import { Schema } from "effect";

import { EditSchema, HitSchema, NoteSchema, SliceSchema } from "./events.ts";
import { Name, Share, Ticks, kind } from "./fields.ts";
import { EffectSchema, PlayParamSchema, SendSchema } from "./sound.ts";

const RoleSchema = Schema.Literals([
  "melody",
  "countermelody",
  "bass",
  "harmony",
  "drums",
  "texture",
]);

export type Role = typeof RoleSchema.Type;

const SlicingSchema = Schema.Union([kind("onsets")({}), kind("count")({ count: Schema.Int })]);

const SampleSchema = Schema.Struct({
  name: Name,
  path: Schema.String,
  slices: Schema.OptionFromNullOr(SlicingSchema),
});

const KitVoiceSchema = Schema.Struct({
  name: Name,
  path: Schema.String,
  params: Schema.Array(PlayParamSchema),
});

const KitSchema = Schema.Struct({ name: Name, voices: Schema.Array(KitVoiceSchema) });

const ZoneSchema = Schema.Struct({ path: Schema.String, root: Schema.Int });

const InstrumentSchema = Schema.Struct({ name: Name, zones: Schema.Array(ZoneSchema) });

const TrackSourceSchema = Schema.Union([
  kind("kit")({ kit: Name }),
  kind("instrument")({ instrument: Name }),
  kind("audio")({}),
]);

const TrackSchema = Schema.Struct({
  name: Name,
  source: TrackSourceSchema,
  role: Schema.OptionFromNullOr(RoleSchema),
  fx: Schema.Array(EffectSchema),
  sends: Schema.Array(SendSchema),
});

export type Track = typeof TrackSchema.Type;

const BusSchema = Schema.Struct({
  name: Name,
  fx: Schema.Array(EffectSchema),
  sends: Schema.Array(SendSchema),
});

const DuckDepthSchema = Schema.Struct({ target: Name, amount: Share });

const DuckSchema = Schema.Struct({
  targets: Schema.Array(Name),
  source: Name,
  holdMilliseconds: Schema.Finite,
  releaseMilliseconds: Schema.Finite,
  depths: Schema.Array(DuckDepthSchema),
});

const MeterSchema = Schema.Struct({
  numerator: Schema.Int,
  denominator: Schema.Int,
  groups: Schema.Array(Schema.Int),
});

export type Meter = typeof MeterSchema.Type;

const RampSchema = Schema.Struct({ bpm: Schema.Finite, bars: Schema.Int });

const TempoSchema = Schema.Struct({
  bpm: Schema.Finite,
  ramp: Schema.OptionFromNullOr(RampSchema),
});

export type Tempo = typeof TempoSchema.Type;

const BarSchema = Schema.Struct({
  index: Schema.Int,
  start: Ticks,
  length: Ticks,
  meter: MeterSchema,
  tempo: TempoSchema,
  section: Schema.OptionFromNullOr(Schema.String),
  mark: Schema.OptionFromNullOr(Schema.String),
});

export type Bar = typeof BarSchema.Type;

const AmountSchema = Schema.Struct({
  unit: Schema.Literals(["hertz", "decibels", "share", "milliseconds", "semitones", "number"]),
  value: Schema.Finite,
});

export type Amount = typeof AmountSchema.Type;

const AutomationSchema = Schema.Struct({
  target: Name,
  parameter: Name,
  from: AmountSchema,
  to: AmountSchema,
  bar: Schema.Int,
  start: Ticks,
  bars: Schema.Int,
  curve: Schema.Literals(["linear", "exp"]),
});

export type Automation = typeof AutomationSchema.Type;

const GrooveSchema = Schema.Struct({ grid: Ticks, amount: Share });

export const SongSchema = Schema.Struct({
  title: Schema.String,
  groove: Schema.OptionFromNullOr(GrooveSchema),
  samples: Schema.Array(SampleSchema),
  kits: Schema.Array(KitSchema),
  instruments: Schema.Array(InstrumentSchema),
  buses: Schema.Array(BusSchema),
  tracks: Schema.Array(TrackSchema),
  ducks: Schema.Array(DuckSchema),
  master: Schema.Array(EffectSchema),
  bars: Schema.Array(BarSchema),
  notes: Schema.Array(NoteSchema),
  hits: Schema.Array(HitSchema),
  slices: Schema.Array(SliceSchema),
  edits: Schema.Array(EditSchema),
  automations: Schema.Array(AutomationSchema),
});

export type Song = typeof SongSchema.Type;
