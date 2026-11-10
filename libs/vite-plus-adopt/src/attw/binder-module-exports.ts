import { Array as Arr, Option, Predicate } from "effect";
import type { BinaryExpression, Node } from "typescript/ast";
import { isObjectLiteralExpression, isShorthandPropertyAssignment } from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";

import {
  isExportsOrModuleExportsOrAlias,
  lookupSymbolForName,
  setCommonJsModuleIndicator,
} from "./binder-cjs.ts";
import { declare, declareExport } from "./binder-declarations.ts";
import type { FileBinding, Scope, SymbolFlagPair } from "./binder-declarations.ts";
import { setValueDeclaration } from "./binder-symbols.ts";
import {
  getRightMostAssignedExpression,
  isAccessExpression,
  isAliasableExpression,
  isModuleExportsAccessExpression,
} from "./binder-syntax.ts";
import { EMPTY, combineFlags } from "./flags.ts";

const isEmptyObjectLiteral = (node: Node): boolean =>
  isObjectLiteralExpression(node) && !Arr.isReadonlyArrayNonEmpty(node.properties);

const MODULE_EXPORTS_ALIAS: SymbolFlagPair = {
  includes: combineFlags(SymbolFlags.Alias, SymbolFlags.Assignment),
  excludes: EMPTY,
};
const MODULE_EXPORTS_VALUE: SymbolFlagPair = {
  includes: combineFlags(
    SymbolFlags.Property,
    SymbolFlags.ExportValue,
    SymbolFlags.ValueModule,
    SymbolFlags.Assignment,
  ),
  excludes: EMPTY,
};

const bindShorthandExports = (binding: FileBinding, assigned: Node): boolean => {
  if (
    !isObjectLiteralExpression(assigned) ||
    !assigned.properties.every(isShorthandPropertyAssignment)
  ) {
    return false;
  }
  for (const property of assigned.properties) {
    declareExport(binding, property, MODULE_EXPORTS_ALIAS);
  }
  return true;
};

const isUnboundModuleExportsValue = (binding: FileBinding, assigned: Node, scope: Scope): boolean =>
  isEmptyObjectLiteral(assigned) ||
  (scope.containerIsFile && isExportsOrModuleExportsOrAlias(binding, assigned));

const bindModuleExportsAssignment = (
  binding: FileBinding,
  node: BinaryExpression,
  scope: Scope,
): void => {
  const assigned = getRightMostAssignedExpression(node.right);
  if (
    !setCommonJsModuleIndicator(binding, node) ||
    isUnboundModuleExportsValue(binding, assigned, scope) ||
    bindShorthandExports(binding, assigned)
  ) {
    return;
  }
  const flags = Option.getOrElse(
    Option.liftPredicate(MODULE_EXPORTS_ALIAS, () => isAliasableExpression(node.right)),
    () => MODULE_EXPORTS_VALUE,
  );
  setValueDeclaration(declareExport(binding, node, flags), node);
};

const MODULE_LOCAL: SymbolFlagPair = {
  includes: combineFlags(SymbolFlags.FunctionScopedVariable, SymbolFlags.ModuleExports),
  excludes: SymbolFlags.FunctionScopedVariableExcludes,
};

const shadowsModule = (binding: FileBinding, scope: Scope): boolean =>
  scope.blockIsFile && Option.isSome(lookupSymbolForName(binding, "module"));

const isTrackedModuleExportsAccess = (binding: FileBinding, node: Node): boolean =>
  binding.isJs &&
  Predicate.isNotUndefined(binding.commonJsModuleIndicator) &&
  isModuleExportsAccessExpression(node);

const bindModuleExportsAccess = (binding: FileBinding, node: Node, scope: Scope): void => {
  if (
    !isAccessExpression(node) ||
    !isTrackedModuleExportsAccess(binding, node) ||
    shadowsModule(binding, scope)
  ) {
    return;
  }
  declare(binding, {
    target: { table: Option.some(binding.locals), parent: Option.none() },
    node: node.expression,
    flags: MODULE_LOCAL,
  });
};

export { bindModuleExportsAccess, bindModuleExportsAssignment };
