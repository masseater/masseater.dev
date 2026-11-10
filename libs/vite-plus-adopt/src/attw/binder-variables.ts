import { Option, Predicate } from "effect";
import { NodeFlags } from "typescript/ast";
import type { BindingElement, Node, VariableDeclaration } from "typescript/ast";
import {
  isArrayBindingPattern,
  isBindingElement,
  isCatchClause,
  isObjectBindingPattern,
  isParameterDeclaration,
  isVariableDeclaration,
  isVariableDeclarationList,
} from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";

import { declareBlockScoped, declareSourceFileMember } from "./binder-declarations.ts";
import type { FileBinding, Scope, SymbolFlagPair } from "./binder-declarations.ts";
import { hasExportModifier } from "./binder-names.ts";
import { isAccessExpression, isRequireCall } from "./binder-syntax.ts";
import { hasFlag } from "./flags.ts";

type VariableLike = VariableDeclaration | BindingElement;

const ALIAS: SymbolFlagPair = { includes: SymbolFlags.Alias, excludes: SymbolFlags.AliasExcludes };
const BLOCK_VARIABLE: SymbolFlagPair = {
  includes: SymbolFlags.BlockScopedVariable,
  excludes: SymbolFlags.BlockScopedVariableExcludes,
};
const FUNCTION_VARIABLE: SymbolFlagPair = {
  includes: SymbolFlags.FunctionScopedVariable,
  excludes: SymbolFlags.FunctionScopedVariableExcludes,
};

const isBindingPattern = (node: Node | undefined): boolean =>
  Predicate.isNotUndefined(node) && (isObjectBindingPattern(node) || isArrayBindingPattern(node));

const isReparsed = (node: Node): boolean => hasFlag(node.flags, NodeFlags.Reparsed);

const declarationOfBinding = (node: Node): Node => {
  let current = node;
  while (isBindingElement(current)) {
    current = current.parent.parent;
  }
  return current;
};

const isBlockOrCatchScoped = (node: Node): boolean => {
  const declaration = declarationOfBinding(node);
  return (
    isVariableDeclaration(declaration) &&
    (isCatchClause(declaration.parent) ||
      (isVariableDeclarationList(declaration.parent) &&
        hasFlag(declaration.parent.flags, NodeFlags.BlockScoped)))
  );
};

const isParameterBinding = (node: Node): boolean =>
  isParameterDeclaration(declarationOfBinding(node));

const hasJSDocTypeTag = (node: VariableLike): boolean =>
  isVariableDeclaration(node) && Option.exists(Option.fromNullishOr(node.type), isReparsed);

const leftmostAccessTarget = (node: Node): Node => {
  let current = node;
  while (isAccessExpression(current)) {
    current = current.expression;
  }
  return current;
};

const isRequireInitialized = (node: Node): boolean =>
  isVariableDeclaration(node) &&
  Option.exists(Option.fromNullishOr(node.initializer), (initializer) =>
    isRequireCall(leftmostAccessTarget(initializer), true),
  );

const possibleDeclarationOf = (node: VariableLike): Node => {
  if (isVariableDeclaration(node)) {
    return node;
  }
  return node.parent.parent;
};

const isRequireAlias = (binding: FileBinding, node: VariableLike): boolean =>
  binding.isJs &&
  isRequireInitialized(possibleDeclarationOf(node)) &&
  !hasJSDocTypeTag(node) &&
  !hasExportModifier(node);

type VariableBinder = (binding: FileBinding, node: VariableLike, scope: Scope) => void;

const bindRequireAlias: VariableBinder = (binding, node, scope) => {
  if (scope.containerIsFile) {
    declareSourceFileMember(binding, node, ALIAS);
  }
};

const bindBlockVariable: VariableBinder = (binding, node, scope) => {
  if (scope.blockIsFile) {
    declareBlockScoped(binding, node, BLOCK_VARIABLE);
  }
};

const bindFunctionVariable: VariableBinder = (binding, node, scope) => {
  if (scope.containerIsFile && !isParameterBinding(node)) {
    declareSourceFileMember(binding, node, FUNCTION_VARIABLE);
  }
};

const variableBinderFor = (binding: FileBinding, node: VariableLike): VariableBinder => {
  if (isRequireAlias(binding, node)) {
    return bindRequireAlias;
  }
  if (isBlockOrCatchScoped(node)) {
    return bindBlockVariable;
  }
  return bindFunctionVariable;
};

const bindVariable = (binding: FileBinding, node: VariableLike, scope: Scope): void => {
  if (!isBindingPattern(node.name)) {
    variableBinderFor(binding, node)(binding, node, scope);
  }
};

export { bindVariable, isReparsed };
export type { VariableLike };
