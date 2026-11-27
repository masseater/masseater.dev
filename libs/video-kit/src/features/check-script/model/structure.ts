import { Array as Arr, Option, pipe } from "effect";

import type { Scene, Script } from "#/entities/script/index.ts";

import type { Issue } from "./issue.ts";
import { issueIf, scriptError } from "./issue.ts";

const UNNAMED = /^scene-\d+$/u;
const NO_TITLE = "最初のシーンがタイトル（`#`）になっていない";
const NO_ENDING = "最後のシーンが締め（`#`）になっていない";
const NO_ID = "シーン ID（`{#id}`）がない。AI への指示とシーンの取り出しに使うので付ける";

const isKind = (scene: Option.Option<Scene>, kind: Scene["kind"]): boolean =>
  pipe(
    scene,
    Option.exists((found) => found.kind === kind),
  );

export const structureIssues = ({ scenes }: Script): readonly Issue[] => [
  ...issueIf({ failed: !isKind(Arr.head(scenes), "title"), issue: () => scriptError(NO_TITLE) }),
  ...issueIf({ failed: !isKind(Arr.last(scenes), "ending"), issue: () => scriptError(NO_ENDING) }),
  ...pipe(
    scenes,
    Arr.filter(({ id }) => UNNAMED.test(id)),
    Arr.map(({ id }): Issue => ({ severity: "warning", scene: Option.some(id), message: NO_ID })),
  ),
];
