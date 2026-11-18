import type { Project } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

import { pairsOf, valueAt } from "#/shared/yaml/index.ts";

const LOCKFILE = ".github/workflows/actions.lock";

export const isLocked =
  (project: Project) =>
  (path: string): boolean =>
    pipe(
      project.parse(LOCKFILE),
      Option.flatMap((source) => Option.fromNullishOr(source.yaml)),
      Option.flatMap(valueAt("workflows")),
      Option.exists((workflows) => Arr.some(pairsOf(workflows), (pair) => pair.key.value === path)),
    );
