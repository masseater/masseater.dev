import { Array as Arr, Match, pipe } from "effect";

import { plainOf, textOf } from "#/entities/script/index.ts";
import type { Scene, Segment } from "#/entities/script/index.ts";
import type { Timeline } from "#/entities/timeline/index.ts";

const FIXED = "ひとことで言うと★0123456789/—";

const headingOf = ({ heading }: Readonly<{ heading: readonly Segment[] }>): readonly string[] => [
  plainOf(heading),
];

const labelsOf = (scene: Scene): readonly string[] =>
  Match.value<Scene>(scene).pipe(
    Match.discriminatorsExhaustive("kind")({
      title: ({ title }) => [plainOf(title)],
      ending: ({ title }) => [plainOf(title)],
      quote: ({ text }) => [text],
      talk: headingOf,
      points: headingOf,
      code: headingOf,
      media: headingOf,
      rating: headingOf,
    }),
  );

const itemsOf = (scene: Scene): readonly string[] => {
  if (scene.kind === "title" || scene.kind === "points") {
    return pipe(scene.items, Arr.map(textOf));
  }
  return [];
};

export const shownText = (timeline: Timeline): string =>
  pipe(
    timeline.scenes,
    Arr.flatMap(({ scene }) => [
      ...pipe(scene.lines, Arr.map(textOf)),
      ...labelsOf(scene),
      ...itemsOf(scene),
    ]),
    Arr.append(FIXED),
    Arr.join(""),
  );
