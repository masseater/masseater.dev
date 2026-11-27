import { Array as Arr, Number as Num, pipe } from "effect";
import { Easing, interpolate, random, spring } from "remotion";

import { FPS } from "#/shared/config/index.ts";
import type { CssVariables } from "#/shared/lib/css-variables.ts";

const NONE = 0;
const FULL = 1;
const BOTH_WAYS = 2;
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const POP = { damping: 12, stiffness: 320, mass: 0.6 } as const;
const POP_START = 0.6;
const SLAM_START = 1.45;
const SHAKE_FRAMES = 9;
const WHIP_FRAMES = 6;
const WHIP_DISTANCE = 34;
const WHIP_BLUR = 18;
const MARK_FRAMES = 7;

const easeOutCubic = Easing.out((progress) => Easing.cubic(progress));
const easeOutQuad = Easing.out((progress) => Easing.quad(progress));

export interface Beat {
  readonly frame: number;
  readonly at: number;
}

export interface Pop extends Beat {
  readonly start: number;
}

export interface Hit {
  readonly at: number;
  readonly strength: number;
}

export const popScale = ({ frame, at, start }: Pop): number =>
  start + (FULL - start) * spring({ frame: frame - at, fps: FPS, config: POP });

export const popIn = ({ frame, at, start }: Pop): CssVariables => ({
  "--shown": Number(frame >= at),
  "--scale": popScale({ frame, at, start }),
});

export const popUp = (beat: Beat): CssVariables => popIn({ ...beat, start: POP_START });

export const slamIn = (beat: Beat): CssVariables => popIn({ ...beat, start: SLAM_START });

const shakeAxis = (frame: number, hit: Hit, axis: string): number => {
  const elapsed = frame - hit.at;
  if (elapsed < NONE || elapsed >= SHAKE_FRAMES) {
    return NONE;
  }
  const direction = random(`${axis}-${hit.at}-${elapsed}`) * BOTH_WAYS - FULL;
  return direction * hit.strength * (FULL - elapsed / SHAKE_FRAMES);
};

const sumAxis = (frame: number, hits: readonly Hit[], axis: string): number =>
  pipe(
    hits,
    Arr.map((hit) => shakeAxis(frame, hit, axis)),
    (offsets) => Num.sumAll(offsets),
  );

export const shake = ({
  frame,
  hits,
}: Readonly<{ frame: number; hits: readonly Hit[] }>): CssVariables => ({
  "--x": `${sumAxis(frame, hits, "x")}px`,
  "--y": `${sumAxis(frame, hits, "y")}px`,
});

export const whipLeft = (frame: number): number =>
  FULL - interpolate(frame, [NONE, WHIP_FRAMES], [NONE, FULL], { ...CLAMP, easing: easeOutCubic });

export const whipVars = (left: number): CssVariables => ({
  "--whip": `${left * WHIP_DISTANCE}%`,
  "--blur": `${left * WHIP_BLUR}px`,
});

export const markProgress = ({ frame, at }: Beat): number =>
  interpolate(frame - at, [NONE, MARK_FRAMES], [NONE, FULL], { ...CLAMP, easing: easeOutQuad });
