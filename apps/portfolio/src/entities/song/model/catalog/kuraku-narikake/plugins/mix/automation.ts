import type { Lane } from "@masseater.dev/fumx-studio/daw/view";
import { timeOf } from "@masseater.dev/fumx-studio/studio/moment";
import { Array as Arr, pipe } from "effect";

import type { Kuraku } from "./kuraku.ts";
import { CUES, SECTIONS } from "./score.ts";
import { windowsOf } from "./shared.ts";

const STEPS_PER_BAR = 16;
const ONE = 1;
const FIRST = 0;
const SILENT = 0;
const OPEN_CUTOFF = 2e4;
const LANES = {
  master: { low: 300, high: 2e4, log: 1, unit: "Hz" },
  drums: { low: 2500, high: 2e4, log: 1, unit: "Hz" },
  museum: { low: 0, high: 1, unit: "" },
} as const;

const valuesOf =
  (count: number) =>
  (value: (point: number) => number): Float32Array => {
    const values = new Float32Array(count);
    for (let point = FIRST; point < count; point += ONE) {
      values[point] = value(point);
    }
    return values;
  };

const masterLowPass = (kuraku: Kuraku): ((time: number) => number) => {
  const from = timeOf(kuraku.grid)(SECTIONS.masterOpen.from);
  const to = timeOf(kuraku.grid)(SECTIONS.masterOpen.to);
  return (time) => {
    if (time > from && time < to) {
      return OPEN_CUTOFF;
    }
    return kuraku.curves.museumLowPass(time);
  };
};

const museumLevel = (kuraku: Kuraku): ((time: number) => number) => {
  const shown = [
    ...windowsOf(kuraku.grid)(SECTIONS.museumShown),
    ...windowsOf(kuraku.grid)(CUES.flashes),
  ];
  return (time) => {
    if (
      pipe(
        shown,
        Arr.some(([from, to]) => time >= from && time < to),
      )
    ) {
      return kuraku.curves.museumGain(time);
    }
    return SILENT;
  };
};

export const lanesOf = (kuraku: Kuraku): Readonly<Record<string, Lane>> => {
  const timeAt = (point: number): number => (point * kuraku.grid.bar) / STEPS_PER_BAR;
  const master = masterLowPass(kuraku);
  const museum = museumLevel(kuraku);
  const sampled = valuesOf(kuraku.bars * STEPS_PER_BAR + ONE);
  return {
    "MASTERING LP": { values: sampled((point) => master(timeAt(point))), ...LANES.master },
    "DRUM LP": {
      values: sampled((point) => kuraku.curves.drumLowPass(timeAt(point))),
      ...LANES.drums,
    },
    MUSEUM: { values: sampled((point) => museum(timeAt(point))), ...LANES.museum },
  };
};
