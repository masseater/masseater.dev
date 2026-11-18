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
const TOOL_DIRECTORIES = ["**/node_modules/.vite*"];
const WILDCARD = /[*?[]/u;

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

const contentsOf = (glob: string): string => `:(glob)${glob}${CONTENTS}`;

const keptGlob = Effect.fn("keptGlob")(function* keptGlob(root: string, glob: string) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.trackedFiles(root, [contentsOf(glob)]);
  return Option.some(glob).pipe(Option.filter(() => Arr.isReadonlyArrayEmpty(listed)));
});

const keptGlobs = Effect.fn("keptGlobs")(function* keptGlobs(
  root: string,
  candidates: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.trackedFiles(root, pipe(candidates, Arr.map(contentsOf)));
  if (Arr.isReadonlyArrayEmpty(listed)) {
    return candidates;
  }
  const kept = yield* Effect.forEach(candidates, (glob) => keptGlob(root, glob), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.getSomes(kept);
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

const ignoredGlobs = Effect.fn("ignoredGlobs")(function* ignoredGlobs(root: string) {
  const files = yield* RepositoryFiles;
  const ignoreFiles = yield* files.trackedFiles(root, [IGNORE_FILES]);
  const globs = yield* Effect.forEach(ignoreFiles, (file) => globsIn(root, file), {
    concurrency: 1,
  });
  const kept = yield* keptGlobs(root, Arr.dedupe(Arr.flatten(globs)));
  return Arr.dedupe([...kept, ...TOOL_DIRECTORIES]);
});

const exclusionsOf = (globs: readonly string[]): readonly IgnoredDirectory[] =>
  pipe(
    globs,
    Arr.flatMap((glob): readonly IgnoredDirectory[] => [
      { pattern: `${NEGATION}${glob}`, base: "workspace" },
      { pattern: `${NEGATION}${glob}${CONTENTS}`, base: "workspace" },
    ]),
  );

interface Placement {
  readonly parent: readonly string[];
  readonly name: string;
}

const placementOf = (glob: string): Option.Option<Placement> =>
  pipe(
    Option.liftPredicate(glob, Str.startsWith(ANYWHERE)),
    Option.map((found) => Str.split(SEPARATOR)(Str.slice(ANYWHERE.length)(found))),
    Option.map((segments) => ({
      parent: Arr.initNonEmpty(segments),
      name: Arr.lastNonEmpty(segments),
    })),
    Option.filter(
      ({ parent }) =>
        Arr.isReadonlyArrayNonEmpty(parent) &&
        !pipe(
          parent,
          Arr.some((segment) => WILDCARD.test(segment)),
        ),
    ),
  );

const placesOf =
  (parent: readonly string[]) =>
  (file: string): readonly string[] => {
    const segments = Str.split(SEPARATOR)(file);
    return pipe(
      Arr.makeBy(segments.length - parent.length, (start) => start),
      Arr.filter((start) =>
        pipe(
          parent,
          Arr.every((segment, offset) => segments[start + offset] === segment),
        ),
      ),
      Arr.map((start) => Arr.join(Arr.take(segments, start + parent.length), SEPARATOR)),
    );
  };

const placedGlobs = Effect.fn("placedGlobs")(function* placedGlobs(
  root: string,
  globs: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const parents = pipe(
    globs,
    Arr.flatMap((glob) => Option.toArray(placementOf(glob))),
    Arr.map(({ parent }) => contentsOf(`${ANYWHERE}${Arr.join(parent, SEPARATOR)}`)),
  );
  const listed = yield* files.trackedFiles(root, Arr.dedupe(parents));
  return pipe(
    globs,
    Arr.flatMap((glob) =>
      Option.match(placementOf(glob), {
        onNone: () => Arr.filter([glob], (kept) => !Str.startsWith(ANYWHERE)(kept)),
        onSome: ({ parent, name }) =>
          pipe(
            listed,
            Arr.flatMap(placesOf(parent)),
            Arr.dedupe,
            Arr.map((place) => `${place}${SEPARATOR}${name}`),
          ),
      }),
    ),
  );
});

export const collectIgnoredDirectories = Effect.fn("collectIgnoredDirectories")(
  function* collectIgnoredDirectories(root: string) {
    const globs = yield* ignoredGlobs(root);
    return exclusionsOf(globs);
  },
);

export const collectPlacedIgnoredDirectories = Effect.fn("collectPlacedIgnoredDirectories")(
  function* collectPlacedIgnoredDirectories(root: string) {
    const globs = yield* ignoredGlobs(root);
    const placed = yield* placedGlobs(root, globs);
    return exclusionsOf(placed);
  },
);

export const ignoredDirectories = (root: string): Promise<readonly IgnoredDirectory[]> =>
  Effect.runPromise(collectIgnoredDirectories(root).pipe(Effect.provide(nodeRepositoryFiles)));
