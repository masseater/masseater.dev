import { Easing, interpolate, spring } from "remotion";

import { FPS } from "#/shared/config/index.ts";
import type { CssVariables } from "#/shared/lib/css-variables.ts";

const NONE = 0;
const FULL = 1;
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const POP = { damping: 22, stiffness: 320, mass: 0.6 } as const;
const POP_START = 0.6;
const SLAM_START = 1.12;
const MARK_FRAMES = 7;

const easeOutQuad = Easing.out((progress) => Easing.quad(progress));

export interface Beat {
  readonly frame: number;
  readonly at: number;
}

export interface Pop extends Beat {
  readonly start: number;
}

export const popScale = ({ frame, at, start }: Pop): number =>
  start + (FULL - start) * spring({ frame: frame - at, fps: FPS, config: POP });

export const popIn = ({ frame, at, start }: Pop): CssVariables => ({
  "--shown": Number(frame >= at),
  "--scale": popScale({ frame, at, start }),
});

export const popUp = (beat: Beat): CssVariables => popIn({ ...beat, start: POP_START });

export const slamIn = (beat: Beat): CssVariables => popIn({ ...beat, start: SLAM_START });

export const markProgress = ({ frame, at }: Beat): number =>
  interpolate(frame - at, [NONE, MARK_FRAMES], [NONE, FULL], { ...CLAMP, easing: easeOutQuad });
