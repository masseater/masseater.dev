import { Array as Arr, pipe } from "effect";

import type { Timeline, VideoScript } from "#/entities/cut/index.ts";

import { formatIssues } from "./format-issues.ts";
import type { Issue } from "./issue.ts";
import { cutError } from "./issue.ts";

export type { Issue } from "./issue.ts";

export interface CheckRequest {
  readonly script: VideoScript;
  readonly timelines: readonly Timeline[];
  readonly drawn: readonly string[];
}

const ONCE = 1;

const countOf = (ids: readonly string[], id: string): number =>
  pipe(
    ids,
    Arr.filter((other) => other === id),
  ).length;

const idIssues = ({ script, drawn }: CheckRequest): readonly Issue[] => {
  const ids = pipe(
    script.cuts,
    Arr.map(({ id }) => id),
  );
  return [
    ...pipe(
      ids,
      Arr.dedupe,
      Arr.filter((id) => countOf(ids, id) > ONCE),
      Arr.map((id) => cutError({ cut: id, message: `カット ${id} が 2 回以上ある` })),
    ),
    ...pipe(
      ids,
      Arr.dedupe,
      Arr.filter((id) => !drawn.includes(id)),
      Arr.map((id) => cutError({ cut: id, message: `カット ${id} の絵が video.tsx にない` })),
    ),
  ];
};

export const checkScript = (request: CheckRequest): readonly Issue[] => [
  ...idIssues(request),
  ...pipe(
    request.timelines,
    Arr.flatMap((timeline) => formatIssues({ script: request.script, timeline })),
  ),
];
