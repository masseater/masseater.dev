import { Schema } from "effect";

import { Name, OptionalNumber, Share, Ticks, kind } from "./fields.ts";
import { PlayParamSchema } from "./sound.ts";

const timedFields = {
  track: Name,
  line: Schema.Int,
  bar: Schema.Int,
  offset: Ticks,
  start: Ticks,
  length: Ticks,
  nudgeMilliseconds: Schema.Finite,
};

export const LyricSchema = Schema.Union([
  kind("syllable")({ text: Schema.String }),
  kind("melisma")({}),
]);

export type Lyric = typeof LyricSchema.Type;

export const ArticulationSchema = Schema.Literals(["staccato", "legato", "accent"]);

const BendPointSchema = Schema.Struct({ milliseconds: Schema.Finite, semitones: Schema.Finite });

export const NoteSchema = Schema.Struct({
  ...timedFields,
  midi: Schema.Int,
  cents: Schema.Finite,
  velocity: Share,
  gate: Share,
  articulation: Schema.OptionFromNullOr(ArticulationSchema),
  lyric: Schema.OptionFromNullOr(LyricSchema),
  bend: Schema.Array(BendPointSchema),
  params: Schema.Array(PlayParamSchema),
});

export type Note = typeof NoteSchema.Type;

export const HitSchema = Schema.Struct({
  ...timedFields,
  voice: Name,
  velocity: Share,
  params: Schema.Array(PlayParamSchema),
});

export type Hit = typeof HitSchema.Type;

export const SliceSchema = Schema.Struct({
  ...timedFields,
  sample: Name,
  index: Schema.Int,
  velocity: Share,
  params: Schema.Array(PlayParamSchema),
});

export type Slice = typeof SliceSchema.Type;

export const EditKindSchema = Schema.Literals(["mute", "stutter", "tapestop", "reverse-slice"]);

const RepeatSchema = Schema.Struct({ ticks: Ticks, count: Schema.OptionFromNullOr(Schema.Int) });

export const EditSchema = Schema.Struct({
  ...timedFields,
  edit: EditKindSchema,
  every: Schema.OptionFromNullOr(RepeatSchema),
  fadeMilliseconds: OptionalNumber,
});

export type Edit = typeof EditSchema.Type;
