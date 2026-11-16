import { Array as Arr, Option, pipe } from "effect";

import {
  SyntaxKind,
  isIdentifier,
  isImportDeclaration,
  isStringLiteral,
  isVariableDeclaration,
} from "#/shared/lib/compiler.ts";
import type { Node, SourceFile, VariableDeclaration } from "#/shared/lib/compiler.ts";
import { problemAt } from "#/shared/lib/problem.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { descendantsOf } from "#/shared/lib/syntax.ts";

const RULE: RuleName = "namespace-destructuring";
const LOCAL = /^[.#/]/u;

const messageOf = (name: string): string =>
  `Destructuring ${name}, which comes from a package, makes the bundler keep everything ${name} exports. Write ${name}.<member> where it is used.`;

const isPackage = (specifier: Node): boolean =>
  isStringLiteral(specifier) && !LOCAL.test(specifier.text);

const importedNames = (sourceFile: SourceFile): readonly string[] => {
  const bindings = pipe(
    sourceFile.statements,
    Arr.filter(isImportDeclaration),
    Arr.filter((declaration) => isPackage(declaration.moduleSpecifier)),
    Arr.map((declaration) => Option.fromUndefinedOr(declaration.importClause)),
    Arr.getSomes,
    Arr.filter((clause) => clause.phaseModifier !== SyntaxKind.TypeKeyword),
    Arr.map((clause) => Option.fromUndefinedOr(clause.namedBindings)),
    Arr.getSomes,
  );
  return pipe(
    bindings,
    Arr.flatMap((binding) => {
      if (binding.kind === SyntaxKind.NamespaceImport) {
        return [binding.name.text];
      }
      return pipe(
        binding.elements,
        Arr.filter((element) => !element.isTypeOnly),
        Arr.map((element) => element.name.text),
      );
    }),
  );
};

const destructuredName = (declaration: VariableDeclaration): Option.Option<string> => {
  if (declaration.name.kind !== SyntaxKind.ObjectBindingPattern) {
    return Option.none();
  }
  return pipe(
    Option.fromUndefinedOr(declaration.initializer),
    Option.filter(isIdentifier),
    Option.map((initializer) => initializer.text),
  );
};

const problemOf =
  (names: readonly string[]) =>
  (declaration: VariableDeclaration): Option.Option<Problem> =>
    pipe(
      destructuredName(declaration),
      Option.filter((name) => names.includes(name)),
      Option.map((name) => problemAt({ rule: RULE, message: messageOf(name) })),
      Option.map((report) => report(declaration)),
    );

export const namespaceDestructuringIn =
  () =>
  (sourceFile: SourceFile): readonly Problem[] => {
    const names = importedNames(sourceFile);
    return pipe(
      descendantsOf(sourceFile),
      Arr.filter(isVariableDeclaration),
      Arr.map(problemOf(names)),
      Arr.getSomes,
    );
  };
