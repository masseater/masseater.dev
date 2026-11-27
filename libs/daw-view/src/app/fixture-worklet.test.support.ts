import { Array as Arr, Option, Schema, pipe } from "effect";

import { HEARD, registerMix } from "#/entities/live/index.ts";
import type { Mixer, MixPlayer, PlayerSetup } from "#/entities/live/index.ts";

const STOPPED = -1;
const FIRST = 0;
const STEP = 1;
const SILENT = 0;
const DECIBELS_PER_BEL = 20;
const TEN = 10;

const InitSchema = Schema.Struct({ stems: Schema.Array(Schema.instanceOf(Float32Array)) });

const initOf = Schema.decodeUnknownOption(InitSchema);

const linear = (mixer: Mixer): number => {
  if (mixer.muted) {
    return SILENT;
  }
  return TEN ** (mixer.volumeDecibels / DECIBELS_PER_BEL);
};

const added =
  (stem: Float32Array, gain: number) =>
  (left: Float32Array, right: Float32Array, at: number): void => {
    for (let frame = FIRST; frame < left.length; frame += STEP) {
      const value = (stem[at + frame] ?? SILENT) * gain;
      left[frame] = (left[frame] ?? SILENT) + value;
      right[frame] = (right[frame] ?? SILENT) + value;
    }
  };

const stemsOf = (init: unknown): readonly Float32Array[] =>
  Option.match(initOf(init), { onNone: () => [], onSome: ({ stems }) => stems });

const mixedInto =
  (stems: readonly Float32Array[], gains: Float32Array) =>
  (left: Float32Array, right: Float32Array, at: number): void => {
    left.fill(SILENT);
    right.fill(SILENT);
    for (const [index, stem] of stems.entries()) {
      added(stem, gains[index] ?? SILENT)(left, right, at);
    }
  };

const silenced = (left: Float32Array, right: Float32Array): number => {
  left.fill(SILENT);
  right.fill(SILENT);
  return HEARD.silent;
};

const eventOf = (fresh: boolean, ended: boolean): number => {
  if (fresh) {
    return HEARD.started;
  }
  if (ended) {
    return HEARD.ended;
  }
  return HEARD.silent;
};

const gainsOf = (mixers: readonly Mixer[]): readonly number[] => pipe(mixers, Arr.map(linear));

const fixturePlayer = ({ init }: PlayerSetup): MixPlayer => {
  const stems = stemsOf(init);
  const gains = new Float32Array(stems.length).fill(STEP);
  const length = pipe(
    Arr.head(stems),
    Option.match({ onNone: () => SILENT, onSome: (stem) => stem.length }),
  );
  const state = { at: STOPPED, fresh: false };
  return {
    msg: (message): void => {
      gains.set(gainsOf(message.mixers ?? []));
      Option.map(Option.fromUndefinedOr(message.play), (play) => {
        state.at = play;
        state.fresh = true;
      });
      if (message.stop === true) {
        state.at = STOPPED;
      }
    },
    render: (left, right, frames): number => {
      if (state.at < FIRST) {
        return silenced(left, right);
      }
      mixedInto(stems, gains)(left, right, state.at);
      state.at += frames;
      const event = eventOf(state.fresh, state.at >= length);
      state.fresh = false;
      if (event === HEARD.ended) {
        state.at = STOPPED;
      }
      return event;
    },
  };
};

registerMix(fixturePlayer);
