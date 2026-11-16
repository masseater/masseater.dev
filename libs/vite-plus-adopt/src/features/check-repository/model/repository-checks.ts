import { Effect, Array as Arr, String as Str, pipe } from "effect";
import { minimatch } from "minimatch";

import { withSection } from "#/entities/check/index.ts";
import { listGitFiles } from "#/shared/lib/git.ts";
import { listDependencies } from "#/shared/lib/workspace.ts";

import { checkDependencies } from "./dependency-rules.ts";
import { checkSlices } from "./steiger.ts";

const LAYER_FOLDER = /\/(?:app|pages|widgets|features|entities|shared)\//gu;

const layeredDirectories = (
  root: string,
  patterns: readonly string[],
): ReturnType<typeof listGitFiles> =>
  listGitFiles(root, []).pipe(
    Effect.map((files) =>
      pipe(
        files,
        Arr.flatMap((file) =>
          Arr.map(Arr.fromIterable(Str.matchAll(LAYER_FOLDER)(file)), ({ index }) =>
            Str.takeLeft(file, index ?? file.length),
          ),
        ),
        Arr.dedupe,
        Arr.filter((directory) =>
          pipe(
            patterns,
            Arr.some((pattern) => minimatch(directory, pattern)),
          ),
        ),
      ),
    ),
  );

/** @internal */
export const steigerCheck = withSection("steiger", (section, { root }) =>
  layeredDirectories(root, section.paths).pipe(
    Effect.flatMap((targets) => checkSlices(section.rules, root, targets)),
  ),
);

/** @internal */
export const dependenciesCheck = withSection("dependencyRules", (rules, { root }) =>
  listDependencies(root).pipe(
    Effect.map((dependencies) => {
      const problems = checkDependencies(rules, dependencies);
      return { valid: Arr.isReadonlyArrayEmpty(problems), output: Arr.join(problems, "\n") };
    }),
  ),
);
