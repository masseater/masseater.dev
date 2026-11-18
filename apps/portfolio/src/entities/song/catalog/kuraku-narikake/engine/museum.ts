import { convolvePair } from "@masseater.dev/fumx-studio/dsp/convolve-pair";
import { SVF, svf } from "@masseater.dev/fumx-studio/dsp/filter";
import { SAMPLE_RATE } from "@masseater.dev/fumx-studio/dsp/number";
import { activeIn } from "@masseater.dev/fumx-studio/studio/activity";
import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";
import { timeOf } from "@masseater.dev/fumx-studio/studio/moment";
import type { At } from "@masseater.dev/fumx-studio/studio/moment";
import { Option } from "effect";

import type { Kuraku } from "./kuraku.ts";
import { SECTIONS } from "./score.ts";
import type { Shared } from "./shared.ts";

const PRE_DELAY = 0.045;
const HALL_SHARE = 0.55;
const RISE = 3;
const HALF = 0.5;
const ONE = 1;
const SILENT = 0;
const FIRST = 0;
const HALL_GAIN = 56e-4;
const MUSEUM_CUT = { hertz: 75, resonance: 0.7, pad: 0.2 } as const;
const DELAY = Math.round(PRE_DELAY * SAMPLE_RATE);

const HEARD = 1;

interface Hall {
  readonly send: Float32Array;
  readonly heard: Uint8Array;
}

const added = (hall: Hall, index: number, value: number): void => {
  if (value !== SILENT) {
    hall.send[index] = (hall.send[index] ?? SILENT) + value;
    hall.heard[FIRST] = HEARD;
  }
};

const risen = (
  kuraku: Kuraku,
  main: Bus,
  [hall, shared, delay]: readonly [Hall, Shared, number],
): void => {
  const at = (point: At): number => Math.round(timeOf(kuraku.grid)(point) * SAMPLE_RATE);
  const start = at(SECTIONS.hallRise.from);
  const end = at(SECTIONS.hallRise.to);
  for (let index = start; index < end; index += ONE) {
    const value =
      ((main.left[index] ?? SILENT) + (main.right[index] ?? SILENT)) *
      HALF *
      HALL_SHARE *
      Math.min(ONE, ((index - start) / (end - start)) * RISE);
    added(hall, index + delay - shared.start, value);
  }
};

const museumSent = (
  kuraku: Kuraku,
  museum: Bus,
  [hall, shared, delay]: readonly [Hall, Shared, number],
): void => {
  for (const [from, to] of activeIn({ frames: kuraku.frames, pad: SILENT })(museum)) {
    for (
      let index = Math.max(from, shared.start);
      index < Math.min(to, shared.end - delay);
      index += ONE
    ) {
      added(
        hall,
        index + delay - shared.start,
        ((museum.left[index] ?? SILENT) + (museum.right[index] ?? SILENT)) * HALF,
      );
    }
  }
};

const museumCut = (kuraku: Kuraku, museum: Bus): void => {
  for (const channel of [museum.left, museum.right]) {
    for (const [from, to] of activeIn({ frames: kuraku.frames, pad: MUSEUM_CUT.pad })(museum)) {
      svf({ kind: SVF.high, cutoff: MUSEUM_CUT.hertz, resonance: MUSEUM_CUT.resonance, from, to })(
        channel,
      );
    }
  }
};

const blended = (main: Bus, source: Bus, [shared, share]: readonly [Shared, number]): void => {
  for (let index = FIRST; index < shared.museum.length; index += ONE) {
    const gain = (shared.museum[index] ?? SILENT) * share;
    const at = shared.start + index;
    main.left[at] = (main.left[at] ?? SILENT) + (source.left[at] ?? SILENT) * gain;
    main.right[at] = (main.right[at] ?? SILENT) + (source.right[at] ?? SILENT) * gain;
  }
};

const hallAdded = (main: Bus, hall: Hall, shared: Shared): void => {
  const wet = convolvePair({ impulse: shared.hall, gain: HALL_GAIN, frames: hall.send.length })(
    hall.send,
  );
  for (let index = FIRST; index < hall.send.length; index += ONE) {
    const gain = shared.museum[index] ?? SILENT;
    if (gain !== SILENT) {
      const at = shared.start + index;
      main.left[at] = (main.left[at] ?? SILENT) + (wet.left[index] ?? SILENT) * gain;
      main.right[at] = (main.right[at] ?? SILENT) + (wet.right[index] ?? SILENT) * gain;
    }
  }
};

export interface Museum {
  readonly main: Bus;
  readonly museum: Option.Option<Bus>;
  readonly direct: Option.Option<Bus>;
}

const museumMixed = (kuraku: Kuraku, main: Bus, [museum, hall]: readonly [Bus, Hall]): void => {
  const shared = kuraku.shared();
  museumSent(kuraku, museum, [hall, shared, DELAY]);
  museumCut(kuraku, museum);
  blended(main, museum, [shared, HALF]);
};

export const museumAdded =
  ({ main, museum, direct }: Museum) =>
  (kuraku: Kuraku): void => {
    const shared = kuraku.shared();
    const hall: Hall = {
      send: new Float32Array(shared.end - shared.start),
      heard: new Uint8Array(ONE),
    };
    risen(kuraku, main, [hall, shared, DELAY]);
    if (Option.isSome(museum)) {
      museumMixed(kuraku, main, [museum.value, hall]);
    }
    if (Option.isSome(direct)) {
      blended(main, direct.value, [shared, ONE]);
    }
    if (hall.heard[FIRST] === HEARD) {
      hallAdded(main, hall, shared);
    }
  };
