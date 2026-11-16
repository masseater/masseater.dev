import { Array as Arr, Effect, HashSet, Option, Schema, String as Str, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

export interface RepositoryNames {
  readonly root: string;
  readonly paths: HashSet.HashSet<string>;
  readonly directories: HashSet.HashSet<string>;
  readonly entries: Readonly<Record<string, readonly string[]>>;
  readonly packages: HashSet.HashSet<string>;
  readonly relative: (file: string) => string;
  readonly join: (...segments: readonly string[]) => string;
  readonly dirname: (file: string) => string;
}

const MANIFEST = "package.json";

const SEPARATOR = "/";

const FIRST_SEGMENT = 1;

const ManifestJson = Schema.fromJsonString(
  Schema.Struct({ name: Schema.optionalKey(Schema.String) }),
);

const decodeManifest = Schema.decodeUnknownOption(ManifestJson);

const prefixesOf = (file: string): readonly string[] => {
  const segments = pipe(file, Str.split(SEPARATOR));
  return pipe(
    Arr.range(FIRST_SEGMENT, segments.length),
    Arr.map((count) => pipe(Arr.take(segments, count), Arr.join(SEPARATOR))),
  );
};

const directoriesOf = (file: string): readonly string[] =>
  pipe(prefixesOf(file), Arr.dropRight(FIRST_SEGMENT));

const nameOf = (text: Option.Option<string>): Option.Option<string> =>
  pipe(
    text,
    Option.flatMap(decodeManifest),
    Option.flatMap((parsed) => Option.fromUndefinedOr(parsed.name)),
  );

export const repositoryNamesOf = Effect.fn("repositoryNamesOf")(function* repositoryNamesOf(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const names = yield* pipe(
    listed,
    Arr.filter((file) => files.basename(file) === MANIFEST),
    Effect.forEach((manifest) =>
      files.readFile(files.join(root, manifest)).pipe(Effect.map(nameOf)),
    ),
  );
  const paths = pipe(listed, Arr.flatMap(prefixesOf), Arr.dedupe);
  const repository: RepositoryNames = {
    root,
    paths: HashSet.fromIterable(paths),
    directories: HashSet.fromIterable(pipe(listed, Arr.flatMap(directoriesOf))),
    entries: pipe(paths, Arr.groupBy(files.dirname)),
    packages: HashSet.fromIterable(Arr.getSomes(names)),
    relative: (file) => files.relative(root, file),
    join: files.join,
    dirname: files.dirname,
  };
  return repository;
});
