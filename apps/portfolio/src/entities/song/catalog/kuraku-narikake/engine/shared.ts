import { Array as Arr, pipe } from "effect";

import type { Impulse } from "#/entities/song/lib/dsp/convolve-pair.ts";
import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";
import { timeOf } from "#/entities/song/lib/studio/moment.ts";
import type { At } from "#/entities/song/lib/studio/moment.ts";
import { gated } from "#/entities/song/lib/studio/send.ts";
import type { GateMode, Window } from "#/entities/song/lib/studio/send.ts";
import type { Studio } from "#/entities/song/lib/studio/studio.ts";
import type { Grid } from "#/entities/song/lib/studio/timing.ts";

import { hallOf, plateOf } from "./impulses.ts";
import type { Curves } from "./kuraku.ts";
import { CUES, MIX, SECTIONS } from "./score.ts";

const SPILL = 512;
const EDGE = 3e-3;
const OPEN = 1;
const FIRST = 0;
const ONE = 1;
const SILENT = 0;
const DUCK = { kicks: { hold: 0.03, release: 0.12 }, hits: { hold: 0.02, release: 0.14 } } as const;

export interface Shape {
  readonly studio: Studio;
  readonly grid: Grid;
  readonly frames: number;
  readonly curves: Curves;
  readonly samples: Readonly<Record<string, Float32Array>>;
}

export interface Shared {
  readonly plate: Impulse;
  readonly hall: Impulse;
  readonly kicks: Float32Array;
  readonly hits: Float32Array;
  readonly main: Float32Array;
  readonly museum: Float32Array;
  readonly start: number;
  readonly end: number;
}

export const windowsOf =
  (grid: Grid) =>
  (spans: readonly Readonly<{ from: At; to: At }>[]): readonly Window[] =>
    pipe(
      spans,
      Arr.map(({ from, to }) => [timeOf(grid)(from), timeOf(grid)(to)] as const),
    );

interface Envelope {
  readonly windows: readonly Window[];
  readonly mode: GateMode;
  readonly gain: (seconds: number) => number;
  readonly level: number;
}

const envelopeOf = (
  shape: Shape,
  [start, end]: readonly [number, number],
  envelope: Envelope,
): Float32Array => {
  const gate = shape.studio.bus({ mono: true });
  gate.left.fill(OPEN, start, end);
  gated(shape.frames)({ windows: envelope.windows, mode: envelope.mode, edge: EDGE })(gate);
  const out = new Float32Array(end - start);
  for (let index = FIRST; index < out.length; index += ONE) {
    out[index] =
      (gate.left[start + index] ?? SILENT) *
      envelope.gain((start + index) / SAMPLE_RATE) *
      envelope.level;
  }
  return out;
};

export const sharedOf = (shape: Shape): Shared => {
  const at = (point: At): number => Math.round(timeOf(shape.grid)(point) * SAMPLE_RATE);
  const start = at(SECTIONS.museum.from) - SPILL;
  const end = at(SECTIONS.museum.to) + SPILL;
  const flashes = windowsOf(shape.grid)(CUES.flashes);
  return {
    plate: plateOf(shape.samples),
    hall: hallOf(shape.samples),
    kicks: shape.studio.duck({ times: CUES.kicks, ...DUCK.kicks }),
    hits: shape.studio.duck({ times: [...CUES.kicks, ...CUES.snares], ...DUCK.hits }),
    main: envelopeOf(shape, [start, end], {
      windows: flashes,
      mode: "cut",
      gain: shape.curves.mainGain,
      level: ONE,
    }),
    museum: envelopeOf(shape, [start, end], {
      windows: [...windowsOf(shape.grid)(SECTIONS.museumOpen), ...flashes],
      mode: "keep",
      gain: shape.curves.museumGain,
      level: MIX.returns.museum,
    }),
    start,
    end,
  };
};
