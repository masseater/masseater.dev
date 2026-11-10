import { Option, Predicate } from "effect";
import { SyntaxKind } from "typescript/ast";
import type { BinaryExpression, Node } from "typescript/ast";
import { isSourceFile } from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";

import { variableInitializer } from "./binder-cjs.ts";
import { declareExport, declareSourceFileMember } from "./binder-declarations.ts";
import type { FileBinding, SymbolFlagPair } from "./binder-declarations.ts";
import { isAccessExpression, isDynamicElementAccess, isThisKeyword } from "./binder-syntax.ts";
import { EMPTY, combineFlags } from "./flags.ts";

const THIS_CONTAINER_KINDS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ModuleDeclaration,
  SyntaxKind.ClassStaticBlockDeclaration,
  SyntaxKind.PropertyDeclaration,
  SyntaxKind.PropertySignature,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.MethodSignature,
  SyntaxKind.Constructor,
  SyntaxKind.GetAccessor,
  SyntaxKind.SetAccessor,
  SyntaxKind.CallSignature,
  SyntaxKind.ConstructSignature,
  SyntaxKind.IndexSignature,
  SyntaxKind.EnumDeclaration,
  SyntaxKind.SourceFile,
]);

const THIS_PROPERTY_EXPORT: SymbolFlagPair = {
  includes: combineFlags(SymbolFlags.Property, SymbolFlags.ExportValue),
  excludes: EMPTY,
};

const THIS_PROPERTY_LOCAL: SymbolFlagPair = {
  includes: SymbolFlags.FunctionScopedVariable,
  excludes: SymbolFlags.FunctionScopedVariableExcludes,
};

const thisContainerIsFile = (node: Node): boolean => {
  let current = node.parent;
  while (!THIS_CONTAINER_KINDS.has(current.kind)) {
    current = current.parent;
  }
  return isSourceFile(current);
};

const bindThisPropertyAssignment = (binding: FileBinding, node: BinaryExpression): void => {
  if (!thisContainerIsFile(node) || isDynamicElementAccess(node.left)) {
    return;
  }
  if (Predicate.isNotUndefined(binding.commonJsModuleIndicator)) {
    declareExport(binding, node, THIS_PROPERTY_EXPORT);
    return;
  }
  declareSourceFileMember(binding, node, THIS_PROPERTY_LOCAL);
};

const isThisInitialized = (binding: FileBinding, node: BinaryExpression): boolean =>
  isAccessExpression(node.left) &&
  variableInitializer(binding, node.left.expression).pipe(Option.exists(isThisKeyword));

export { bindThisPropertyAssignment, isThisInitialized };
