import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { Problem } from "#/shared/lib/problem.ts";
import { formatValues, isSubsetOf, sameValues } from "#/shared/lib/values.ts";

import type { PackageScope } from "./duplicates.ts";
import { problemOf } from "./name-lists.ts";
import type { FileLiterals, NameList } from "./name-lists.ts";

const SUBSET_SHARE = 2;

type ImportIndex = Readonly<Record<string, readonly string[]>>;

const canImport = (importer: PackageScope, imported: PackageScope): boolean =>
  importer.name === imported.name || importer.dependencies.includes(imported.name);

const importIndexOf = (files: readonly FileLiterals[]): ImportIndex =>
  pipe(
    files,
    Arr.map((entry) => [entry.file, entry.imports] as const),
    Rec.fromEntries,
  );

const imports =
  (index: ImportIndex) =>
  (importer: string, imported: string): boolean =>
    Rec.get(index, importer).pipe(Option.exists(Arr.contains(imported)));

const connected =
  (index: ImportIndex) =>
  (left: string, right: string): boolean =>
    left === right || imports(index)(left, right) || imports(index)(right, left);

const isPartOf =
  (index: ImportIndex, list: NameList) =>
  (other: NameList): boolean =>
    other !== list &&
    canImport(list.site.scope, other.site.scope) &&
    connected(index)(list.site.file, other.site.file) &&
    isSubsetOf(list.names, other.names) &&
    list.names.length * SUBSET_SHARE >= other.names.length &&
    !sameValues(list.names, other.names);

export const subsetListProblem = ({
  lists,
  literals,
  relative,
}: Readonly<{
  lists: readonly NameList[];
  literals: readonly FileLiterals[];
  relative: (file: string) => string;
}>): ((list: NameList) => Option.Option<Problem>) => {
  const index = importIndexOf(literals);
  return (list) =>
    pipe(
      lists,
      Arr.findFirst(isPartOf(index, list)),
      Option.map((other) =>
        problemOf({
          list,
          reason: `they are a part of ${formatValues(other.names)} at ${relative(other.site.file)}:${String(other.site.line)}. Name that list once and select from it with Extract or Exclude.`,
        }),
      ),
    );
};
