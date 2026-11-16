import type { Placement } from "#/entities/song/lib/studio/placement.ts";

import type { Life } from "./context.ts";

export interface Hit {
  readonly bus: string;
  readonly sample: string;
  readonly bar: number;
  readonly step: number;
}

export const hit =
  (life: Life) =>
  ({ bus, sample, bar, step }: Hit) =>
  (placement: Placement): void => {
    life.studio.paste({
      bus: life.rack.get(bus),
      source: sample,
      time: life.grid.at(bar, step),
      placement,
    });
  };

export const pasteAt =
  (life: Life) =>
  (bus: string, sample: string) =>
  (time: number, placement: Placement): void => {
    life.studio.paste({ bus: life.rack.get(bus), source: sample, time, placement });
  };
