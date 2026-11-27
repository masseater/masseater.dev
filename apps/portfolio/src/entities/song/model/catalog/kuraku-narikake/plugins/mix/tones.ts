import { phaser, tremolo } from "@masseater.dev/fumx-studio/studio/modulation";
import { timeOf } from "@masseater.dev/fumx-studio/studio/moment";

import type { Handlers, Rig } from "./buses.ts";
import { chainOf } from "./filters.ts";
import { spread } from "./widen.ts";

export type ToneOp = "filter" | "compress" | "tremolo" | "chorus" | "phaser" | "width" | "widen";

export const tones = ({ kuraku, buses }: Rig): Pick<Handlers, ToneOp> => {
  const { studio, frames, grid } = kuraku;
  return {
    filter: ({ bus, chain }): void => {
      studio.each({ frames, edit: chainOf(kuraku.curves)(chain) })(buses.at(bus));
    },
    compress: ({ op: _op, bus, ...settings }): void => {
      studio.compress(settings)(buses.at(bus));
    },
    tremolo: ({ op: _op, bus, ...shape }): void => {
      tremolo(frames)(shape)(buses.at(bus));
    },
    chorus: ({ op: _op, bus, ...shape }): void => {
      studio.chorus(shape)(buses.at(bus));
    },
    phaser: ({ op: _op, bus, from, to, ...shape }): void => {
      phaser(frames)({ ...shape, from: timeOf(grid)(from), to: timeOf(grid)(to) })(buses.at(bus));
    },
    width: ({ op: _op, bus, ...shape }): void => {
      studio.widen(shape)(buses.at(bus));
    },
    widen: ({ op: _op, bus, ...shape }): void => {
      spread(frames)(shape)(buses.at(bus));
    },
  };
};
