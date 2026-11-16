import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { Problem } from "#/shared/lib/problem.ts";
import { formatValues } from "#/shared/lib/values.ts";

import type { PackageScope } from "./duplicates.ts";
import { MINIMUM_NAMES, TEST_FILE, mostNamesOf, problemOf } from "./name-lists.ts";
import type { FileLiterals, NameList } from "./name-lists.ts";

const MOST_DEFINING_FILES = 2;

const SINGLE_NAME = 1;

const SHOWN_FILES = 3;

interface Defined {
  readonly scope: PackageScope;
  readonly file: string;
}

type DefinedIndex = Readonly<Record<string, readonly Defined[]>>;

type NameFiles = readonly [string, readonly string[]];

const canDerive = (left: PackageScope, right: PackageScope): boolean =>
  left.name === right.name ||
  left.dependencies.includes(right.name) ||
  right.dependencies.includes(left.name);

const definitionsOf = (entry: FileLiterals): readonly (readonly [string, Defined])[] =>
  pipe(
    entry.values,
    Arr.map((value) => [value, { scope: entry.scope, file: entry.file }] as const),
  );

const uniqueFiles = (pairs: readonly (readonly [string, Defined])[]): readonly Defined[] =>
  pipe(
    pairs,
    Arr.map(([, defined]) => defined),
    Arr.dedupeWith((left, right) => left.file === right.file),
  );

const definedIndexOf = (files: readonly FileLiterals[]): DefinedIndex =>
  pipe(
    files,
    Arr.filter((entry) => !TEST_FILE.test(entry.file)),
    Arr.flatMap(definitionsOf),
    Arr.groupBy(([value]) => value),
    Rec.map(uniqueFiles),
  );

const ownedOneByOne = (defined: readonly NameFiles[]): readonly NameFiles[] => {
  const hosted = pipe(
    defined,
    Arr.flatMap(([, files]) => files),
    Arr.groupBy((file) => file),
    Rec.map((files) => files.length),
  );
  const hostsOne = (file: string): boolean =>
    Rec.get(hosted, file).pipe(Option.exists((count) => count === SINGLE_NAME));
  return pipe(
    defined,
    Arr.map(([name, files]) => [name, pipe(files, Arr.filter(hostsOne))] as const),
  );
};

const filesDefining =
  (index: DefinedIndex, list: NameList) =>
  (name: string): NameFiles => {
    const files = pipe(
      Rec.get(index, name),
      Option.getOrElse((): readonly Defined[] => []),
      Arr.filter(
        (defined) => defined.file !== list.site.file && canDerive(list.site.scope, defined.scope),
      ),
      Arr.map((defined) => defined.file),
    );
    return [name, files];
  };

const definingFiles =
  (index: DefinedIndex) =>
  (list: NameList): readonly NameFiles[] =>
    pipe(
      list.names,
      Arr.map(filesDefining(index, list)),
      ownedOneByOne,
      Arr.filter(
        ([, files]) => Arr.isReadonlyArrayNonEmpty(files) && files.length <= MOST_DEFINING_FILES,
      ),
    );

export const declaredNameProblem = ({
  literals,
  relative,
}: Readonly<{
  literals: readonly FileLiterals[];
  relative: (file: string) => string;
}>): ((list: NameList) => Option.Option<Problem>) => {
  const index = definedIndexOf(literals);
  return (list) => {
    const defined = definingFiles(index)(list);
    const files = pipe(
      defined,
      Arr.flatMap(([, found]) => found),
      Arr.dedupe,
    );
    if (defined.length < mostNamesOf(list) || files.length < MINIMUM_NAMES) {
      return Option.none();
    }
    const names = pipe(
      defined,
      Arr.map(([name]) => name),
    );
    const shown = pipe(files, Arr.take(SHOWN_FILES), Arr.map(relative), Arr.join(", "));
    return Option.some(
      problemOf({
        list,
        reason: `${formatValues(names)} are each written in another module (${shown}). Type those values with this list, or build this list from them, so that adding one does not mean editing two places.`,
      }),
    );
  };
};
