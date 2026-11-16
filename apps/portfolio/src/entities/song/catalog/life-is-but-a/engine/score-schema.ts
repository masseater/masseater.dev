import { Schema } from "effect";

import { AtSchema, LengthSchema } from "#/entities/song/lib/studio/moment.ts";

const { Finite } = Schema;
const Text = Schema.String;
const Flag = Schema.Boolean;
const maybe = Schema.optionalKey;
const Keys = Schema.Array(Finite);
const Glide = Schema.Array(Schema.Tuple([Finite, Finite]));

const kind = <Name extends string>(name: Name): { readonly kind: Schema.Literal<Name> } => ({
  kind: Schema.Literal(name),
});

const Struck = { bar: Finite, step: Finite, velocity: Finite };

const Drums = Schema.Struct({
  ...kind("drums"),
  bar: Finite,
  kick: maybe(Text),
  clap: maybe(Schema.Union([Text, Flag])),
  ghost: maybe(Text),
  hats: maybe(Finite),
  busyHats: maybe(Flag),
  open: maybe(Finite),
  shaker: maybe(Finite),
  percussion: maybe(Finite),
  ride: maybe(Finite),
});

const Hat = Schema.Struct({ ...kind("hat"), ...Struck });

const Amen = Schema.Struct({
  ...kind("amen"),
  bar: Finite,
  step: Finite,
  slice: Finite,
  steps: Finite,
  shift: maybe(Finite),
  gain: maybe(Finite),
});

const Roll = Schema.Struct({
  ...kind("roll"),
  bar: Finite,
  from: Finite,
  to: Finite,
  sample: Text,
  startGain: Finite,
  endGain: Finite,
  accelerate: maybe(Flag),
  rise: maybe(Finite),
  division: maybe(Finite),
  highPass: maybe(Finite),
});

const Shaker = Schema.Struct({ ...kind("shaker"), bar: Finite, level: Finite });

const Percussion = Schema.Struct({
  ...kind("percussion"),
  ...Struck,
  sample: Text,
  pan: maybe(Finite),
  duration: maybe(Finite),
  highPass: maybe(Finite),
  semitones: maybe(Finite),
});

const Crash = Schema.Struct({
  ...kind("crash"),
  bar: Finite,
  step: maybe(Finite),
  gain: maybe(Finite),
});

const Riser = Schema.Struct({ ...kind("riser"), bar: Finite, seconds: Finite, gain: Finite });

const BassBar = Schema.Struct({
  ...kind("bassBar"),
  bar: Finite,
  pattern: Text,
  thick: maybe(Finite),
});

const BassNote = Schema.Struct({
  ...kind("bassNote"),
  bar: Finite,
  step: Finite,
  length: Finite,
  key: Finite,
  sweep: maybe(Finite),
  from: maybe(Finite),
  glide: maybe(Finite),
  to: maybe(Finite),
  toAt: maybe(Finite),
  amount: maybe(Finite),
});

const OrganBar = Schema.Struct({
  ...kind("organBar"),
  bar: Finite,
  pattern: Text,
  top: maybe(Finite),
  invert: maybe(Flag),
  gain: maybe(Finite),
});

const Chorded = {
  bar: Finite,
  step: Finite,
  length: Finite,
  keys: Keys,
  gain: maybe(Finite),
  release: maybe(Finite),
};

const OrganHit = Schema.Struct({ ...kind("organHit"), ...Chorded });

const Piano = Schema.Struct({ ...kind("piano"), ...Chorded, strum: maybe(Finite) });

const Pad = Schema.Struct({
  ...kind("pad"),
  bar: Finite,
  bars: Finite,
  keys: Keys,
  gain: maybe(Finite),
  lowPass: maybe(Finite),
});

const Voiced = {
  bus: Text,
  key: Finite,
  at: AtSchema,
  length: LengthSchema,
  gain: maybe(Finite),
  send: maybe(Finite),
  delay: maybe(Finite),
  pan: maybe(Finite),
  attack: maybe(Finite),
  release: maybe(Finite),
  highPass: maybe(Finite),
  mode: maybe(Text),
  grain: maybe(Finite),
};

const Chop = Schema.Struct({ ...kind("chop"), ...Voiced, voice: Text });

const Say = Schema.Struct({ ...kind("say"), ...Voiced, syllable: Text, pitch: maybe(Glide) });

const Choir = Schema.Struct({ ...kind("choir"), ...Voiced, singer: Text, index: Finite });

const Lead = Schema.Struct({
  ...kind("lead"),
  bar: Finite,
  notes: Schema.Array(Schema.Struct({ step: Finite, length: Finite, key: Finite })),
  cut: maybe(Finite),
  send: maybe(Finite),
  delay: maybe(Finite),
  voice: maybe(Text),
  transpose: maybe(Finite),
  pan: maybe(Finite),
  gain: maybe(Finite),
  prefer: maybe(Finite),
  bus: maybe(Text),
});

const Dream = Schema.Struct({
  ...kind("dream"),
  bar: Finite,
  step: Finite,
  length: LengthSchema,
  transpose: Finite,
  gain: Finite,
  notes: maybe(Keys),
  mode: maybe(Text),
});

const Mosaic = Schema.Struct({ ...kind("mosaic"), bar: Finite, level: Finite, density: Finite });

const WordSource = Schema.Struct({
  word: Schema.Struct({ syllable: Text, key: Finite, seconds: Finite, mode: maybe(Text) }),
});

const Paste = Schema.Struct({
  ...kind("paste"),
  bus: Text,
  source: Schema.Union([Text, WordSource, Schema.Struct({ spoken: Flag })]),
  at: AtSchema,
  placement: Schema.Struct({
    gain: maybe(Finite),
    pan: maybe(Finite),
    release: maybe(Finite),
    attack: maybe(Finite),
    lowPass: maybe(Finite),
    highPass: maybe(Finite),
    semitones: maybe(Finite),
    offset: maybe(Finite),
    length: maybe(LengthSchema),
  }),
});

const Random = Schema.Struct({ ...kind("random") });

export const EventSchema = Schema.Union([
  Drums,
  Hat,
  Amen,
  Roll,
  Shaker,
  Percussion,
  Crash,
  Riser,
  BassBar,
  BassNote,
  OrganBar,
  OrganHit,
  Piano,
  Pad,
  Chop,
  Say,
  Choir,
  Lead,
  Dream,
  Mosaic,
  Paste,
  Random,
]);

export type Event = typeof EventSchema.Type;

export const ArrangementSchema = Schema.Record(Text, Schema.Array(EventSchema));
