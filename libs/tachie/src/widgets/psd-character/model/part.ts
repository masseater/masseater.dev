import { Array as Arr, Match, String as Str, pipe } from "effect";
import type { Option } from "effect";

import { blinkState } from "#/features/blink-eyes/index.ts";
import type { Blink } from "#/features/blink-eyes/index.ts";
import { volumeMouthState, vowelMouthState } from "#/features/move-mouth/index.ts";
import type { Speech, VolumeMouth, VowelMouth } from "#/features/move-mouth/index.ts";

export type Animation = Blink | VowelMouth | VolumeMouth;

export type Part = string | Animation;

export interface Moment {
  readonly frame: number;
  readonly fps: number;
  readonly speech: Option.Option<Speech>;
}

const animate = (animation: Animation, moment: Moment): string =>
  Match.value<Animation>(animation).pipe(
    Match.discriminatorsExhaustive("kind")({
      blink: (blink) => blinkState({ blink, frame: moment.frame, fps: moment.fps }),
      "vowel-mouth": (mouth) => vowelMouthState({ mouth, speech: moment.speech }),
      "volume-mouth": (mouth) => volumeMouthState({ mouth, speech: moment.speech }),
    }),
  );

const partState = (part: Part, moment: Moment): string => {
  if (typeof part === "string") {
    return part;
  }
  return animate(part, moment);
};

export const stateOf = ({
  parts,
  moment,
}: Readonly<{ parts: readonly Part[]; moment: Moment }>): string =>
  pipe(
    parts,
    Arr.map((part) => partState(part, moment)),
    Arr.filter(Str.isNonEmpty),
    Arr.join(" "),
  );
