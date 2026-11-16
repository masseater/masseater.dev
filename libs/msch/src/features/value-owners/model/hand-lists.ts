import {
  Array as Arr,
  HashSet,
  Option,
  Predicate,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { formatValues, isSubsetOf, sameValues } from "#/shared/lib/values.ts";

import type { PackageScope, UnownedSite } from "./duplicates.ts";

const RULE: RuleName = "hand-written-names";

const MINIMUM_NAMES = 2;

const MOST_DEFINING_FILES = 2;

const UNDEFINED_ALLOWANCE = 1;

const SUBSET_SHARE = 2;

const TEST_FILE = /\.test(?:\.[\w-]+)?\.[cm]?tsx?$/u;

const PATH_PREFIX = /^(?:!|\.\/)+/u;

const GLOB = /[*?{[]/u;

const EXTENSION = /\.[^./]+$/u;

const SEPARATOR = "/";

export interface FileLiterals {
  readonly scope: PackageScope;
  readonly file: string;
  readonly values: readonly string[];
}

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

interface NameList {
  readonly site: UnownedSite;
  readonly names: readonly string[];
}

const nameListOf = (site: UnownedSite): Option.Option<NameList> => {
  if (TEST_FILE.test(site.file) || site.values.length < MINIMUM_NAMES) {
    return Option.none();
  }
  const names = Arr.filter(site.values, Predicate.isString);
  return Option.liftPredicate({ site, names }, (list) => list.names.length === site.values.length);
};

const problemOf = (list: NameList, reason: string): Problem => ({
  file: list.site.file,
  line: list.site.line,
  column: list.site.column,
  rule: RULE,
  message: `The names ${formatValues(list.names)} are listed by hand, but ${reason}`,
});

const namedPath =
  (repository: RepositoryNames, file: string) =>
  (name: string): Option.Option<string> => {
    const bare = pipe(name, Str.replace(PATH_PREFIX, ""));
    if (GLOB.test(bare) || bare === "") {
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

const enumeratedDirectory =
  (repository: RepositoryNames) =>
  (paths: readonly string[]): Option.Option<string> =>
    pipe(
      paths,
      Arr.groupBy((path) => `${repository.dirname(path)}${SEPARATOR}${kindOf(repository)(path)}`),
      Rec.values,
      Arr.findFirst((group) => {
        const [first] = group;
        if (first === undefined) {
          return false;
        }
        const parent = repository.dirname(first);
        const siblings = pipe(
          Rec.get(repository.entries, parent),
          Option.getOrElse((): readonly string[] => []),
          Arr.filter((entry) => kindOf(repository)(entry) === kindOf(repository)(first)),
        );
        return group.length >= Math.max(MINIMUM_NAMES, siblings.length - UNDEFINED_ALLOWANCE);
      }),
      Option.flatMap(Arr.head),
      Option.map(repository.dirname),
    );

const repositoryProblem =
  (repository: RepositoryNames) =>
  (list: NameList): Option.Option<Problem> => {
    const paths = Arr.getSomes(Arr.map(list.names, namedPath(repository, list.site.file)));
    const packages = Arr.filter(list.names, (name) => HashSet.has(repository.packages, name));
    const directory = enumeratedDirectory(repository)(paths);
    if (Option.isSome(directory)) {
      return Option.some(
        problemOf(
          list,
          `they enumerate the entries of ${directory.value === "." ? "the repository root" : directory.value}. Find them with a glob or derive them from the declaration that names them.`,
        ),
      );
    }
    if (packages.length >= MINIMUM_NAMES) {
      return Option.some(
        problemOf(
          list,
          `${formatValues(packages)} are workspace packages. Derive them from the workspace manifests or from a property that each package declares.`,
        ),
      );
    }
    return Option.none();
  };

const canDerive = (left: PackageScope, right: PackageScope): boolean =>
  left.name === right.name ||
  left.dependencies.includes(right.name) ||
  right.dependencies.includes(left.name);

const canImport = (importer: PackageScope, imported: PackageScope): boolean =>
  importer.name === imported.name || importer.dependencies.includes(imported.name);

interface Defined {
  readonly scope: PackageScope;
  readonly file: string;
}

const ownedOneByOne = (
  defined: readonly (readonly [string, readonly string[]])[],
): readonly (readonly [string, readonly string[]])[] => {
  const hosted = pipe(
    defined,
    Arr.flatMap(([, files]) => files),
    Arr.groupBy((file) => file),
    Rec.map((files) => files.length),
  );
  return Arr.map(
    defined,
    ([name, files]) =>
      [
        name,
        Arr.filter(files, (file) =>
          Rec.get(hosted, file).pipe(Option.exists((count) => count === 1)),
        ),
      ] as const,
  );
};

const definingFiles =
  (literals: Readonly<Record<string, readonly Defined[]>>) =>
  (list: NameList): readonly (readonly [string, readonly string[]])[] =>
    pipe(
      list.names,
      Arr.map((name) => {
        const files = pipe(
          Rec.get(literals, name),
          Option.getOrElse((): readonly Defined[] => []),
          Arr.filter(
            (defined) =>
              defined.file !== list.site.file && canDerive(list.site.scope, defined.scope),
          ),
          Arr.map((defined) => defined.file),
        );
        return [name, files] as const;
      }),
      ownedOneByOne,
      Arr.filter(([, files]) => files.length > 0 && files.length <= MOST_DEFINING_FILES),
    );

const declaredProblem =
  (literals: Readonly<Record<string, readonly Defined[]>>, relative: (file: string) => string) =>
  (list: NameList): Option.Option<Problem> => {
    const defined = definingFiles(literals)(list);
    const files = pipe(
      defined,
      Arr.flatMap(([, found]) => found),
      Arr.dedupe,
    );
    if (
      defined.length < Math.max(MINIMUM_NAMES, list.names.length - UNDEFINED_ALLOWANCE) ||
      files.length < MINIMUM_NAMES
    ) {
      return Option.none();
    }
    const shown = pipe(Arr.take(files, MINIMUM_NAMES + 1), Arr.map(relative), Arr.join(", "));
    return Option.some(
      problemOf(
        list,
        `${formatValues(Arr.map(defined, ([name]) => name))} are each written in another module (${shown}). Type those values with this list, or build this list from them, so that adding one does not mean editing two places.`,
      ),
    );
  };

const subsetProblem =
  (lists: readonly NameList[], relative: (file: string) => string) =>
  (list: NameList): Option.Option<Problem> =>
    pipe(
      lists,
      Arr.findFirst(
        (other) =>
          other !== list &&
          canImport(list.site.scope, other.site.scope) &&
          isSubsetOf(list.names, other.names) &&
          list.names.length * SUBSET_SHARE >= other.names.length &&
          !sameValues(list.names, other.names),
      ),
      Option.map((other) =>
        problemOf(
          list,
          `they are a part of ${formatValues(other.names)} at ${relative(other.site.file)}:${String(other.site.line)}. Name that list once and select from it with Extract or Exclude.`,
        ),
      ),
    );

const literalIndex = (
  files: readonly FileLiterals[],
): Readonly<Record<string, readonly Defined[]>> =>
  pipe(
    files,
    Arr.filter((entry) => !TEST_FILE.test(entry.file)),
    Arr.flatMap((entry) =>
      Arr.map(entry.values, (value) => [value, { scope: entry.scope, file: entry.file }] as const),
    ),
    Arr.groupBy(([value]) => value),
    Rec.map((pairs) =>
      Arr.dedupeWith(
        Arr.map(pairs, ([, defined]) => defined),
        (left, right) => left.file === right.file,
      ),
    ),
  );

export const handWrittenNameProblems =
  (repository: RepositoryNames, literals: readonly FileLiterals[]) =>
  (sites: readonly UnownedSite[]): readonly Problem[] => {
    const lists = pipe(
      sites,
      Arr.dedupeWith((left, right) => left.file === right.file && left.start === right.start),
      Arr.map(nameListOf),
      Arr.getSomes,
    );
    const index = literalIndex(literals);
    return pipe(
      lists,
      Arr.map((list) =>
        repositoryProblem(repository)(list).pipe(
          Option.orElse(() => declaredProblem(index, repository.relative)(list)),
          Option.orElse(() => subsetProblem(lists, repository.relative)(list)),
        ),
      ),
      Arr.getSomes,
    );
  };
