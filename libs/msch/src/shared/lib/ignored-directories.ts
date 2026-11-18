import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { RepositoryFiles, nodeRepositoryFiles } from "./repository-files.ts";

const IGNORE_FILES = ":(glob)**/.gitignore";
const SEPARATOR = "/";
const NEGATION = "!";
const CONTENTS = "/**";
const ROOT = ".";
const ANYWHERE = "**/";
const READ_CONCURRENCY = 16;
const DIRECTORY_ENTRY = /^(?<anchor>\/?)(?<name>[^!#/].*)\/$/u;
const TOOL_DIRECTORIES = ["**/node_modules/.vite", "**/node_modules/.vite-temp"];

export interface IgnoredDirectory {
  readonly pattern: string;
  readonly base: "workspace";
}

const scopedName = (anchor: string, name: string): string => {
  if (anchor === SEPARATOR || Str.includes(SEPARATOR)(name)) {
    return name;
  }
  return `${ANYWHERE}${name}`;
};

const inDirectory =
  (directory: string) =>
  (glob: string): string => {
    if (directory === ROOT) {
      return glob;
    }
    return `${directory}${SEPARATOR}${glob}`;
  };

const globOf =
  (directory: string) =>
  (line: string): Option.Option<string> => {
    const found = DIRECTORY_ENTRY.exec(Str.trim(line));
    return pipe(
      Option.fromNullishOr(found),
      Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
      Option.flatMap(({ anchor, name }) =>
        Option.map(Option.fromNullishOr(name), (entry) => scopedName(anchor ?? "", entry)),
      ),
      Option.map(inDirectory(directory)),
    );
  };

const keptGlob = Effect.fn("keptGlob")(function* keptGlob(root: string, glob: string) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.matchingFiles(root, [`:(glob)${glob}/**`]);
  return Option.some(glob).pipe(Option.filter(() => Arr.isReadonlyArrayEmpty(listed)));
});

const globsIn = Effect.fn("globsIn")(function* globsIn(root: string, file: string) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, file));
  const toGlob = globOf(files.dirname(file));
  return pipe(
    Option.getOrElse(text, () => ""),
    Str.split("\n"),
    Arr.map(toGlob),
    Arr.getSomes,
  );
});

export const collectIgnoredDirectories = Effect.fn("collectIgnoredDirectories")(
  function* collectIgnoredDirectories(root: string) {
    const files = yield* RepositoryFiles;
    const ignoreFiles = yield* files.matchingFiles(root, [IGNORE_FILES]);
    const globs = yield* Effect.forEach(ignoreFiles, (file) => globsIn(root, file), {
      concurrency: 1,
    });
    const candidates = Arr.dedupe(Arr.flatten(globs));
    const kept = yield* Effect.forEach(candidates, (glob) => keptGlob(root, glob), {
      concurrency: READ_CONCURRENCY,
    });
    return pipe(
      Arr.dedupe([...Arr.getSomes(kept), ...TOOL_DIRECTORIES]),
      Arr.flatMap((glob): readonly IgnoredDirectory[] => [
        { pattern: `${NEGATION}${glob}`, base: "workspace" },
        { pattern: `${NEGATION}${glob}${CONTENTS}`, base: "workspace" },
      ]),
    );
  },
);

export const ignoredDirectories = (root: string): Promise<readonly IgnoredDirectory[]> =>
  Effect.runPromise(collectIgnoredDirectories(root).pipe(Effect.provide(nodeRepositoryFiles)));
