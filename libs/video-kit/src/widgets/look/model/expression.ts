import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { Timeline } from "#/entities/cut/index.ts";

export interface ExpressionRequest {
  readonly timeline: Timeline;
  readonly voices: readonly number[];
  readonly poses: Readonly<Record<string, string>>;
  readonly frame: number;
}

const DEFAULT_POSE = "default";

const voicePortrait = (
  timeline: Timeline,
  voices: readonly number[],
  voice: Option.Option<number>,
): Option.Option<string> =>
  pipe(
    voice,
    Option.filter((style) => voices.includes(style)),
    Option.orElse(() => Arr.head(voices)),
    Option.flatMap((style) => Rec.get(timeline.portraits, String(style))),
  );

export const portraitOf = ({
  timeline,
  voices,
  poses,
  frame,
}: ExpressionRequest): Option.Option<string> => {
  const cut = pipe(
    timeline.cuts,
    Arr.findLast(({ from }) => frame >= from),
  );
  const posed = pipe(
    cut,
    Option.flatMap(({ id }) => Rec.get(poses, id)),
    Option.orElse(() => Rec.get(poses, DEFAULT_POSE)),
    Option.flatMap((name) => Rec.get(timeline.images, name)),
  );
  return Option.orElse(posed, () =>
    voicePortrait(
      timeline,
      voices,
      pipe(
        cut,
        Option.map(({ voice }) => voice),
      ),
    ),
  );
};
