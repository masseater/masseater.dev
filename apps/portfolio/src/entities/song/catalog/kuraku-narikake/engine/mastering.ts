import { scoreOf } from "@masseater.dev/fumx-studio/studio/score";
import { Schema } from "effect";

import mastering from "#/entities/song/catalog/kuraku-narikake/score/mastering.json";

const KneeSchema = Schema.Struct({ threshold: Schema.Finite, knee: Schema.Finite });

const BandSchema = Schema.Struct({
  threshold: Schema.Finite,
  ratio: Schema.Finite,
  attack: Schema.Finite,
  release: Schema.Finite,
  knee: Schema.Finite,
  makeup: Schema.Finite,
  clip: KneeSchema,
});

const DrumSchema = Schema.Struct({
  threshold: Schema.Finite,
  ratio: Schema.Finite,
  attack: Schema.Finite,
  release: Schema.Finite,
  makeup: Schema.Finite,
  sidechainHighPass: Schema.Finite,
  pre: Schema.Finite,
  post: Schema.Finite,
  clip: KneeSchema,
  out: Schema.Finite,
});

const EqSchema = Schema.Struct({
  kind: Schema.Literals(["peak", "high"]),
  hertz: Schema.Finite,
  resonance: Schema.Finite,
  gain: Schema.Finite,
});

const LimitSchema = Schema.Struct({
  ceiling: Schema.Finite,
  lookahead: Schema.Finite,
  release: Schema.Finite,
  every: Schema.Finite,
  truePeak: Schema.Boolean,
});

const MasteringSchema = Schema.Struct({
  drum: DrumSchema,
  butterworth: Schema.Finite,
  highPass: Schema.Finite,
  eq: Schema.Array(EqSchema),
  monoBelow: Schema.Finite,
  width: Schema.Finite,
  crossover: Schema.Struct({ low: Schema.Finite, high: Schema.Finite }),
  bands: Schema.Tuple([BandSchema, BandSchema, BandSchema]),
  gain: Schema.Finite,
  clip: KneeSchema,
  limit: LimitSchema,
  every: Schema.Finite,
  block: Schema.Finite,
  slew: Schema.Finite,
  fade: Schema.Struct({ before: Schema.Finite, length: Schema.Finite }),
  ceiling: Schema.Finite,
});

export const MASTER = scoreOf(MasteringSchema)("mastering", mastering);
