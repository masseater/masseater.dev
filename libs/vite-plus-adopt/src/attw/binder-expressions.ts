import { Predicate } from "effect";
import type { BinaryExpression, CallExpression, Node } from "typescript/ast";
import { isBinaryExpression, isCallExpression } from "typescript/ast/is";

import { AssignmentKind, getAssignmentDeclarationKind } from "./binder-assignment.ts";
import type { AssignmentDeclarationKind } from "./binder-assignment.ts";
import {
  bindExportsPropertyAssignment,
  bindObjectDefinePropertyExport,
  setCommonJsModuleIndicator,
} from "./binder-cjs.ts";
import type { FileBinding, Scope } from "./binder-declarations.ts";
import {
  bindObjectDefinePropertyAssignment,
  bindSpecialPropertyAssignment,
} from "./binder-expando.ts";
import { bindModuleExportsAccess, bindModuleExportsAssignment } from "./binder-module-exports.ts";
import { isRequireCall } from "./binder-syntax.ts";
import { bindThisPropertyAssignment, isThisInitialized } from "./binder-this.ts";

type ExpressionBinder<Bound extends Node> = (
  binding: FileBinding,
  node: Bound,
  scope: Scope,
) => void;

const isThisAliasAssignment: (
  binding: FileBinding,
  node: BinaryExpression,
  scope: Scope,
) => boolean = (binding, node, scope) =>
  binding.isJs && scope.blockIsFile && isThisInitialized(binding, node);

const bindPropertyAssignment: ExpressionBinder<BinaryExpression> = (binding, node, scope) => {
  if (isThisAliasAssignment(binding, node, scope)) {
    bindThisPropertyAssignment(binding, node);
    return;
  }
  bindSpecialPropertyAssignment(binding, node, scope);
};

const BINARY_BINDERS: ReadonlyMap<
  AssignmentDeclarationKind,
  ExpressionBinder<BinaryExpression>
> = new Map([
  [AssignmentKind.ExportsProperty, bindExportsPropertyAssignment],
  [AssignmentKind.ModuleExports, bindModuleExportsAssignment],
  [AssignmentKind.ThisProperty, bindThisPropertyAssignment],
  [AssignmentKind.Property, bindPropertyAssignment],
]);

const CALL_BINDERS: ReadonlyMap<
  AssignmentDeclarationKind,
  ExpressionBinder<CallExpression>
> = new Map([
  [AssignmentKind.ObjectDefinePropertyExports, bindObjectDefinePropertyExport],
  [AssignmentKind.ObjectDefinePropertyValue, bindObjectDefinePropertyAssignment],
]);

const bindBinaryExpression: ExpressionBinder<BinaryExpression> = (binding, node, scope) => {
  const binder = BINARY_BINDERS.get(getAssignmentDeclarationKind(node, binding.isJs));
  if (Predicate.isNotUndefined(binder)) {
    binder(binding, node, scope);
  }
};

const marksCommonJsModule = (binding: FileBinding, node: CallExpression): boolean =>
  binding.isJs &&
  Predicate.isUndefined(binding.commonJsModuleIndicator) &&
  isRequireCall(node, false);

const bindCallExpression: ExpressionBinder<CallExpression> = (binding, node, scope) => {
  const kind = getAssignmentDeclarationKind(node, binding.isJs);
  const binder = CALL_BINDERS.get(kind);
  if (Predicate.isNotUndefined(binder)) {
    binder(binding, node, scope);
    return;
  }
  if (kind === AssignmentKind.None && marksCommonJsModule(binding, node)) {
    setCommonJsModuleIndicator(binding, node);
  }
};

const bindExpression: ExpressionBinder<Node> = (binding, node, scope) => {
  if (isBinaryExpression(node)) {
    bindBinaryExpression(binding, node, scope);
    return;
  }
  if (isCallExpression(node)) {
    bindCallExpression(binding, node, scope);
    return;
  }
  bindModuleExportsAccess(binding, node, scope);
};

export { bindExpression };
export type { ExpressionBinder };
