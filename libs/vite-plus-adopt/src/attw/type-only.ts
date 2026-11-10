import { Array as Arr, Option, Predicate } from "effect";
import { SyntaxKind } from "typescript/ast";
import type { ExportDeclaration, Node } from "typescript/ast";
import {
  isExportDeclaration,
  isExportSpecifier,
  isImportClause,
  isImportEqualsDeclaration,
  isImportSpecifier,
  isNamespaceExport,
  isNamespaceImport,
} from "typescript/ast/is";

const isTypeOnlyImportClause = (node: Node): boolean =>
  isImportClause(node) && node.phaseModifier === SyntaxKind.TypeKeyword;

type TypeOnlyRule = (node: Node) => Option.Option<boolean>;

const rule =
  <Narrowed extends Node>(
    guard: (node: Node) => node is Narrowed,
    test: (node: Narrowed) => boolean,
  ): TypeOnlyRule =>
  (node) =>
    Option.liftPredicate(node, guard).pipe(Option.map(test));

const isTypeOnlyExportStatement = (node: Node): boolean =>
  isExportDeclaration(node) && node.isTypeOnly;

const isTypeOnlyReexportAll = (node: ExportDeclaration): boolean =>
  [
    node.isTypeOnly,
    Predicate.isNotUndefined(node.moduleSpecifier),
    Predicate.isUndefined(node.exportClause),
  ].every(Boolean);

const TYPE_ONLY_RULES: readonly TypeOnlyRule[] = [
  rule(
    isImportSpecifier,
    (specifier) => specifier.isTypeOnly || isTypeOnlyImportClause(specifier.parent.parent),
  ),
  rule(isNamespaceImport, (namespace) => isTypeOnlyImportClause(namespace.parent)),
  rule(isImportEqualsDeclaration, (declaration) => declaration.isTypeOnly),
  rule(isImportClause, isTypeOnlyImportClause),
  rule(
    isExportSpecifier,
    (specifier) => specifier.isTypeOnly || isTypeOnlyExportStatement(specifier.parent.parent),
  ),
  rule(isExportDeclaration, isTypeOnlyReexportAll),
  rule(isNamespaceExport, (namespace) => isTypeOnlyExportStatement(namespace.parent)),
];

const isTypeOnlyImportOrExportDeclaration = (node: Node): boolean =>
  Arr.findFirst(TYPE_ONLY_RULES, (check) => check(node)).pipe(Option.getOrElse(() => false));

export { isTypeOnlyImportOrExportDeclaration };
