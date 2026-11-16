import { Array as Arr, Predicate, pipe } from "effect";

import automation from "#/entities/song/catalog/life-is-but-a/score/automation.json";
import { SVF, svf } from "#/entities/song/lib/dsp/filter.ts";
import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";
import { curve } from "#/entities/song/lib/dsp/shape.ts";
import type { Point } from "#/entities/song/lib/dsp/shape.ts";
import type { Bus } from "#/entities/song/lib/studio/bus.ts";
import type { Grid } from "#/entities/song/lib/studio/timing.ts";

import type { Life } from "./context.ts";

const NONE = 0;

const WALL = { first: 0.75, second: 0.6, rise: 0.8 };

interface Anchor {
  readonly bar: number;
  readonly step: number;
  readonly value: number;
  readonly after?: number;
}

const pointsOf =
  (grid: Grid) =>
  (anchors: readonly Anchor[]): readonly Point[] =>
    pipe(
      anchors,
      Arr.map(({ bar, step, value, after }): Point => {
        const time = grid.at(bar, step);
        if (Predicate.isUndefined(after)) {
          return [time, value];
        }
        return [time + after, value];
      }),
    );

export interface Walls {
  readonly cutoff: (seconds: number) => number;
  readonly gain: (seconds: number) => number;
  readonly highPass: (seconds: number) => number;
}

export const wallsOf = (grid: Grid): Walls => ({
  cutoff: curve(pointsOf(grid)(automation.wallCutoff)),
  gain: curve(pointsOf(grid)(automation.wallGain)),
  highPass: curve(pointsOf(grid)(automation.wallHighPass)),
});

const frameAt = (grid: Grid, { bar, step }: Readonly<{ bar: number; step: number }>): number =>
  Math.round(grid.at(bar, step) * SAMPLE_RATE);

const cutoffOf =
  (walls: Walls) =>
  (index: number): number =>
    walls.cutoff(index / SAMPLE_RATE);

const closedIn =
  (life: Life, walls: Walls) =>
  (bus: Bus): void => {
    const ranges = [
      [NONE, frameAt(life.grid, automation.wallOpen.from)],
      [frameAt(life.grid, automation.wallOpen.until), life.studio.frames],
    ] as const;
    const cutoff = cutoffOf(walls);
    for (const [from, to] of ranges) {
      for (const channel of [bus.left, bus.right]) {
        svf({ kind: SVF.low, cutoff, resonance: WALL.first, from, to })(channel);
        svf({ kind: SVF.low, cutoff, resonance: WALL.second, from, to })(channel);
      }
    }
  };

const risen =
  (life: Life, walls: Walls) =>
  (bus: Bus): void => {
    const from = frameAt(life.grid, automation.wallRise.from);
    const to = frameAt(life.grid, automation.wallRise.to);
    for (const channel of [bus.left, bus.right]) {
      svf({
        kind: SVF.high,
        cutoff: (index) => walls.highPass(index / SAMPLE_RATE),
        resonance: WALL.rise,
        from,
        to,
      })(channel);
    }
  };

export const walled =
  (life: Life) =>
  (bus: Bus): void => {
    const walls = wallsOf(life.grid);
    closedIn(life, walls)(bus);
    life.studio.gain(walls.gain)(bus);
    risen(life, walls)(bus);
  };
