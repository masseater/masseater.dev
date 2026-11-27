import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";

import type { Life } from "./context.ts";

export type Span = Readonly<{ from: number; to: number }>;

export type Stage = (channel: Float32Array) => unknown;

export const shaped =
  (life: Life) =>
  (stages: (span: Span) => readonly Stage[]) =>
  (bus: Bus): void => {
    life.studio.each({
      frames: life.studio.frames,
      edit: (channel, from, to) => {
        for (const stage of stages({ from, to })) {
          stage(channel);
        }
      },
    })(bus);
  };
