import { Array as Arr, pipe } from "effect";

import type { Scene, Script, Timeline } from "#/entities/script/index.ts";

import { formatIssues } from "./format-issues.ts";
import type { Issue } from "./issue.ts";
import { issueIf, sceneError } from "./issue.ts";
import { structureIssues } from "./structure.ts";

export type { Issue } from "./issue.ts";

export interface CheckRequest {
  readonly script: Script;
  readonly timelines: readonly Timeline[];
  readonly assetExists: (src: string) => boolean;
}

const assetIssues = (scene: Scene, assetExists: CheckRequest["assetExists"]): readonly Issue[] => {
  if (scene.kind !== "media") {
    return [];
  }
  return issueIf({
    failed: !assetExists(scene.src),
    issue: () => sceneError({ scene: scene.id, message: `素材 ${scene.src} がない` }),
  });
};

export const checkScript = ({ script, timelines, assetExists }: CheckRequest): readonly Issue[] => [
  ...structureIssues(script),
  ...pipe(
    script.scenes,
    Arr.flatMap((scene) => assetIssues(scene, assetExists)),
  ),
  ...pipe(
    timelines,
    Arr.flatMap((timeline) => formatIssues({ script, timeline })),
  ),
];
