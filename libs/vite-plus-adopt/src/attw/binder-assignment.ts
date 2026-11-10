import { Option } from "effect";
import { SyntaxKind } from "typescript/ast";
import type { BinaryExpression, CallExpression, Node } from "typescript/ast";
import { isBinaryExpression, isCallExpression, isObjectLiteralExpression } from "typescript/ast/is";

import {
  STATIC_ACCESS,
  STATIC_NAME,
  getElementOrPropertyAccessName,
  getRightMostAssignedExpression,
  isAccessExpression,
  isBindableObjectDefinePropertyCall,
  isBindableStatic,
  isDynamicElementAccess,
  isExportsIdentifier,
  isModuleExportsAccessExpression,
  isNamedIdentifier,
  isThisKeyword,
  isVoidZero,
} from "./binder-syntax.ts";
import type { AccessExpression } from "./binder-syntax.ts";

const AssignmentKind = {
  None: "None",
  ExportsProperty: "ExportsProperty",
  ModuleExports: "ModuleExports",
  PrototypeProperty: "PrototypeProperty",
  ThisProperty: "ThisProperty",
  Property: "Property",
  Prototype: "Prototype",
  ObjectDefinePropertyValue: "ObjectDefinePropertyValue",
  ObjectDefinePropertyExports: "ObjectDefinePropertyExports",
  ObjectDefinePrototypeProperty: "ObjectDefinePrototypeProperty",
} as const;

type AssignmentDeclarationKind = (typeof AssignmentKind)[keyof typeof AssignmentKind];

const PROTOTYPE = "prototype";

const isPrototypeAccess = (node: Node): boolean =>
  isAccessExpression(node) &&
  isBindableStatic(node, STATIC_ACCESS) &&
  Option.contains(getElementOrPropertyAccessName(node), PROTOTYPE);

const definePropertyTargetKind = (target: Node): AssignmentDeclarationKind => {
  if (isExportsIdentifier(target) || isModuleExportsAccessExpression(target)) {
    return AssignmentKind.ObjectDefinePropertyExports;
  }
  if (isPrototypeAccess(target)) {
    return AssignmentKind.ObjectDefinePrototypeProperty;
  }
  return AssignmentKind.ObjectDefinePropertyValue;
};

const callAssignmentKind = (node: CallExpression): AssignmentDeclarationKind => {
  const [target] = node.arguments;
  if (!isBindableObjectDefinePropertyCall(node)) {
    return AssignmentKind.None;
  }
  return Option.match(Option.fromNullishOr(target), {
    onNone: () => AssignmentKind.None,
    onSome: definePropertyTargetKind,
  });
};

const leftmostAccess = (node: AccessExpression): AccessExpression => {
  let current = node;
  while (isAccessExpression(current.expression)) {
    current = current.expression;
  }
  return current;
};

const isExportsTarget = (nextToLast: AccessExpression): boolean =>
  isNamedIdentifier(nextToLast.expression, "exports") ||
  (isNamedIdentifier(nextToLast.expression, "module") &&
    Option.contains(getElementOrPropertyAccessName(nextToLast), "exports"));

type KindRule<Subject> = readonly [
  matches: (subject: Subject) => boolean,
  kind: AssignmentDeclarationKind,
];

const firstMatchingKind = <Subject>(
  rules: readonly KindRule<Subject>[],
  subject: Subject,
): AssignmentDeclarationKind =>
  Option.fromNullishOr(rules.find(([matches]) => matches(subject))).pipe(
    Option.map(([, kind]) => kind),
    Option.getOrElse((): AssignmentDeclarationKind => AssignmentKind.None),
  );

const isExportsProperty = (left: AccessExpression): boolean =>
  isExportsTarget(leftmostAccess(left)) && isBindableStatic(left, STATIC_ACCESS);

const isNamedProperty = (left: AccessExpression): boolean =>
  isBindableStatic(left, STATIC_NAME) || isDynamicElementAccess(left);

const STATIC_NAME_KINDS: readonly KindRule<AccessExpression>[] = [
  [(left) => isPrototypeAccess(left.expression), AssignmentKind.PrototypeProperty],
  [isExportsProperty, AssignmentKind.ExportsProperty],
  [isNamedProperty, AssignmentKind.Property],
];

const staticNamePropertyKind = (left: AccessExpression): AssignmentDeclarationKind =>
  firstMatchingKind(STATIC_NAME_KINDS, left);

const propertyAccessKind = (left: AccessExpression): AssignmentDeclarationKind => {
  if (isThisKeyword(left.expression)) {
    return AssignmentKind.ThisProperty;
  }
  if (isModuleExportsAccessExpression(left)) {
    return AssignmentKind.ModuleExports;
  }
  if (isBindableStatic(left.expression, STATIC_NAME)) {
    return staticNamePropertyKind(left);
  }
  return AssignmentKind.None;
};

const initializerOfBinary = (node: BinaryExpression): Node => {
  let current = node;
  while (isBinaryExpression(current.right)) {
    current = current.right;
  }
  return current.right;
};

const isPrototypeObjectAssignment = (node: BinaryExpression, left: AccessExpression): boolean =>
  isBindableStatic(left.expression, STATIC_NAME) &&
  Option.contains(getElementOrPropertyAccessName(left), PROTOTYPE) &&
  isObjectLiteralExpression(initializerOfBinary(node));

const isPlainAssignment = (node: BinaryExpression): boolean =>
  node.operatorToken.kind === SyntaxKind.EqualsToken &&
  !isVoidZero(getRightMostAssignedExpression(node));

const assignedAccess = (node: BinaryExpression): Option.Option<AccessExpression> =>
  Option.liftPredicate(node.left, isAccessExpression).pipe(
    Option.filter(() => isPlainAssignment(node)),
  );

const accessAssignmentKind = (
  node: BinaryExpression,
  left: AccessExpression,
): AssignmentDeclarationKind => {
  if (isPrototypeObjectAssignment(node, left)) {
    return AssignmentKind.Prototype;
  }
  return propertyAccessKind(left);
};

const binaryAssignmentKind = (node: BinaryExpression): AssignmentDeclarationKind =>
  assignedAccess(node).pipe(
    Option.map((left) => accessAssignmentKind(node, left)),
    Option.getOrElse((): AssignmentDeclarationKind => AssignmentKind.None),
  );

const getAssignmentDeclarationKind = (
  node: BinaryExpression | CallExpression,
  inJsFile: boolean,
): AssignmentDeclarationKind => {
  const kind = Option.match(Option.liftPredicate(node, isCallExpression), {
    onNone: () =>
      Option.match(Option.liftPredicate(node, isBinaryExpression), {
        onNone: () => AssignmentKind.None,
        onSome: binaryAssignmentKind,
      }),
    onSome: callAssignmentKind,
  });
  if (kind === AssignmentKind.Property || inJsFile) {
    return kind;
  }
  return AssignmentKind.None;
};

export { AssignmentKind, getAssignmentDeclarationKind, isPrototypeAccess };
export type { AssignmentDeclarationKind };
