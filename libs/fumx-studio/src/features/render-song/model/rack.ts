import type { Clock } from "#/entities/clock/index.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";

const NONE = 0;
const ONE = 1;

export interface Rack {
  readonly frames: number;
  readonly clock: Clock;
  readonly samples: Readonly<Record<string, Float32Array>>;
}

export const channelsOf = (bus: Bus): readonly Float32Array[] => {
  if (bus.mono) {
    return [bus.left];
  }
  return [bus.left, bus.right];
};

export const eachChannel =
  (bus: Bus) =>
  (run: (channel: Float32Array) => Float32Array): void => {
    for (const channel of channelsOf(bus)) {
      run(channel);
    }
  };

export const scaled =
  (gain: number) =>
  (channel: Float32Array): Float32Array => {
    for (let index = NONE; index < channel.length; index += ONE) {
      channel[index] = (channel[index] ?? NONE) * gain;
    }
    return channel;
  };

export interface Blend {
  readonly wet: Bus;
  readonly mix: number;
}

export const blended =
  (bus: Bus) =>
  ({ wet, mix }: Blend): void => {
    for (let index = NONE; index < bus.left.length; index += ONE) {
      bus.left[index] = (bus.left[index] ?? NONE) * (ONE - mix) + (wet.left[index] ?? NONE) * mix;
      bus.right[index] =
        (bus.right[index] ?? NONE) * (ONE - mix) + (wet.right[index] ?? NONE) * mix;
    }
  };
