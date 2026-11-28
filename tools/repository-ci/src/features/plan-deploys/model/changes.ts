import { outputOf } from "@r_masseater/github-workflow";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import { lastRecorded } from "#/entities/deployment/index.ts";
import type { DeploymentRecord } from "#/entities/deployment/index.ts";
import { closure, neighborsIn } from "#/entities/workspace/index.ts";
import type { Packages } from "#/entities/workspace/index.ts";

const ROOT = ".";

const SHARED: readonly ((file: string) => boolean)[] = [
  Str.startsWith(".github/actions/"),
  Str.startsWith("patches/"),
  (file): boolean => !Str.includes("/")(file) && !Str.endsWith(".md")(file),
];

const isShared =
  (workflows: readonly string[]) =>
  (file: string): boolean =>
    Arr.contains(workflows, file) ||
    pipe(
      SHARED,
      Arr.some((matches) => matches(file)),
    );

const changedSince = (
  sha: string,
): Effect.Effect<
  Option.Option<readonly string[]>,
  never,
  ChildProcessSpawner.ChildProcessSpawner
> =>
  outputOf({ command: "git", args: ["diff", "--name-only", "--no-renames", sha, "HEAD"] }).pipe(
    Effect.map((output) => pipe(Str.split("\n")(output), Arr.filter(Str.isNonEmpty))),
    Effect.option,
  );

type Changes = Readonly<{
  packages: Packages;
  record: (name: string) => DeploymentRecord;
  workflows: readonly string[];
  extra?: (directory: string) => readonly string[];
}>;

/** @internal */
export const isChanged = Effect.fn("isChanged")(function* isChanged(
  { packages, record, workflows, extra = (): readonly string[] => [] }: Changes,
  stack: Readonly<{ name: string; directories: readonly string[] }>,
) {
  const last = yield* lastRecorded(record(stack.name));
  const files = yield* pipe(
    last,
    Option.match({
      onNone: () => Effect.succeedNone,
      onSome: changedSince,
    }),
  );
  const directories = pipe(
    stack.directories,
    closure((directory) => [...neighborsIn(packages)(directory), ...extra(directory)]),
    Arr.filter((directory) => directory !== ROOT),
  );
  const touched = (file: string): boolean =>
    isShared(workflows)(file) ||
    pipe(
      directories,
      Arr.some((directory) => Str.startsWith(`${directory}/`)(file)),
    );
  return pipe(
    files,
    Option.match({
      onNone: () => true,
      onSome: (changed: readonly string[]) => pipe(changed, Arr.some(touched)),
    }),
  );
});
