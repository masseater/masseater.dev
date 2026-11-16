import { Array as Arr, Effect, FileSystem, Path, pipe } from "effect";
import type { PlatformError } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import { toolFailed } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";
import { runCaptured } from "#/shared/lib/process.ts";

/** @internal */
export interface Link {
  readonly name: string;
  readonly target: string;
}

/** @internal */
export type LinkServices =
  | FileSystem.FileSystem
  | Path.Path
  | ChildProcessSpawner.ChildProcessSpawner;

/** @internal */
export type LinkError = VpToolsError | PlatformError.PlatformError;

const KEEP = ".gitkeep";

const junction = (
  target: string,
  link: string,
): Effect.Effect<void, LinkError, ChildProcessSpawner.ChildProcessSpawner> =>
  runCaptured({
    root: ".",
    file: "cmd.exe",
    args: ["/d", "/c", "mklink", "/J", link, target],
  }).pipe(
    Effect.filterOrFail(
      ({ valid }) => valid,
      ({ output }) => toolFailed("mklink")(output),
    ),
    Effect.asVoid,
  );

const linkTo =
  (directory: string) =>
  ({ name, target }: Link): Effect.Effect<void, LinkError, LinkServices> =>
    Effect.gen(function* linkOne() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const link = path.join(directory, name);
      if (process.platform === "win32") {
        return yield* junction(target, link);
      }
      return yield* fs.symlink(target, link);
    });

const pointsAt =
  (directory: string) =>
  ({
    name,
    target,
  }: Link): Effect.Effect<
    boolean,
    PlatformError.PlatformError,
    FileSystem.FileSystem | Path.Path
  > =>
    Effect.gen(function* readTarget() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const found = yield* fs.readLink(path.join(directory, name));
      return path.resolve(directory, found) === path.resolve(target);
    });

const isCurrent = (
  directory: string,
  links: readonly Link[],
): Effect.Effect<boolean, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* matches() {
    const fs = yield* FileSystem.FileSystem;
    const entries = yield* fs.readDirectory(directory);
    const expected = pipe(
      links,
      Arr.map(({ name }) => name),
      Arr.append(KEEP),
    );
    const linked = yield* Effect.forEach(links, pointsAt(directory), { concurrency: 1 });
    const onlyExpected = pipe(
      entries,
      Arr.every((entry) => Arr.contains(expected, entry)),
    );
    return onlyExpected && pipe(linked, Arr.every(Boolean));
  }).pipe(Effect.orElseSucceed(() => false));

const buildNext = (
  agents: string,
  skills: string,
  links: readonly Link[],
): Effect.Effect<string, LinkError, LinkServices> =>
  Effect.gen(function* stageLinks() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const next = yield* fs.makeTempDirectory({ directory: agents, prefix: ".skills-next-" });
    yield* Effect.forEach(links, linkTo(next), { concurrency: 1, discard: true });
    if (yield* fs.exists(path.join(skills, KEEP))) {
      yield* fs.writeFileString(path.join(next, KEEP), "");
    }
    return next;
  });

const swapIn = (
  agents: string,
  skills: string,
  next: string,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* replaceDirectory() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    if (!(yield* fs.exists(skills))) {
      return yield* fs.rename(next, skills);
    }
    const previous = yield* fs.makeTempDirectory({ directory: agents, prefix: ".skills-old-" });
    yield* fs.rename(skills, path.join(previous, "skills"));
    yield* fs.rename(next, skills);
    return yield* fs.remove(previous, { recursive: true });
  });

/** @internal */
export const linkSkills =
  (root: string) =>
  (links: readonly Link[]): Effect.Effect<void, LinkError, LinkServices> =>
    Effect.gen(function* link() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const agents = path.join(root, ".agents");
      const skills = path.join(agents, "skills");
      if (yield* isCurrent(skills, links)) {
        return;
      }
      yield* fs.makeDirectory(agents, { recursive: true });
      const next = yield* buildNext(agents, skills, links);
      yield* swapIn(agents, skills, next);
    });
