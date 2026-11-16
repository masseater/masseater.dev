import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";
import { curve } from "#/entities/song/lib/dsp/shape.ts";
import { timeOf } from "#/entities/song/lib/studio/moment.ts";
import type { Label, Ledger, SampleInfo } from "#/entities/song/lib/studio/placement.ts";
import { studioOf } from "#/entities/song/lib/studio/studio.ts";
import type { Studio } from "#/entities/song/lib/studio/studio.ts";
import type { Grid } from "#/entities/song/lib/studio/timing.ts";

import type { Automation, Clip, CurveName } from "./score-schema.ts";
import { AUTOMATION, FORM } from "./score.ts";
import { sharedOf } from "./shared.ts";
import type { Shared } from "./shared.ts";

const SECONDS_PER_BAR_AT_ONE_BPM = 240;
const NO_SHIFT = 0;

export const SECONDS = (FORM.BARS * SECONDS_PER_BAR_AT_ONE_BPM) / FORM.BPM + FORM.TAIL;

export const FRAMES = Math.ceil(SECONDS * SAMPLE_RATE);

export type Curves = Readonly<Record<CurveName, (seconds: number) => number>>;

export interface Kuraku {
  readonly studio: Studio;
  readonly editor: Studio;
  readonly grid: Grid;
  readonly frames: number;
  readonly lanes: Readonly<Record<string, readonly Clip[]>>;
  readonly curves: Curves;
  readonly samples: Readonly<Record<string, Float32Array>>;
  readonly shared: () => Shared;
}

export interface Setup {
  readonly samples: Readonly<Record<string, Float32Array>>;
  readonly table: Readonly<Record<string, SampleInfo>>;
  readonly log: Option.Option<Ledger>;
  readonly clips: readonly Clip[];
}

const pointsOf =
  (grid: Grid) =>
  (points: Automation[CurveName]): ((seconds: number) => number) =>
    curve(
      pipe(
        points,
        Arr.map(({ at, shift, value }) => [timeOf(grid)(at) + (shift ?? NO_SHIFT), value] as const),
      ),
    );

const curvesOf = (grid: Grid, automation: Automation): Curves =>
  pipe(automation, Rec.map(pointsOf(grid)));

const once = <Value>(make: () => Value): (() => Value) => {
  const held: { value: Option.Option<Value> } = { value: Option.none() };
  return () =>
    Option.getOrElse(held.value, () => {
      const value = make();
      held.value = Option.some(value);
      return value;
    });
};

export const kurakuOf = ({ samples, table, log, clips }: Setup): Kuraku => {
  const session = {
    samples,
    table,
    seconds: SECONDS,
    tempo: FORM.BPM,
    swing: FORM.SWING,
    labelOf: (): Label => ({}),
    log,
  };
  const studio = studioOf({ ...session, quiet: () => true });
  const curves = curvesOf(studio.grid, AUTOMATION);
  const shape = { studio, grid: studio.grid, frames: studio.frames, curves, samples };
  return {
    ...shape,
    editor: studioOf({ ...session, quiet: () => false }),
    lanes: Arr.groupBy(clips, (clip) => clip.lane),
    shared: once(() => sharedOf(shape)),
  };
};
