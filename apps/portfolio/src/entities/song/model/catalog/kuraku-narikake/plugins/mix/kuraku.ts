import { textIn } from "@masseater.dev/fumx-studio/plugin/args";
import type { MixRequest } from "@masseater.dev/fumx-studio/plugin/plugin";
import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";
import type { Label } from "@masseater.dev/fumx-studio/studio/placement";
import { studioOf } from "@masseater.dev/fumx-studio/studio/studio";
import type { Studio } from "@masseater.dev/fumx-studio/studio/studio";
import type { Grid } from "@masseater.dev/fumx-studio/studio/timing";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { curvesOf } from "./curves.ts";
import type { Curves } from "./curves.ts";
import { lanePlayed } from "./lanes.ts";
import { sharedOf } from "./shared.ts";
import type { Shared } from "./shared.ts";

const SECONDS_PER_BAR_AT_ONE_BPM = 240;
const NONE = 0;
const STRAIGHT = 0.5;
const IMPULSES = { irL: "plate-left", irR: "plate-right" } as const;

export interface Kuraku {
  readonly studio: Studio;
  readonly editor: Studio;
  readonly grid: Grid;
  readonly frames: number;
  readonly bars: number;
  readonly curves: Curves;
  readonly samples: Readonly<Record<string, Float32Array>>;
  readonly shared: () => Shared;
  readonly lane: (stem: string, lane: string) => (bus: Bus) => Bus;
}

const once = <Value>(make: () => Value): (() => Value) => {
  const held: { value: Option.Option<Value> } = { value: Option.none() };
  return () =>
    Option.getOrElse(held.value, () => {
      const value = make();
      held.value = Option.some(value);
      return value;
    });
};

const tempoOf = (request: MixRequest): number =>
  pipe(
    Arr.head(request.song.bars),
    Option.match({ onNone: () => NONE, onSome: (bar) => bar.tempo.bpm }),
  );

const impulsesOf = (request: MixRequest): Readonly<Record<string, Float32Array>> =>
  pipe(
    IMPULSES,
    Rec.map((name) =>
      pipe(
        textIn(request.args)(name),
        Option.flatMap((path) => Option.fromUndefinedOr(request.samples[path])),
        Option.getOrElse(() => new Float32Array()),
      ),
    ),
  );

export const kurakuOf = (request: MixRequest): Kuraku => {
  const tempo = tempoOf(request);
  const bars = request.song.bars.length;
  const tail = Option.getOrElse(request.song.tailSeconds, () => NONE);
  const samples = impulsesOf(request);
  const session = {
    samples,
    table: {},
    seconds: (bars * SECONDS_PER_BAR_AT_ONE_BPM) / tempo + tail,
    tempo,
    swing: STRAIGHT,
    labelOf: (): Label => ({}),
  };
  const studio = studioOf({ ...session, log: Option.none(), quiet: () => true });
  const curves = curvesOf(studio.grid);
  const shape = { studio, grid: studio.grid, frames: studio.frames, curves, samples };
  return {
    ...shape,
    bars,
    editor: studioOf({ ...session, log: Option.some(request.log), quiet: () => false }),
    shared: once(() => sharedOf(shape)),
    lane: lanePlayed(request),
  };
};
