import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { parse } from "vite-plus";

import { stringsIn, workspaceDirectories } from "#/entities/workspace/index.ts";
import type { FoundString } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "root-workspace-path";
const CONFIG_FILE = "vite.config.ts";
const PATH_CHARACTER = /[\w.@/-]/u;
const NAME_CHARACTER = /[\w.@-]/u;
const FIRST = 0;
const NEXT = 1;

const isBoundary = (character: string, allowed: RegExp): boolean =>
  character === "" || !allowed.test(character);

const mentions =
  (directory: string) =>
  (text: string): boolean => {
    const parts = Str.split(text, directory);
    return pipe(
      Arr.drop(parts, NEXT),
      Arr.some((after, index) => {
        const before = parts[index] ?? "";
        const previous = Str.slice(before.length - NEXT)(before);
        const following = Str.slice(FIRST, NEXT)(after);
        return (
          isBoundary(previous, PATH_CHARACTER) &&
          (following === "/" || isBoundary(following, NAME_CHARACTER))
        );
      }),
    );
  };

const problemsIn =
  (file: string, source: string, directories: readonly string[]) =>
  (found: FoundString): readonly Problem[] =>
    pipe(
      directories,
      Arr.filter((directory) => mentions(directory)(found.text)),
      Arr.map((directory): Problem => ({
        file,
        ...positionOf(source)(found.start),
        rule: RULE,
        message: `${directory} is a workspace. The root ${CONFIG_FILE} holds what applies to every workspace, so move what only ${directory} needs into ${directory}/${CONFIG_FILE}: msch.lint, msch.devDependencies or its verify task.`,
      })),
    );

/** @internal */
export const checkRootWorkspacePaths = Effect.fn("checkRootWorkspacePaths")(
  function* checkRootWorkspacePaths(root: string) {
    const files = yield* RepositoryFiles;
    const file = files.join(root, CONFIG_FILE);
    const source = yield* files.readFile(file);
    if (Option.isNone(source)) {
      return [];
    }
    const directories = yield* workspaceDirectories(root);
    const parsed = yield* Effect.promise(() => parse(file, source.value, { lang: "ts" }));
    return pipe(
      stringsIn(parsed.program),
      Arr.flatMap(problemsIn(file, source.value, directories)),
    );
  },
);
