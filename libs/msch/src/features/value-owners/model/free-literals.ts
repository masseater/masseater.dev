import { Array as Arr, Option, pipe } from "effect";

import {
  isCallExpression,
  isExportDeclaration,
  isImportDeclaration,
  isPropertyAssignment,
  isSignatureDeclaration,
  isSourceFile,
  isStringLiteral,
  isVariableDeclaration,
  SyntaxKind,
} from "#/shared/lib/compiler.ts";
import type { Checker, Node, SourceFile, StringLiteral } from "#/shared/lib/compiler.ts";
import { contains, descendantsOf } from "#/shared/lib/syntax.ts";
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

const isDefinition = (node: StringLiteral): boolean => {
  const { parent } = node;
  return (
    ((isVariableDeclaration(parent) && parent.initializer === node) ||
      (isPropertyAssignment(parent) && parent.initializer === node)) &&
    isModuleScope(parent)
  );
};

const isTyped =
  (checker: Checker) =>
  (node: StringLiteral): boolean =>
    Option.fromUndefinedOr(checker.getContextualType(node)).pipe(
      Option.flatMap(finiteValuesOf(checker)),
      Option.isSome,
    );

export const freeLiteralsIn =
  (checker: Checker) =>
  (sourceFile: SourceFile, excluded: readonly Node[]): readonly string[] =>
    pipe(
      descendantsOf(sourceFile),
      Arr.filter((node): node is StringLiteral => isStringLiteral(node)),
      Arr.filter((node) => NAME.test(node.text)),
      Arr.filter(isDefinition),
      Arr.filter((node) => !isModuleSpecifier(node)),
      Arr.filter((node) => !Arr.some(excluded, (outer) => contains(outer)(node))),
      Arr.filter((node) => !isTyped(checker)(node)),
      Arr.map((node) => node.text),
      Arr.dedupe,
    );
