import { Array as Arr, Schema, pipe } from "effect";

import { SAMPLE_RATE, decibels } from "#/entities/song/lib/dsp/number.ts";
import type { Blocks } from "#/entities/song/lib/live/tape.ts";
import { onePole, smoothingOf } from "#/entities/song/lib/studio/dynamics.ts";

import { designed } from "./coefficients.ts";
import type { Coefficients } from "./coefficients.ts";
import { MASTER } from "./mastering.ts";

const ONE = 1;
const TWO = 2;
const BANDS = 3;
const STATE_SLOTS = 256;
const ENVELOPES = 8;
const SILENT = 0;
const CURSOR = { position: 0, sideLow: 1, size: 2 } as const;

export const CurvesSchema = Schema.Struct({
  drum: Schema.instanceOf(Float32Array),
  low: Schema.instanceOf(Float32Array),
  mid: Schema.instanceOf(Float32Array),
  high: Schema.instanceOf(Float32Array),
  limit: Schema.instanceOf(Float32Array),
});

export type MasterCurves = typeof CurvesSchema.Type;

export interface Gains {
  readonly left: Float32Array;
  readonly right: Float32Array;
}

export interface Buffers {
  readonly drumLeft: Float32Array;
  readonly drumRight: Float32Array;
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly rampLeft: Float32Array;
  readonly rampRight: Float32Array;
  readonly mid: Float32Array;
  readonly side: Float32Array;
  readonly bands: readonly [
    readonly [Float32Array, Float32Array, Float32Array],
    readonly [Float32Array, Float32Array, Float32Array],
  ];
  readonly scratch: Float32Array;
}

export interface Filters {
  readonly highPass: Coefficients;
  readonly eq: readonly Coefficients[];
  readonly lowFirst: Coefficients;
  readonly highFirst: Coefficients;
  readonly lowSecond: Coefficients;
  readonly highSecond: Coefficients;
  readonly allPass: Coefficients;
}

export interface Smoothing {
  readonly attack: number;
  readonly release: number;
}

export interface Core {
  readonly frames: number;
  readonly drums: readonly boolean[];
  readonly tape: Blocks;
  readonly curves: MasterCurves;
  readonly gains: Gains;
  readonly buffers: Buffers;
  readonly filters: Filters;
  readonly mono: number;
  readonly drum: Smoothing & Readonly<{ highPass: number; threshold: number; makeup: number }>;
  readonly bands: readonly Smoothing[];
  readonly step: number;
  readonly cursor: Float64Array;
  readonly state: Float64Array;
  readonly envelopes: Float64Array;
}

const buffer = (): Float32Array => new Float32Array(MASTER.block);

const triple = (): readonly [Float32Array, Float32Array, Float32Array] => [
  buffer(),
  buffer(),
  buffer(),
];

const heldCurve = (length: number): Float32Array<ArrayBuffer> => new Float32Array(length).fill(ONE);

export const curvesFor = (frames: number): MasterCurves => {
  const length = Math.ceil(frames / MASTER.every) + TWO;
  return {
    drum: heldCurve(length),
    low: heldCurve(length),
    mid: heldCurve(length),
    high: heldCurve(length),
    limit: heldCurve(Math.ceil(frames / MASTER.limit.every) + TWO),
  };
};

const filtersOf = (): Filters => {
  const { low, high } = MASTER.crossover;
  const resonance = MASTER.butterworth;
  return {
    highPass: designed({ kind: "hp", hertz: MASTER.highPass, resonance }),
    eq: pipe(
      MASTER.eq,
      Arr.map((band) => designed(band)),
    ),
    lowFirst: designed({ kind: "lp", hertz: low, resonance }),
    highFirst: designed({ kind: "hp", hertz: low, resonance }),
    lowSecond: designed({ kind: "lp", hertz: high, resonance }),
    highSecond: designed({ kind: "hp", hertz: high, resonance }),
    allPass: designed({ kind: "ap", hertz: high, resonance }),
  };
};

export interface CoreSetup {
  readonly frames: number;
  readonly drums: readonly boolean[];
  readonly tape: Blocks;
  readonly curves: MasterCurves;
}

export const coreOf = ({ frames, drums, tape, curves }: CoreSetup): Core => ({
  frames,
  drums,
  tape,
  curves,
  gains: {
    left: new Float32Array(drums.length).fill(ONE),
    right: new Float32Array(drums.length).fill(ONE),
  },
  buffers: {
    drumLeft: buffer(),
    drumRight: buffer(),
    left: buffer(),
    right: buffer(),
    rampLeft: buffer(),
    rampRight: buffer(),
    mid: buffer(),
    side: buffer(),
    bands: [triple(), triple()],
    scratch: buffer(),
  },
  filters: filtersOf(),
  mono: onePole(MASTER.monoBelow),
  drum: {
    attack: smoothingOf(MASTER.drum.attack),
    release: smoothingOf(MASTER.drum.release),
    highPass: onePole(MASTER.drum.sidechainHighPass),
    threshold: decibels(MASTER.drum.threshold),
    makeup: decibels(MASTER.drum.makeup),
  },
  bands: pipe(
    MASTER.bands,
    Arr.take(BANDS),
    Arr.map((band) => ({ attack: smoothingOf(band.attack), release: smoothingOf(band.release) })),
  ),
  step: ONE / (MASTER.slew * SAMPLE_RATE),
  cursor: new Float64Array(CURSOR.size),
  state: new Float64Array(STATE_SLOTS),
  envelopes: new Float64Array(ENVELOPES),
});

export const positionOf = (core: Core): number => core.cursor[CURSOR.position] ?? SILENT;

export const advance =
  (frames: number) =>
  (core: Core): void => {
    core.cursor[CURSOR.position] = positionOf(core) + frames;
  };

export const sideLowOf = (core: Core): number => core.cursor[CURSOR.sideLow] ?? SILENT;

export const keepSideLow =
  (value: number) =>
  (core: Core): void => {
    core.cursor[CURSOR.sideLow] = value;
  };

export const seek =
  (frame: number) =>
  (core: Core): void => {
    core.state.fill(SILENT);
    core.envelopes.fill(SILENT);
    keepSideLow(SILENT)(core);
    core.cursor[CURSOR.position] = Math.max(SILENT, Math.min(core.frames, Math.round(frame)));
  };
