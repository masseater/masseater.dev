import { Schema } from "effect";

export const TICKS_PER_BEAT = 480;

export const SONG_EXTENSION = ".fu";

const FIRST = 1;
const NO_TICK = 0;
const LAST_TICK = TICKS_PER_BEAT - FIRST;
const MAX_NUMERATOR = 32;
const SLOWEST_BPM = 20;
const FASTEST_BPM = 400;
const SILENT = 0;
const LOUDEST = 1;
const WHOLE = 1;
const HALF = 2;
const QUARTER = 4;
const EIGHTH = 8;
const SIXTEENTH = 16;
const THIRTY_SECOND = 32;
const HALF_SEMITONE = 50;
const MAX_BEND = 48;

const Counted = Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST));

const Bar = Counted.annotate({ description: "Bar number, counted from 1." });

const EventBar = Schema.Int.check(Schema.isGreaterThanOrEqualTo(NO_TICK)).annotate({
  description: "Bar number, counted from 1. Bar 0 is the pickup before bar 1.",
});

const Beat = Counted.annotate({
  description: "Beat in the bar, counted from 1. A beat is one unit of the meter's denominator.",
});

const Tick = Schema.Int.check(Schema.isBetween({ minimum: NO_TICK, maximum: LAST_TICK })).annotate({
  description: `Offset inside the beat, from 0 to ${String(LAST_TICK)}. One beat is ${String(TICKS_PER_BEAT)} ticks.`,
});

const Velocity = Schema.Finite.check(
  Schema.isBetween({ minimum: SILENT, maximum: LOUDEST, exclusiveMinimum: true }),
).annotate({ description: "How hard the note is played, above 0 and up to 1." });

const positionFields = { bar: EventBar, beat: Beat, tick: Tick };

export const PositionSchema = Schema.Struct(positionFields);

export type Position = typeof PositionSchema.Type;

export const MeterChangeSchema = Schema.Struct({
  bar: Bar,
  numerator: Schema.Int.check(Schema.isBetween({ minimum: FIRST, maximum: MAX_NUMERATOR })),
  denominator: Schema.Literals([WHOLE, HALF, QUARTER, EIGHTH, SIXTEENTH, THIRTY_SECOND]),
}).annotate({ description: "The meter from this bar on." });

export type MeterChange = typeof MeterChangeSchema.Type;

export const TempoChangeSchema = Schema.Struct({
  ...positionFields,
  bpm: Schema.Finite.check(Schema.isBetween({ minimum: SLOWEST_BPM, maximum: FASTEST_BPM })),
}).annotate({ description: "Beats per minute from this position on." });

export type TempoChange = typeof TempoChangeSchema.Type;

export const SectionSchema = Schema.Struct({
  name: Schema.NonEmptyString,
  fromBar: Bar,
  toBar: Bar,
}).annotate({ description: "A rehearsal mark over a range of bars, both ends included." });

export type Section = typeof SectionSchema.Type;

export const MarkSchema = Schema.Struct({
  bar: Bar,
  label: Schema.NonEmptyString,
}).annotate({ description: "A label the composer put at the start of a bar." });

export type Mark = typeof MarkSchema.Type;

export const PitchSchema = Schema.String.check(
  Schema.isPattern(/^[A-G](?:##|#|bb|b)?(?:-1|[0-9])$/u),
).annotate({ description: "Scientific pitch name with its spelling, such as C4, F#2 or Bb-1." });

export const BendPointSchema = Schema.Struct({
  at: Schema.Int.check(Schema.isGreaterThanOrEqualTo(NO_TICK)).annotate({
    description: "Ticks after the note starts.",
  }),
  semitones: Schema.Finite.check(Schema.isBetween({ minimum: -MAX_BEND, maximum: MAX_BEND })),
}).annotate({
  description: "The pitch offset at this point; pitch moves in a line between points.",
});

export type BendPoint = typeof BendPointSchema.Type;

const Cents = Schema.Finite.check(
  Schema.isBetween({ minimum: -HALF_SEMITONE, maximum: HALF_SEMITONE }),
).annotate({ description: "Detune from the written pitch, in cents." });

export const NoteSchema = Schema.Struct({
  ...positionFields,
  pitch: PitchSchema,
  cents: Schema.optionalKey(Cents),
  length: Counted.annotate({ description: "How long the note sounds, in ticks." }),
  velocity: Velocity,
  lyric: Schema.optionalKey(Schema.NonEmptyString).annotate({
    description: "The word or syllable sung on this note.",
  }),
  bend: Schema.optionalKey(Schema.Array(BendPointSchema)),
});

export type Note = typeof NoteSchema.Type;

export const DrumVoiceSchema = Schema.Literals([
  "kick",
  "snare",
  "side-stick",
  "clap",
  "closed-hihat",
  "pedal-hihat",
  "open-hihat",
  "low-tom",
  "mid-tom",
  "high-tom",
  "crash",
  "ride",
  "ride-bell",
  "splash",
  "china",
  "tambourine",
  "cowbell",
  "shaker",
  "high-bongo",
  "low-bongo",
  "high-conga",
  "low-conga",
  "timbale",
  "clave",
  "woodblock",
  "triangle",
  "cabasa",
  "guiro",
]);

export type DrumVoice = typeof DrumVoiceSchema.Type;

export const HitSchema = Schema.Struct({
  ...positionFields,
  voice: DrumVoiceSchema,
  velocity: Velocity,
});

export type Hit = typeof HitSchema.Type;

export const RoleSchema = Schema.Literals(["melody", "countermelody", "bass", "harmony"]);

export type Role = typeof RoleSchema.Type;

export const PitchedPartSchema = Schema.Struct({
  kind: Schema.Literal("pitched"),
  name: Schema.NonEmptyString,
  role: RoleSchema,
  notes: Schema.Array(NoteSchema),
});

export type PitchedPart = typeof PitchedPartSchema.Type;

export const DrumPartSchema = Schema.Struct({
  kind: Schema.Literal("drums"),
  name: Schema.NonEmptyString,
  hits: Schema.Array(HitSchema),
});

export type DrumPart = typeof DrumPartSchema.Type;

export const PartSchema = Schema.Union([PitchedPartSchema, DrumPartSchema]);

export type Part = typeof PartSchema.Type;

export const SongSchema = Schema.Struct({
  $schema: Schema.optionalKey(Schema.String),
  title: Schema.NonEmptyString,
  meter: Schema.NonEmptyArray(MeterChangeSchema),
  tempo: Schema.NonEmptyArray(TempoChangeSchema),
  sections: Schema.optionalKey(Schema.Array(SectionSchema)),
  marks: Schema.optionalKey(Schema.Array(MarkSchema)),
  parts: Schema.Array(PartSchema),
}).annotate({
  title: "Song",
  description:
    "What the music is: meter, tempo, and the notes of each part. Keys and chords are derived from the notes, and instruments belong to the DAW project.",
});

export type Song = typeof SongSchema.Type;
