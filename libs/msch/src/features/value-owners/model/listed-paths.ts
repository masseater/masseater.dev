import { Array as Arr, HashSet, Option, Record as Rec, String as Str, pipe } from "effect";

import type { Problem } from "#/shared/lib/problem.ts";
import { formatValues } from "#/shared/lib/values.ts";

import { MINIMUM_NAMES, MISSING_ALLOWANCE, problemOf } from "./name-lists.ts";
import type { NameList } from "./name-lists.ts";
import type { RepositoryNames } from "./repository-names.ts";

const PATH_PREFIX = /^(?:!|\.\/)+/u;

const GLOB = /[*?{[]/u;

const EXTENSION = /\.[^./]+$/u;

const SEPARATOR = "/";

const ROOT = ".";

const namedPath =
  (repository: RepositoryNames, file: string) =>
  (name: string): Option.Option<string> => {
    const bare = pipe(name, Str.replace(PATH_PREFIX, ""));
    if (GLOB.test(bare) || Str.isEmpty(bare)) {
      return Option.none();
    }
    const fromFile = repository.relative(repository.join(repository.dirname(file), bare));
    return pipe(
      [fromFile, bare],
      Arr.findFirst((path) => HashSet.has(repository.paths, path)),
    );
  };

const kindOf =
  (repository: RepositoryNames) =>
  (path: string): string => {
    if (HashSet.has(repository.directories, path)) {
      return SEPARATOR;
    }
    return pipe(
      path,
      Str.match(EXTENSION),
      Option.flatMap(Arr.head),
      Option.getOrElse(() => path),
    );
  };

const siblingsOf =
  (repository: RepositoryNames) =>
  (path: string): readonly string[] =>
    pipe(
      Rec.get(repository.entries, repository.dirname(path)),
      Option.getOrElse((): readonly string[] => []),
      Arr.filter((entry) => kindOf(repository)(entry) === kindOf(repository)(path)),
    );

const coversDirectory =
  (repository: RepositoryNames) =>
  (group: readonly string[]): boolean =>
    pipe(
      Arr.head(group),
      Option.exists(
        (first) =>
          group.length >=
          Math.max(MINIMUM_NAMES, siblingsOf(repository)(first).length - MISSING_ALLOWANCE),
      ),
    );

const enumeratedDirectory =
  (repository: RepositoryNames) =>
  (paths: readonly string[]): Option.Option<string> =>
    pipe(
      paths,
      Arr.groupBy((path) => `${repository.dirname(path)}${SEPARATOR}${kindOf(repository)(path)}`),
      Rec.values,
      Arr.findFirst(coversDirectory(repository)),
      Option.flatMap(Arr.head),
      Option.map(repository.dirname),
    );

const directoryLabel = (directory: string): string => {
  if (directory === ROOT) {
    return "the repository root";
  }
  return directory;
};

export const listedPathProblem =
  (repository: RepositoryNames) =>
  (list: NameList): Option.Option<Problem> => {
    const paths = pipe(list.names, Arr.map(namedPath(repository, list.site.file)), Arr.getSomes);
    const packages = pipe(
      list.names,
      Arr.filter((name) => HashSet.has(repository.packages, name)),
    );
    const directory = enumeratedDirectory(repository)(paths);
    if (Option.isSome(directory)) {
      return Option.some(
        problemOf({
          list,
          reason: `they enumerate the entries of ${directoryLabel(directory.value)}. Find them with a glob or derive them from the declaration that names them.`,
        }),
      );
    }
    if (packages.length >= MINIMUM_NAMES) {
      return Option.some(
        problemOf({
          list,
          reason: `${formatValues(packages)} are workspace packages. Derive them from the workspace manifests or from a property that each package declares.`,
        }),
      );
    }
    return Option.none();
  };
