import { Array as Arr, HashSet, Option, pipe } from "effect";

import type { Project } from "#/entities/project/index.ts";
import { SymbolFlags, isArrayLiteralExpression, isStringLiteral } from "#/shared/lib/compiler.ts";
import type { ArrayLiteralExpression, SourceFile } from "#/shared/lib/compiler.ts";
import type { Problem } from "#/shared/lib/problem.ts";
import {
  columnOf,
  carriesTag,
  declarationsOf,
  declaresAType,
  descendantsOf,
  isOutsideDeclaration,
  lineOf,
} from "#/shared/lib/syntax.ts";
import { formatValues } from "#/shared/lib/values.ts";

import { MINIMUM_NAMES, TEST_FILE, listedProblem } from "./name-lists.ts";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

const HALF = 2;

const outsideTypeIn = (project: Project): ((name: string) => boolean) => {
  const exported = HashSet.fromIterable(project.library.typeNames);
  const values = HashSet.fromIterable([
    ...project.library.tagNames,
    ...pipe(
      project.library.vocabularies,
      Arr.flatMap(({ vocabulary }) => vocabulary.values),
    ),
  ]);
  const known = new Map<string, boolean>();
  const isOutside = isOutsideDeclaration(project.program);
  const isGlobalType = (name: string): boolean =>
    pipe(
      Option.fromNullishOr(project.checker.resolveName(name, SymbolFlags.Type)),
      Option.map(declarationsOf),
      Option.exists(
        (declarations) =>
          declaresAType(declarations) &&
          !carriesTag(name)(declarations) &&
          pipe(declarations, Arr.every(isOutside)),
      ),
    );
  return (name) =>
    known.getOrInsertComputed(
      name,
      () =>
        IDENTIFIER.test(name) &&
        !HashSet.has(values, name) &&
        (HashSet.has(exported, name) || isGlobalType(name)),
    );
};

const namesIn = (list: ArrayLiteralExpression): readonly string[] =>
  pipe(
    list.elements,
    Arr.filter(isStringLiteral),
    Arr.map((element) => element.text),
  );

const problemIn =
  (isOutsideType: (name: string) => boolean) =>
  (list: ArrayLiteralExpression): Option.Option<Problem> => {
    const names = namesIn(list);
    const outside = pipe(names, Arr.filter(isOutsideType));
    if (outside.length < Math.max(MINIMUM_NAMES, names.length / HALF)) {
      return Option.none();
    }
    return Option.some(
      listedProblem({
        file: list.getSourceFile().fileName,
        line: lineOf(list),
        column: columnOf(list),
        names,
        reason: `${formatValues(outside)} are types that the language or a package declares. Let the code that reads this list decide by where each type is declared, so that a new type does not mean a new entry.`,
      }),
    );
  };

export const outsideNameProblemsIn = (
  project: Project,
): ((sourceFile: SourceFile) => readonly Problem[]) => {
  const problemOfList = problemIn(outsideTypeIn(project));
  return (sourceFile) => {
    if (TEST_FILE.test(sourceFile.fileName)) {
      return [];
    }
    return pipe(
      descendantsOf(sourceFile),
      Arr.filter(isArrayLiteralExpression),
      Arr.map(problemOfList),
      Arr.getSomes,
    );
  };
};
