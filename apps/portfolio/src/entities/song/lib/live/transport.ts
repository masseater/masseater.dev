import type { MixMessage, MixPlayer } from "@masseater.dev/daw-view/worklet";
import { Option, Predicate, pipe } from "effect";

import { aimed } from "./targets.ts";
import type { Targets } from "./targets.ts";

const BUFFER = 256;
const FADE_IN = 96;
const TAIL = 512;
const ONE = 1;
const FIRST = 0;
const SILENT = 0;
const STOP = -1;
const HEARD = { silent: 0, started: 1, ended: 2 } as const;

export type Fill = (left: Float32Array, right: Float32Array, frames: number) => void;

export interface Source {
  readonly frames: number;
  readonly position: () => number;
  readonly seek: (frame: number) => void;
  readonly fill: Fill;
}

interface Resampler {
  readonly reset: () => void;
  readonly pull: Fill;
}

const pullOf = (ratio: number, direct: Fill, interpolated: Fill): Fill => {
  if (ratio === ONE) {
    return direct;
  }
  return interpolated;
};

const resamplerOf = (fill: Fill, ratio: number): Resampler => {
  const left = new Float32Array(BUFFER);
  const right = new Float32Array(BUFFER);
  const state = { phase: ONE, count: 0, index: 0, a0: 0, a1: 0, b0: 0, b1: 0 };
  const advance = (): void => {
    if (state.index >= state.count) {
      fill(left, right, BUFFER);
      state.count = BUFFER;
      state.index = FIRST;
    }
    state.a0 = state.b0;
    state.a1 = state.b1;
    state.b0 = left[state.index] ?? SILENT;
    state.b1 = right[state.index] ?? SILENT;
    state.index += ONE;
    state.phase -= ONE;
  };
  const interpolated: Fill = (outLeft, outRight, frames) => {
    for (let frame = FIRST; frame < frames; frame += ONE) {
      while (state.phase >= ONE) {
        advance();
      }
      outLeft[frame] = state.a0 + (state.b0 - state.a0) * state.phase;
      outRight[frame] = state.a1 + (state.b1 - state.a1) * state.phase;
      state.phase += ratio;
    }
  };
  return {
    reset: () => {
      Object.assign(state, { phase: ONE, count: 0, index: 0, a0: 0, a1: 0, b0: 0, b1: 0 });
    },
    pull: pullOf(ratio, fill, interpolated),
  };
};

const fadedOut = (left: Float32Array, right: Float32Array, frames: number): void => {
  for (let frame = FIRST; frame < frames; frame += ONE) {
    const gain = ONE - (frame + ONE) / frames;
    left[frame] = (left[frame] ?? SILENT) * gain;
    right[frame] = (right[frame] ?? SILENT) * gain;
  }
};

const fadedIn = (left: Float32Array, right: Float32Array, frames: number): void => {
  const length = Math.min(frames, FADE_IN);
  for (let frame = FIRST; frame < length; frame += ONE) {
    const gain = frame / length;
    left[frame] = (left[frame] ?? SILENT) * gain;
    right[frame] = (right[frame] ?? SILENT) * gain;
  }
};

export interface Transport {
  readonly source: Source;
  readonly targets: Targets;
  readonly ratio: number;
}

interface CueState {
  readonly queued: boolean;
  readonly next: number;
  readonly on: boolean;
  readonly fresh: boolean;
}

interface Cue {
  readonly read: () => CueState;
  readonly write: (change: Readonly<Partial<CueState>>) => void;
}

const cueOf = (): Cue => {
  let state: CueState = { queued: false, next: STOP, on: false, fresh: false };
  return {
    read: () => state,
    write: (change) => {
      state = { ...state, ...change };
    },
  };
};

interface Deck {
  readonly source: Source;
  readonly resampler: Resampler;
  readonly cue: Cue;
}

const started = ({ source, resampler, cue }: Deck): number => {
  const { queued, next } = cue.read();
  cue.write({ queued: false });
  if (!queued || next < FIRST) {
    return HEARD.silent;
  }
  source.seek(next);
  resampler.reset();
  cue.write({ on: true, fresh: true });
  return HEARD.started;
};

const playing =
  ({ source, resampler, cue }: Deck) =>
  (left: Float32Array, right: Float32Array, frames: number): number => {
    resampler.pull(left, right, frames);
    if (cue.read().fresh) {
      fadedIn(left, right, frames);
      cue.write({ fresh: false });
    }
    if (source.position() >= source.frames + TAIL) {
      cue.write({ on: false });
      return HEARD.ended;
    }
    return HEARD.silent;
  };

const stopped = (left: Float32Array, right: Float32Array, frames: number): number => {
  left.fill(SILENT, FIRST, frames);
  right.fill(SILENT, FIRST, frames);
  return HEARD.silent;
};

const rendered =
  (deck: Deck) =>
  (left: Float32Array, right: Float32Array, frames: number): number => {
    const { cue, resampler } = deck;
    if (cue.read().queued && cue.read().on) {
      resampler.pull(left, right, frames);
      fadedOut(left, right, frames);
      cue.write({ on: false });
      return HEARD.silent;
    }
    const heard = started(deck);
    if (!cue.read().on) {
      return stopped(left, right, frames);
    }
    return Math.max(heard, playing(deck)(left, right, frames));
  };

const cued =
  (cue: Cue, targets: Targets) =>
  (message: MixMessage): void => {
    pipe(Option.fromUndefinedOr(message.mixers), Option.map(aimed(targets)));
    if (Predicate.isNotUndefined(message.play)) {
      cue.write({ queued: true, next: message.play });
    }
    if (message.stop === true) {
      cue.write({ queued: true, next: STOP });
    }
  };

export const transportOf = ({ source, targets, ratio }: Transport): MixPlayer => {
  const cue = cueOf();
  const deck = { source, resampler: resamplerOf(source.fill, ratio), cue };
  return { msg: cued(cue, targets), render: rendered(deck) };
};
