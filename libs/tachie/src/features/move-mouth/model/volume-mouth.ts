import { Array as Arr, Option, pipe } from "effect";

import { bandLevels } from "#/features/move-mouth/lib/band-level.ts";
import { silentMouth } from "#/features/move-mouth/lib/silent.ts";

import type { Speech } from "./speech.ts";

export interface VolumeMouth {
  readonly kind: "volume-mouth";
  readonly closed: string;
  readonly almostClosed?: string;
  readonly half?: string;
  readonly almostOpen?: string;
  readonly open: string;
  readonly threshold?: number;
  readonly sensitivity?: number;
  readonly lowCut?: number;
  readonly highCut?: number;
  readonly alwaysApply?: boolean;
}

const DEFAULT_LOW_CUT = 100;
const DEFAULT_HIGH_CUT = 1000;
const DEFAULT_THRESHOLD = 20;
const DEFAULT_SENSITIVITY = 1;
const CLOSED = 0;
const STEP = 1;

export const volumePatterns = (mouth: VolumeMouth): readonly string[] =>
  pipe(
    [mouth.closed, mouth.almostClosed, mouth.half, mouth.almostOpen, mouth.open],
    Arr.flatMap((pattern) => Option.toArray(Option.fromNullishOr(pattern))),
    Arr.filter((pattern) => pattern !== ""),
  );

const averageAt = (levels: readonly number[], frame: number, sensitivity: number): number => {
  const window = pipe(levels, Arr.take(frame + STEP), Arr.takeRight(Math.max(STEP, sensitivity)));
  let sum = CLOSED;
  for (const level of window) {
    sum += level;
  }
  return sum / Math.max(STEP, window.length);
};

const openingAt = (mouth: VolumeMouth, levels: readonly number[], frame: number): number => {
  const top = volumePatterns(mouth).length - STEP;
  const threshold = mouth.threshold ?? DEFAULT_THRESHOLD;
  const sensitivity = mouth.sensitivity ?? DEFAULT_SENSITIVITY;
  let opening = CLOSED;
  for (let current = CLOSED; current <= frame; current += STEP) {
    const loud = averageAt(levels, current, sensitivity) >= threshold;
    opening = Math.min(top, Math.max(CLOSED, opening + (Number(loud) * (STEP + STEP) - STEP)));
  }
  return opening;
};

export const volumeMouthState = ({
  mouth,
  speech,
}: Readonly<{ mouth: VolumeMouth; speech: Option.Option<Speech> }>): string => {
  if (Option.isNone(speech)) {
    return silentMouth(mouth);
  }
  const levels = pipe(
    speech.value.audio,
    Option.map((audio) =>
      bandLevels({
        audio,
        fps: speech.value.fps,
        lowCut: mouth.lowCut ?? DEFAULT_LOW_CUT,
        highCut: mouth.highCut ?? DEFAULT_HIGH_CUT,
      }),
    ),
    Option.getOrElse(() => Arr.empty<number>()),
  );
  const opening = openingAt(mouth, levels, speech.value.frame);
  return Option.getOrElse(Arr.get(volumePatterns(mouth), opening), () => mouth.closed);
};
