import { Option } from "effect";
import { SyntaxKind } from "typescript/ast";
import type {
  BinaryExpression,
  CallExpression,
  ElementAccessExpression,
  Identifier,
  NoSubstitutionTemplateLiteral,
  Node,
  NumericLiteral,
  PropertyAccessExpression,
  StringLiteral,
} from "typescript/ast";
import {
  isBinaryExpression,
  isCallExpression,
  isElementAccessExpression,
  isIdentifier,
  isNumericLiteral,
  isParenthesizedExpression,
  isPrefixUnaryExpression,
  isPropertyAccessExpression,
  isStringLiteralLikeNode,
  isVoidExpression,
} from "typescript/ast/is";

import { escapeLeadingUnderscores } from "./binder-symbols.ts";

type AccessExpression = PropertyAccessExpression | ElementAccessExpression;
type LiteralLike = StringLiteral | NoSubstitutionTemplateLiteral | NumericLiteral;

const REQUIRE_ARGUMENTS = 1;
const DEFINE_PROPERTY_ARGUMENTS = 3;
const ZERO_TEXT = "0";

const isStringOrNumericLiteralLike = (node: Node): node is LiteralLike =>
  isStringLiteralLikeNode(node) || isNumericLiteral(node);

const isAccessExpression = (node: Node): node is AccessExpression =>
  isPropertyAccessExpression(node) || isElementAccessExpression(node);

const isThisKeyword = (node: Node): boolean => node.kind === SyntaxKind.ThisKeyword;

const skipParentheses = (node: Node): Node => {
  let current = node;
  while (isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
};

const isEntityNameExpression = (node: Node): boolean =>
  isIdentifier(node) ||
  (isPropertyAccessExpression(node) &&
    isIdentifier(node.name) &&
    isEntityNameExpression(node.expression));

const isLiteralLikeElementAccess = (node: Node): node is ElementAccessExpression =>
  isElementAccessExpression(node) && isStringOrNumericLiteralLike(node.argumentExpression);

interface BindableStaticRules {
  readonly excludeThisKeyword: boolean;
  readonly allowEntityName: boolean;
}

const STATIC_ACCESS: BindableStaticRules = { excludeThisKeyword: false, allowEntityName: false };
const STATIC_NAME: BindableStaticRules = { excludeThisKeyword: true, allowEntityName: true };

const isAllowedEntityName = (node: Node, rules: BindableStaticRules): boolean =>
  rules.allowEntityName && isEntityNameExpression(node);

const isStaticAccess = (node: Node): node is AccessExpression =>
  isPropertyAccessExpression(node) || isLiteralLikeElementAccess(node);

const hasStaticName = (node: AccessExpression): boolean =>
  !isPropertyAccessExpression(node) || isIdentifier(node.name);

const isAllowedThis = (node: Node, rules: BindableStaticRules): boolean =>
  !rules.excludeThisKeyword && isThisKeyword(node);

const hasBindableOwner = (
  node: AccessExpression,
  rules: BindableStaticRules,
  isBindable: (owner: Node, ownerRules: BindableStaticRules) => boolean,
): boolean =>
  isAllowedThis(node.expression, rules) ||
  (hasStaticName(node) && isBindable(node.expression, STATIC_NAME));

const isBindableStatic = (node: Node, rules: BindableStaticRules): boolean =>
  isAllowedEntityName(node, rules) ||
  (isStaticAccess(node) && hasBindableOwner(node, rules, isBindableStatic));

const nameText = (node: Node): Option.Option<string> => {
  if (isIdentifier(node) || isStringOrNumericLiteralLike(node)) {
    return Option.some(node.text);
  }
  return Option.none();
};

const getElementOrPropertyAccessName = (node: AccessExpression): Option.Option<string> => {
  if (isPropertyAccessExpression(node)) {
    return nameText(node.name).pipe(Option.map(escapeLeadingUnderscores));
  }
  return Option.liftPredicate(
    skipParentheses(node.argumentExpression),
    isStringOrNumericLiteralLike,
  ).pipe(Option.map((literal) => escapeLeadingUnderscores(literal.text)));
};

const isNamedIdentifier = (node: Node, name: string): node is Identifier =>
  isIdentifier(node) && node.text === name;

const isExportsIdentifier = (node: Node): boolean => isIdentifier(node) && node.text === "exports";

const isModuleExportsAccessExpression = (node: Node): boolean =>
  (isPropertyAccessExpression(node) || isLiteralLikeElementAccess(node)) &&
  isNamedIdentifier(node.expression, "module") &&
  Option.contains(getElementOrPropertyAccessName(node), "exports");

const hasRequireArgument = (node: CallExpression, requireStringLiteral: boolean): boolean => {
  const [argument] = node.arguments;
  return (
    node.arguments.length === REQUIRE_ARGUMENTS &&
    (!requireStringLiteral ||
      Option.fromNullishOr(argument).pipe(Option.exists((value) => isStringLiteralLikeNode(value))))
  );
};

const isRequireCall = (node: Node, requireStringLiteral: boolean): node is CallExpression =>
  isCallExpression(node) &&
  isNamedIdentifier(node.expression, "require") &&
  hasRequireArgument(node, requireStringLiteral);

const isAssignmentExpression = (node: Node): node is BinaryExpression =>
  isBinaryExpression(node) && node.operatorToken.kind === SyntaxKind.EqualsToken;

const getRightMostAssignedExpression = (node: Node): Node => {
  let current = node;
  while (isAssignmentExpression(current)) {
    current = current.right;
  }
  return current;
};

const isVoidZero = (node: Node): boolean =>
  isVoidExpression(node) && isNumericLiteral(node.expression) && node.expression.text === ZERO_TEXT;

const isSignedNumericLiteral = (node: Node): boolean =>
  isPrefixUnaryExpression(node) &&
  (node.operator === SyntaxKind.PlusToken || node.operator === SyntaxKind.MinusToken) &&
  isNumericLiteral(node.operand);

const isDynamicElementAccess = (node: Node): boolean => {
  if (!isElementAccessExpression(node)) {
    return false;
  }
  const argument = skipParentheses(node.argumentExpression);
  return !isStringOrNumericLiteralLike(argument) && !isSignedNumericLiteral(argument);
};

const isObjectDefinePropertyCallee = (node: Node): boolean =>
  isPropertyAccessExpression(node) &&
  isNamedIdentifier(node.expression, "Object") &&
  isNamedIdentifier(node.name, "defineProperty");

const isBindableObjectDefinePropertyCall = (node: CallExpression): boolean => {
  const [target, property] = node.arguments;
  return (
    node.arguments.length === DEFINE_PROPERTY_ARGUMENTS &&
    isObjectDefinePropertyCallee(node.expression) &&
    Option.exists(Option.fromNullishOr(property), isStringOrNumericLiteralLike) &&
    Option.exists(Option.fromNullishOr(target), (value) => isBindableStatic(value, STATIC_NAME))
  );
};

const isAliasableExpression = (node: Node): boolean =>
  isEntityNameExpression(node) || node.kind === SyntaxKind.ClassExpression;

export {
  STATIC_ACCESS,
  STATIC_NAME,
  getElementOrPropertyAccessName,
  getRightMostAssignedExpression,
  isAccessExpression,
  isAliasableExpression,
  isAssignmentExpression,
  isBindableObjectDefinePropertyCall,
  isBindableStatic,
  isDynamicElementAccess,
  isExportsIdentifier,
  isModuleExportsAccessExpression,
  isNamedIdentifier,
  isRequireCall,
  isStringOrNumericLiteralLike,
  isThisKeyword,
  isVoidZero,
  nameText,
  skipParentheses,
};
export type { AccessExpression, BindableStaticRules, LiteralLike };
