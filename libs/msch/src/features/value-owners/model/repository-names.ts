import { Array as Arr, Effect, HashSet, Option, Schema, String as Str, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import type { RepositoryNames } from "./hand-lists.ts";

const MANIFEST = "package.json";

const SEPARATOR = "/";

const decodeManifest = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Struct({ name: Schema.optionalKey(Schema.String) })),
);

const directoriesOf = (file: string): readonly string[] => {
  const segments = pipe(file, Str.split(SEPARATOR));
  return pipe(
    Arr.range(1, segments.length),
    Arr.map((count) => pipe(Arr.take(segments, count), Arr.join(SEPARATOR))),
  );
};

export const repositoryNamesOf = Effect.fn("repositoryNamesOf")(function* repositoryNamesOf(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const manifests = Arr.filter(listed, (file) => files.basename(file) === MANIFEST);
  const names = yield* Effect.forEach(manifests, (manifest) =>
    files.readFile(files.join(root, manifest)).pipe(
      Effect.map((text) =>
        text.pipe(
          Option.flatMap(decodeManifest),
          Option.flatMap((parsed) => Option.fromUndefinedOr(parsed.name)),
        ),
      ),
    ),
  );
  const paths = Arr.dedupe(Arr.flatMap(listed, directoriesOf));
  const repository: RepositoryNames = {
    root,
    paths: HashSet.fromIterable(paths),
    directories: HashSet.fromIterable(
      Arr.flatMap(listed, (file) => Arr.dropRight(directoriesOf(file), 1)),
    ),
    entries: Arr.groupBy(paths, files.dirname),
    packages: HashSet.fromIterable(Arr.getSomes(names)),
    relative: (file) => files.relative(root, file),
    join: files.join,
    dirname: files.dirname,
  };
  return repository;
});
