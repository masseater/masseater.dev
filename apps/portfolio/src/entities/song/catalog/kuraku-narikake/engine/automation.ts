import { Array as Arr, pipe } from "effect";

import { timeOf } from "#/entities/song/lib/studio/moment.ts";
import type { Lane } from "#/entities/song/model/form.ts";

import type { Kuraku } from "./kuraku.ts";
import { CUES, FORM, SECTIONS } from "./score.ts";
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

const COUNT = FORM.BARS * STEPS_PER_BAR + ONE;

const valuesOf = (value: (point: number) => number): Float32Array => {
  const values = new Float32Array(COUNT);
  for (let point = FIRST; point < COUNT; point += ONE) {
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

export const automationOf = (kuraku: Kuraku): Readonly<Record<string, Lane>> => {
  const timeAt = (point: number): number => (point * kuraku.grid.bar) / STEPS_PER_BAR;
  const master = masterLowPass(kuraku);
  const museum = museumLevel(kuraku);
  return {
    "MASTER LP": { values: valuesOf((point) => master(timeAt(point))), ...LANES.master },
    "DRUM LP": {
      values: valuesOf((point) => kuraku.curves.drumLowPass(timeAt(point))),
      ...LANES.drums,
    },
    MUSEUM: { values: valuesOf((point) => museum(timeAt(point))), ...LANES.museum },
  };
};
