import { Schema } from "effect";

import mastering from "#/entities/song/catalog/kuraku-narikake/score/mastering.json";
import { scoreOf } from "#/entities/song/lib/studio/score.ts";

const { Finite } = Schema;

const KneeSchema = Schema.Struct({ threshold: Finite, knee: Finite });

const BandSchema = Schema.Struct({
  threshold: Finite,
  ratio: Finite,
  attack: Finite,
  release: Finite,
  knee: Finite,
  makeup: Finite,
  clip: KneeSchema,
});

const DrumSchema = Schema.Struct({
  threshold: Finite,
  ratio: Finite,
  attack: Finite,
  release: Finite,
  makeup: Finite,
  sidechainHighPass: Finite,
  pre: Finite,
  post: Finite,
  clip: KneeSchema,
  out: Finite,
});

const EqSchema = Schema.Struct({
  kind: Schema.Literals(["peak", "high"]),
  hertz: Finite,
  resonance: Finite,
  gain: Finite,
});

const LimitSchema = Schema.Struct({
  ceiling: Finite,
  lookahead: Finite,
  release: Finite,
  every: Finite,
  truePeak: Schema.Boolean,
});

const MasteringSchema = Schema.Struct({
  drum: DrumSchema,
  butterworth: Finite,
  highPass: Finite,
  eq: Schema.Array(EqSchema),
  monoBelow: Finite,
  width: Finite,
  crossover: Schema.Struct({ low: Finite, high: Finite }),
  bands: Schema.Tuple([BandSchema, BandSchema, BandSchema]),
  gain: Finite,
  clip: KneeSchema,
  limit: LimitSchema,
  every: Finite,
  block: Finite,
  slew: Finite,
  fade: Schema.Struct({ before: Finite, length: Finite }),
  ceiling: Finite,
});

export const MASTER = scoreOf(MasteringSchema)("mastering", mastering);
