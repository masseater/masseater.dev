import { Effect, Array as Arr, String as Str, pipe } from "effect";
import { minimatch } from "minimatch";

import { checkDependencies } from "./dependency-rules.ts";
import { listGitFiles } from "./git.ts";
import { withSection } from "./section-check.ts";
import { checkSlices } from "./steiger.ts";
import { listDependencies } from "./workspace.ts";

const ancestorsOf = (file: string): readonly string[] =>
  pipe(
    Str.split(file, "/"),
    Arr.initNonEmpty,
    Arr.scan("", (parent, segment) => Arr.join(Arr.filter([parent, segment], Str.isNonEmpty), "/")),
    Arr.filter(Str.isNonEmpty),
  );

const matchingDirectories = (
  root: string,
  patterns: readonly string[],
): ReturnType<typeof listGitFiles> =>
  listGitFiles(root, []).pipe(
    Effect.map((files) =>
      pipe(
        files,
        Arr.flatMap(ancestorsOf),
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

const steigerCheck = withSection("steiger", (section, { root }) =>
  matchingDirectories(root, section.paths).pipe(
    Effect.flatMap((targets) => checkSlices(section.rules, root, targets)),
  ),
);

const dependenciesCheck = withSection("dependencyRules", (rules, { root }) =>
  listDependencies(root).pipe(
    Effect.map((dependencies) => {
      const problems = checkDependencies(rules, dependencies);
      return { valid: Arr.isReadonlyArrayEmpty(problems), output: Arr.join(problems, "\n") };
    }),
  ),
);

export { dependenciesCheck, steigerCheck };
