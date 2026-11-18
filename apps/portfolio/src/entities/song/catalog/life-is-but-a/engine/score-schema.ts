import { AtSchema, LengthSchema } from "@masseater.dev/fumx-studio/studio/moment";
import { Schema } from "effect";

const Text = Schema.String;
const Flag = Schema.Boolean;
const maybe = Schema.optionalKey;
const Keys = Schema.Array(Schema.Finite);
const Glide = Schema.Array(Schema.Tuple([Schema.Finite, Schema.Finite]));

const kind = <Name extends string>(name: Name): { readonly kind: Schema.Literal<Name> } => ({
  kind: Schema.Literal(name),
});

const Struck = { bar: Schema.Finite, step: Schema.Finite, velocity: Schema.Finite };

const Drums = Schema.Struct({
  ...kind("drums"),
  bar: Schema.Finite,
  kick: maybe(Text),
  clap: maybe(Schema.Union([Text, Flag])),
  ghost: maybe(Text),
  hats: maybe(Schema.Finite),
  busyHats: maybe(Flag),
  open: maybe(Schema.Finite),
  shaker: maybe(Schema.Finite),
  percussion: maybe(Schema.Finite),
  ride: maybe(Schema.Finite),
});

const Hat = Schema.Struct({ ...kind("hat"), ...Struck });

const Amen = Schema.Struct({
  ...kind("amen"),
  bar: Schema.Finite,
  step: Schema.Finite,
  slice: Schema.Finite,
  steps: Schema.Finite,
  shift: maybe(Schema.Finite),
  gain: maybe(Schema.Finite),
});

const Roll = Schema.Struct({
  ...kind("roll"),
  bar: Schema.Finite,
  from: Schema.Finite,
  to: Schema.Finite,
  sample: Text,
  startGain: Schema.Finite,
  endGain: Schema.Finite,
  accelerate: maybe(Flag),
  rise: maybe(Schema.Finite),
  division: maybe(Schema.Finite),
  highPass: maybe(Schema.Finite),
});

const Shaker = Schema.Struct({ ...kind("shaker"), bar: Schema.Finite, level: Schema.Finite });

const Percussion = Schema.Struct({
  ...kind("percussion"),
  ...Struck,
  sample: Text,
  pan: maybe(Schema.Finite),
  duration: maybe(Schema.Finite),
  highPass: maybe(Schema.Finite),
  semitones: maybe(Schema.Finite),
});

const Crash = Schema.Struct({
  ...kind("crash"),
  bar: Schema.Finite,
  step: maybe(Schema.Finite),
  gain: maybe(Schema.Finite),
});

const Riser = Schema.Struct({
  ...kind("riser"),
  bar: Schema.Finite,
  seconds: Schema.Finite,
  gain: Schema.Finite,
});

const BassBar = Schema.Struct({
  ...kind("bassBar"),
  bar: Schema.Finite,
  pattern: Text,
  thick: maybe(Schema.Finite),
});

const BassNote = Schema.Struct({
  ...kind("bassNote"),
  bar: Schema.Finite,
  step: Schema.Finite,
  length: Schema.Finite,
  key: Schema.Finite,
  sweep: maybe(Schema.Finite),
  from: maybe(Schema.Finite),
  glide: maybe(Schema.Finite),
  to: maybe(Schema.Finite),
  toAt: maybe(Schema.Finite),
  amount: maybe(Schema.Finite),
});

const OrganBar = Schema.Struct({
  ...kind("organBar"),
  bar: Schema.Finite,
  pattern: Text,
  top: maybe(Schema.Finite),
  invert: maybe(Flag),
  gain: maybe(Schema.Finite),
});

const Chorded = {
  bar: Schema.Finite,
  step: Schema.Finite,
  length: Schema.Finite,
  keys: Keys,
  gain: maybe(Schema.Finite),
  release: maybe(Schema.Finite),
};

const OrganHit = Schema.Struct({ ...kind("organHit"), ...Chorded });

const Piano = Schema.Struct({ ...kind("piano"), ...Chorded, strum: maybe(Schema.Finite) });

const Pad = Schema.Struct({
  ...kind("pad"),
  bar: Schema.Finite,
  bars: Schema.Finite,
  keys: Keys,
  gain: maybe(Schema.Finite),
  lowPass: maybe(Schema.Finite),
});

const Voiced = {
  bus: Text,
  key: Schema.Finite,
  at: AtSchema,
  length: LengthSchema,
  gain: maybe(Schema.Finite),
  send: maybe(Schema.Finite),
  delay: maybe(Schema.Finite),
  pan: maybe(Schema.Finite),
  attack: maybe(Schema.Finite),
  release: maybe(Schema.Finite),
  highPass: maybe(Schema.Finite),
  mode: maybe(Text),
  grain: maybe(Schema.Finite),
};

const Chop = Schema.Struct({ ...kind("chop"), ...Voiced, voice: Text });

const Say = Schema.Struct({ ...kind("say"), ...Voiced, syllable: Text, pitch: maybe(Glide) });

const Choir = Schema.Struct({ ...kind("choir"), ...Voiced, singer: Text, index: Schema.Finite });

const Lead = Schema.Struct({
  ...kind("lead"),
  bar: Schema.Finite,
  notes: Schema.Array(
    Schema.Struct({ step: Schema.Finite, length: Schema.Finite, key: Schema.Finite }),
  ),
  cut: maybe(Schema.Finite),
  send: maybe(Schema.Finite),
  delay: maybe(Schema.Finite),
  voice: maybe(Text),
  transpose: maybe(Schema.Finite),
  pan: maybe(Schema.Finite),
  gain: maybe(Schema.Finite),
  prefer: maybe(Schema.Finite),
  bus: maybe(Text),
});

const Dream = Schema.Struct({
  ...kind("dream"),
  bar: Schema.Finite,
  step: Schema.Finite,
  length: LengthSchema,
  transpose: Schema.Finite,
  gain: Schema.Finite,
  notes: maybe(Keys),
  mode: maybe(Text),
});

const Mosaic = Schema.Struct({
  ...kind("mosaic"),
  bar: Schema.Finite,
  level: Schema.Finite,
  density: Schema.Finite,
});

const WordSource = Schema.Struct({
  word: Schema.Struct({
    syllable: Text,
    key: Schema.Finite,
    seconds: Schema.Finite,
    mode: maybe(Text),
  }),
});

const Paste = Schema.Struct({
  ...kind("paste"),
  bus: Text,
  source: Schema.Union([Text, WordSource, Schema.Struct({ spoken: Flag })]),
  at: AtSchema,
  placement: Schema.Struct({
    gain: maybe(Schema.Finite),
    pan: maybe(Schema.Finite),
    release: maybe(Schema.Finite),
    attack: maybe(Schema.Finite),
    lowPass: maybe(Schema.Finite),
    highPass: maybe(Schema.Finite),
    semitones: maybe(Schema.Finite),
    offset: maybe(Schema.Finite),
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
