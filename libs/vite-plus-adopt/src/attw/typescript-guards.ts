import { Option, Predicate } from "effect";
import type { Node } from "typescript/ast";
import {
  isArrayLiteralExpression,
  isArrowFunction,
  isBinaryExpression,
  isBlock,
  isCallExpression,
  isExpressionStatement,
  isForInStatement,
  isFunctionExpression,
  isIdentifier,
  isNumericLiteral,
  isObjectLiteralExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isReturnStatement,
  isShorthandPropertyAssignment,
  isSourceFile,
  isStringLiteral,
  isStringLiteralLikeNode,
  isVariableDeclaration,
} from "typescript/ast/is";

import { isFunctionLike } from "./binder-scopes.ts";
import {
  isAccessExpression,
  isStringOrNumericLiteralLike,
  skipParentheses,
} from "./binder-syntax.ts";
import type { AccessExpression } from "./binder-syntax.ts";

type AncestorVerdict = boolean | "quit";

const QUIT = "quit";

const toleratingAbsence =
  <Narrowed extends Node>(guard: (node: Node) => node is Narrowed) =>
  (node: Node | undefined): node is Narrowed =>
    Predicate.isNotUndefined(node) && guard(node);

const isFunctionBlock = (node: Node | undefined): boolean =>
  Predicate.isNotUndefined(node) && isBlock(node) && isFunctionLike(node.parent);

const isFunctionExpressionOrArrowFunction = (node: Node | undefined): boolean =>
  Predicate.isNotUndefined(node) && (isFunctionExpression(node) || isArrowFunction(node));

const ancestorMatching = (
  node: Option.Option<Node>,
  judge: (candidate: Node) => AncestorVerdict,
): Option.Option<Node> => {
  if (Option.isNone(node)) {
    return node;
  }
  const verdict = judge(node.value);
  if (verdict === QUIT) {
    return Option.none();
  }
  if (verdict) {
    return node;
  }
  return ancestorMatching(Option.fromNullishOr(node.value.parent), judge);
};

const findAncestor = (
  node: Node | undefined,
  judge: (candidate: Node) => AncestorVerdict,
): Node | undefined => Option.getOrUndefined(ancestorMatching(Option.fromNullishOr(node), judge));

const getNameOfAccessExpression = (node: AccessExpression): Node => {
  if (isPropertyAccessExpression(node)) {
    return node.name;
  }
  return skipParentheses(node.argumentExpression);
};

const nodeFunctions = {
  findAncestor,
  forEachChild: (node: Node, visit: (child: Node) => unknown): unknown => node.forEachChild(visit),
  getNameOfAccessExpression,
  isAccessExpression: toleratingAbsence(isAccessExpression),
  isArrayLiteralExpression: toleratingAbsence(isArrayLiteralExpression),
  isBinaryExpression: toleratingAbsence(isBinaryExpression),
  isBlock: toleratingAbsence(isBlock),
  isCallExpression: toleratingAbsence(isCallExpression),
  isExpressionStatement: toleratingAbsence(isExpressionStatement),
  isForInStatement: toleratingAbsence(isForInStatement),
  isFunctionBlock,
  isFunctionExpression: toleratingAbsence(isFunctionExpression),
  isFunctionExpressionOrArrowFunction,
  isIdentifier: toleratingAbsence(isIdentifier),
  isNumericLiteral: toleratingAbsence(isNumericLiteral),
  isObjectLiteralExpression: toleratingAbsence(isObjectLiteralExpression),
  isPropertyAssignment: toleratingAbsence(isPropertyAssignment),
  isReturnStatement: toleratingAbsence(isReturnStatement),
  isShorthandPropertyAssignment: toleratingAbsence(isShorthandPropertyAssignment),
  isSourceFile: toleratingAbsence(isSourceFile),
  isStringLiteral: toleratingAbsence(isStringLiteral),
  isStringLiteralLike: toleratingAbsence(isStringLiteralLikeNode),
  isStringOrNumericLiteralLike: toleratingAbsence(isStringOrNumericLiteralLike),
  isVariableDeclaration: toleratingAbsence(isVariableDeclaration),
  skipParentheses,
};

export { nodeFunctions };
