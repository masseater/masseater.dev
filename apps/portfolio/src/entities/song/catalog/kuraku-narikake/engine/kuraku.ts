import { SAMPLE_RATE } from "@masseater.dev/fumx-studio/dsp/number";
import { curve } from "@masseater.dev/fumx-studio/dsp/shape";
import { timeOf } from "@masseater.dev/fumx-studio/studio/moment";
import type { Label, Ledger, SampleInfo } from "@masseater.dev/fumx-studio/studio/placement";
import { studioOf } from "@masseater.dev/fumx-studio/studio/studio";
import type { Studio } from "@masseater.dev/fumx-studio/studio/studio";
import type { Grid } from "@masseater.dev/fumx-studio/studio/timing";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

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
