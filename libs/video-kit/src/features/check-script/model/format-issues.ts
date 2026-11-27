import { Array as Arr, pipe } from "effect";

import type { Line, Scene, Script, Timeline } from "#/entities/script/index.ts";
import { textOf } from "#/entities/script/index.ts";
import type { Format } from "#/shared/config/index.ts";
import { ONE, Timing } from "#/shared/config/index.ts";

import type { Issue } from "./issue.ts";
import { issueIf, sceneError, scriptError } from "./issue.ts";
import { lineIssues } from "./line-issues.ts";

const ITEM_LIMIT: Readonly<Record<Format, number>> = { vertical: 18, horizontal: 32 };
const BODY_SCENE_LIMIT: Readonly<Record<Format, number>> = { vertical: 5, horizontal: 12 };
const DIGITS = 1;
const NO_LINES: readonly Line[] = [];

const itemsOf = (scene: Scene): readonly Line[] => {
  if (scene.kind === "points") {
    return scene.items;
  }
  return NO_LINES;
};

const itemIssues = (scene: Scene, format: Format): readonly Issue[] =>
  pipe(
    itemsOf(scene),
    Arr.filter((item) => textOf(item).length > ITEM_LIMIT[format]),
    Arr.map((item) =>
      sceneError({
        scene: scene.id,
        message: `${format} の項目「${textOf(item)}」が ${String(ITEM_LIMIT[format])} 文字を超えている`,
      }),
    ),
  );

const sceneIssues = (timeline: Timeline): readonly Issue[] =>
  pipe(
    timeline.scenes,
    Arr.flatMap(({ scene, lines }) => [
      ...pipe(
        lines,
        Arr.flatMap((timed) =>
          lineIssues({ scene: scene.id, format: timeline.format, fps: timeline.fps, timed }),
        ),
      ),
      ...itemIssues(scene, timeline.format),
    ]),
  );

export const formatIssues = ({
  script,
  timeline,
}: Readonly<{ script: Script; timeline: Timeline }>): readonly Issue[] => {
  const { format } = timeline;
  const seconds = timeline.durationInFrames / timeline.fps;
  const target = script.length[format];
  const body = pipe(
    timeline.scenes,
    Arr.filter(({ scene }) => scene.kind !== "title" && scene.kind !== "ending"),
  );
  return [
    ...issueIf({
      failed: seconds > target * (ONE + Timing.LENGTH_TOLERANCE),
      issue: () =>
        scriptError(
          `${format} の長さが ${seconds.toFixed(DIGITS)} 秒で、目標 ${String(target)} 秒を 10% 超えている`,
        ),
    }),
    ...issueIf({
      failed: body.length > BODY_SCENE_LIMIT[format],
      issue: () =>
        scriptError(
          `${format} の本題が ${String(body.length)} シーンあり、${String(BODY_SCENE_LIMIT[format])} を超えている`,
        ),
    }),
    ...sceneIssues(timeline),
  ];
};
