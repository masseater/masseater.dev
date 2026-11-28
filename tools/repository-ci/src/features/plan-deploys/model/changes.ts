import { outputOf } from "@r_masseater/github-workflow";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import { lastRecorded } from "#/entities/deployment/index.ts";
import type { DeploymentRecord } from "#/entities/deployment/index.ts";
import { lockfileAt, sameResolution } from "#/entities/lockfile/index.ts";
import { closure, neighborsIn } from "#/entities/workspace/index.ts";
import type { Packages } from "#/entities/workspace/index.ts";

const ROOT = ".";
const LOCK = "pnpm-lock.yaml";
const SETTINGS = "pnpm-workspace.yaml";
const HEAD = "HEAD";

const SHARED: readonly ((file: string) => boolean)[] = [
  Str.startsWith(".github/actions/"),
  Str.startsWith("patches/"),
  (file): boolean =>
    !Str.includes("/")(file) && !Str.endsWith(".md")(file) && file !== LOCK && file !== SETTINGS,
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

/** @internal */
export type Changes = Readonly<{
  packages: Packages;
  record: (name: string) => DeploymentRecord;
  workflows: readonly string[];
  extra?: (directory: string) => readonly string[];
}>;

const dependenciesChanged = Effect.fn("dependenciesChanged")(function* dependenciesChanged(
  sha: string,
  changed: readonly string[],
  directories: readonly string[],
) {
  if (!Arr.contains(changed, LOCK)) {
    return Arr.contains(changed, SETTINGS);
  }
  return yield* pipe(
    Effect.all([lockfileAt(sha), lockfileAt(HEAD)], { concurrency: 1 }),
    Effect.map(([before, after]) => !sameResolution({ before, after, directories })),
    Effect.orElseSucceed(() => true),
  );
});

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
  if (Option.isNone(last) || Option.isNone(files)) {
    return true;
  }
  if (pipe(files.value, Arr.some(touched))) {
    return true;
  }
  return yield* dependenciesChanged(last.value, files.value, directories);
});
