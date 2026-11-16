import { Array as Arr, Option, pipe } from "effect";

import {
  isCallExpression,
  isExportDeclaration,
  isImportDeclaration,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isSignatureDeclaration,
  isSourceFile,
  isStringLiteral,
  isVariableDeclaration,
  SyntaxKind,
} from "#/shared/lib/compiler.ts";
import type { Checker, Node, SourceFile, StringLiteral } from "#/shared/lib/compiler.ts";
import { declarationsOf, descendantsOf, isInsideAny } from "#/shared/lib/syntax.ts";
import { finiteValuesOf } from "#/shared/lib/values.ts";

const NAME = /^[\w@.#/:$-]{2,}$/u;

const REQUIRE = "require";

const isModuleSpecifier = (node: StringLiteral): boolean => {
  const { parent } = node;
  return (
    isImportDeclaration(parent) ||
    isExportDeclaration(parent) ||
    parent.kind === SyntaxKind.ExternalModuleReference ||
    parent.kind === SyntaxKind.LiteralType ||
    (isCallExpression(parent) &&
      (parent.expression.kind === SyntaxKind.ImportKeyword ||
        parent.expression.getText() === REQUIRE))
  );
};

const isModuleScope = (node: Node): boolean => {
  const { parent } = node;
  if (isSourceFile(parent)) {
    return true;
  }
  return !isSignatureDeclaration(parent) && isModuleScope(parent);
};

const isModuleConstant = (node: Node): boolean =>
  isVariableDeclaration(node.parent) &&
  node.parent.initializer === node &&
  isModuleScope(node.parent);

const isDefinition = (node: StringLiteral): boolean => {
  const { parent } = node;
  if (isPropertyAssignment(parent)) {
    return (
      parent.initializer === node &&
      isObjectLiteralExpression(parent.parent) &&
      isModuleConstant(parent.parent)
    );
  }
  return isModuleConstant(node);
};

const isTyped =
  (checker: Checker) =>
  (node: StringLiteral): boolean =>
    Option.fromUndefinedOr(checker.getContextualType(node)).pipe(
      Option.flatMap(finiteValuesOf(checker)),
      Option.isSome,
    );

const specifierOf = (statement: Node): Option.Option<StringLiteral> => {
  if (!isImportDeclaration(statement) && !isExportDeclaration(statement)) {
    return Option.none();
  }
  return Option.fromUndefinedOr(statement.moduleSpecifier).pipe(Option.filter(isStringLiteral));
};

const importedFilesOf =
  (checker: Checker) =>
  (sourceFile: SourceFile): readonly string[] =>
    pipe(
      sourceFile.statements,
      Arr.map(specifierOf),
      Arr.getSomes,
      Arr.flatMap((specifier) =>
        pipe(
          Option.fromUndefinedOr(checker.getSymbolAtLocation(specifier)),
          Option.flatMap((symbol) => Arr.head(declarationsOf(symbol))),
          Option.map((declaration) => declaration.getSourceFile().fileName),
          Option.toArray,
        ),
      ),
      Arr.dedupe,
    );

const freeLiteralsIn =
  (checker: Checker) =>
  (sourceFile: SourceFile, excluded: readonly Node[]): readonly string[] =>
    pipe(
      descendantsOf(sourceFile),
      Arr.filter((node): node is StringLiteral => isStringLiteral(node)),
      Arr.filter((node) => NAME.test(node.text)),
      Arr.filter(isDefinition),
      Arr.filter((node) => !isModuleSpecifier(node)),
      Arr.filter((node) => !isInsideAny(excluded)(node) && !isTyped(checker)(node)),
      Arr.map((node) => node.text),
      Arr.dedupe,
    );

export interface FileFacts {
  readonly file: string;
  readonly values: readonly string[];
  readonly imports: readonly string[];
}

export const fileFactsIn =
  (checker: Checker) =>
  (sourceFiles: readonly SourceFile[], excluded: readonly Node[]): readonly FileFacts[] =>
    pipe(
      sourceFiles,
      Arr.map((sourceFile) => ({
        file: sourceFile.fileName,
        values: freeLiteralsIn(checker)(sourceFile, excluded),
        imports: importedFilesOf(checker)(sourceFile),
      })),
      Arr.filter(
        (facts) =>
          Arr.isReadonlyArrayNonEmpty(facts.values) || Arr.isReadonlyArrayNonEmpty(facts.imports),
      ),
    );
