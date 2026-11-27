import { Array as Arr, Option, pipe } from "effect";

import type { Timeline, VideoScript } from "#/entities/cut/index.ts";
import { ONE, Timing } from "#/shared/config/index.ts";

import type { Issue } from "./issue.ts";
import { issueIf, scriptError } from "./issue.ts";
import { lineIssues } from "./line-issues.ts";

const DIGITS = 1;
const NO_ISSUES: readonly Issue[] = [];

const lengthIssues = (script: VideoScript, timeline: Timeline): readonly Issue[] => {
  const { format } = timeline;
  const seconds = timeline.durationInFrames / timeline.fps;
  return Option.match(Option.fromNullishOr(script.length[format]), {
    onNone: () => NO_ISSUES,
    onSome: (target) =>
      issueIf({
        failed: seconds > target * (ONE + Timing.LENGTH_TOLERANCE),
        issue: () =>
          scriptError(
            `${format} の長さが ${seconds.toFixed(DIGITS)} 秒で、目標 ${String(target)} 秒を 10% 超えている`,
          ),
      }),
  });
};

export const formatIssues = ({
  script,
  timeline,
}: Readonly<{ script: VideoScript; timeline: Timeline }>): readonly Issue[] => [
  ...lengthIssues(script, timeline),
  ...pipe(
    timeline.cuts,
    Arr.flatMap(({ id, lines }) =>
      pipe(
        lines,
        Arr.flatMap((timed) =>
          lineIssues({ cut: id, format: timeline.format, fps: timeline.fps, timed }),
        ),
      ),
    ),
  ),
];
