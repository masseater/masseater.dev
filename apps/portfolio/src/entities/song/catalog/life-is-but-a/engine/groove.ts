import { Predicate } from "effect";

import patterns from "#/entities/song/catalog/life-is-but-a/score/patterns.json";

import type { Life } from "./context.ts";
import { clapAt, ghostAt, hatAt, kickAt } from "./drums.ts";
import type { Struck } from "./drums.ts";
import { pasteAt } from "./hits.ts";
import { openHatAt, percussionAt, shaker } from "./kit.ts";
import type { Percussion } from "./kit.ts";

const STEPS = 16;
const ONE = 1;
const NONE = 0;
const DIGIT = 9;
const LOUD = 0.9;
const LOUDEST = 1;
const BACKBEAT = "....x.......x...";
const RIDE = {
  every: 2,
  beat: 4,
  gain: 0.085,
  downbeat: 0.7,
  placement: { semitones: 5, duration: 0.16, release: 0.08, highPass: 6e3, pan: 0.3 },
};

export interface DrumBar {
  readonly bar: number;
  readonly kick?: string;
  readonly clap?: string | boolean;
  readonly ghost?: string;
  readonly hats?: number;
  readonly busyHats?: boolean;
  readonly open?: number;
  readonly shaker?: number;
  readonly percussion?: number;
  readonly ride?: number;
}

const velocityOf = (mark: string): number => {
  if (mark === "x") {
    return LOUD;
  }
  if (mark === "X") {
    return LOUDEST;
  }
  if (mark === "." || mark === " ") {
    return NONE;
  }
  return Number(mark) / DIGIT;
};

const played =
  (bar: number, pattern: string) =>
  (play: (struck: Struck) => void): void => {
    for (let step = NONE; step < STEPS; step += ONE) {
      const velocity = velocityOf(pattern[step] ?? ".");
      if (velocity > NONE) {
        play({ bar, step, velocity });
      }
    }
  };

const clapPattern = (clap: string | boolean): string => {
  if (clap === true) {
    return BACKBEAT;
  }
  return String(clap);
};

const hatPattern = (busy?: boolean): string => {
  if (busy === true) {
    return patterns.groove.busyHats;
  }
  return patterns.groove.hats;
};

const core = (life: Life, spec: DrumBar): void => {
  if (Predicate.isNotUndefined(spec.kick)) {
    played(spec.bar, spec.kick)(kickAt(life));
  }
  if (Predicate.isNotUndefined(spec.clap) && spec.clap !== false) {
    played(spec.bar, clapPattern(spec.clap))(clapAt(life));
  }
  if (Predicate.isNotUndefined(spec.ghost)) {
    played(spec.bar, spec.ghost)(ghostAt(life));
  }
};

const cymbals = (life: Life, spec: DrumBar): void => {
  const hats = spec.hats ?? NONE;
  if (hats !== NONE) {
    played(
      spec.bar,
      hatPattern(spec.busyHats),
    )((struck) => {
      hatAt(life)({ ...struck, velocity: struck.velocity * hats });
    });
  }
  const open = spec.open ?? NONE;
  if (open !== NONE) {
    played(
      spec.bar,
      patterns.groove.open,
    )((struck) => {
      openHatAt(life)({ ...struck, velocity: struck.velocity * open });
    });
  }
  if ((spec.shaker ?? NONE) !== NONE) {
    shaker(life)({ bar: spec.bar, level: spec.shaker ?? NONE });
  }
};

const LAYERS: readonly (readonly Omit<Percussion, "bar">[])[] = patterns.percussion;

const percussion = (life: Life, spec: DrumBar): void => {
  const level = spec.percussion ?? NONE;
  for (const [index, layer] of LAYERS.entries()) {
    if (level >= index + ONE) {
      for (const struck of layer) {
        percussionAt(life)({ ...struck, bar: spec.bar });
      }
    }
  }
};

const rideStep = (life: Life, [bar, step]: readonly [number, number], ride: number): void => {
  let accent = RIDE.downbeat;
  if (step % RIDE.beat !== NONE) {
    accent = ONE;
  }
  pasteAt(life)("DRUMS", "cym1")(life.grid.at(bar, step), {
    gain: RIDE.gain * ride * accent,
    ...RIDE.placement,
  });
};

export const drumBar =
  (life: Life) =>
  (spec: DrumBar): void => {
    core(life, spec);
    cymbals(life, spec);
    percussion(life, spec);
    const ride = spec.ride ?? NONE;
    if (ride !== NONE) {
      for (let step = NONE; step < STEPS; step += RIDE.every) {
        rideStep(life, [spec.bar, step], ride);
      }
    }
  };
