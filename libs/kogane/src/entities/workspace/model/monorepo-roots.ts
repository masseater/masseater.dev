import { Array as Arr, Effect, FileSystem, Option, Path, pipe } from "effect";

const WORKSPACE_FILE = "pnpm-workspace.yaml";
const READ_CONCURRENCY = 16;

const isRoot = Effect.fn("isRoot")(function* isRoot(directory: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  return yield* fs
    .exists(path.join(directory, WORKSPACE_FILE))
    .pipe(Effect.orElseSucceed(() => false));
});

const ancestorsOf = (path: Path.Path, directory: string): readonly string[] =>
  Arr.unfold(directory, (here) =>
    pipe(
      Option.some(path.dirname(here)),
      Option.filter((parent) => parent !== here),
      Option.map((parent) => [parent, parent] as const),
    ),
  );

const firstRoot = Effect.fn("firstRoot")(function* firstRoot(candidates: readonly string[]) {
  const checked = yield* Effect.forEach(
    candidates,
    (candidate) => isRoot(candidate).pipe(Effect.map((found) => ({ candidate, found }))),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.findFirst(checked, ({ found }) => found).pipe(
    Option.map(({ candidate }) => candidate),
  );
});

const childRoots = Effect.fn("childRoots")(function* childRoots(directory: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fs.readDirectory(directory).pipe(Effect.orElseSucceed(() => []));
  const children = pipe(
    names,
    Arr.map((name) => path.join(directory, name)),
  );
  const checked = yield* Effect.forEach(
    children,
    (child) => isRoot(child).pipe(Effect.map((found) => ({ child, found }))),
    { concurrency: READ_CONCURRENCY },
  );
  return pipe(
    checked,
    Arr.filter(({ found }) => found),
    Arr.map(({ child }) => child),
  );
});

/** @internal */
export const monorepoRoots = Effect.fn("monorepoRoots")(function* monorepoRoots(directory: string) {
  const path = yield* Path.Path;
  const enclosing = yield* firstRoot([directory, ...ancestorsOf(path, directory)]);
  if (Option.isSome(enclosing)) {
    return [enclosing.value];
  }
  return yield* childRoots(directory);
});
