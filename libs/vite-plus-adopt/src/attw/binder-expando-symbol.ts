import { Array as Arr, Option } from "effect";
import { SyntaxKind } from "typescript/ast";
import type { Node } from "typescript/ast";
import {
  isArrowFunction,
  isBinaryExpression,
  isCallExpression,
  isClassExpression,
  isFunctionDeclaration,
  isFunctionExpression,
  isObjectLiteralExpression,
  isPropertyAccessExpression,
  isVariableDeclaration,
} from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";

import { isPrototypeAccess } from "./binder-assignment.ts";
import { isFunctionLike } from "./binder-scopes.ts";
import type { BoundSymbol } from "./binder-symbols.ts";
import {
  getRightMostAssignedExpression,
  isAssignmentExpression,
  skipParentheses,
} from "./binder-syntax.ts";
import { combineFlags, hasFlag } from "./flags.ts";

const EXPANDO_FLAGS = combineFlags(
  SymbolFlags.Function,
  SymbolFlags.Class,
  SymbolFlags.NamespaceModule,
);

const isFunctionOrArrow = (node: Node): boolean =>
  isFunctionExpression(node) || isArrowFunction(node);

const expandoInitializer = (
  initializer: Node,
  isPrototypeAssignment: boolean,
): Option.Option<Node> => {
  if (isCallExpression(initializer)) {
    return Option.liftPredicate(initializer, () =>
      isFunctionOrArrow(skipParentheses(initializer.expression)),
    );
  }
  if (isFunctionOrArrow(initializer) || isClassExpression(initializer)) {
    return Option.some(initializer);
  }
  return Option.liftPredicate(
    initializer,
    (candidate) =>
      isObjectLiteralExpression(candidate) &&
      (!Arr.isReadonlyArrayNonEmpty(candidate.properties) || isPrototypeAssignment),
  );
};

const assignedExpandoInitializer = (node: Node): Option.Option<Node> =>
  Option.flatMap(Option.liftPredicate(node.parent, isAssignmentExpression), (assignment) =>
    expandoInitializer(assignment.right, isPrototypeAccess(assignment.left)),
  );

const assignedRight = (node: Node): Option.Option<Node> =>
  Option.liftPredicate(node.parent, isBinaryExpression).pipe(
    Option.filter(() => isPropertyAccessExpression(node)),
    Option.map((assignment) => assignment.right),
  );

const initializerOf = (node: Node): Option.Option<Node> => {
  if (isVariableDeclaration(node)) {
    return Option.fromNullishOr(node.initializer);
  }
  if (isBinaryExpression(node)) {
    return Option.some(node.right);
  }
  return assignedRight(node);
};

const prototypeTargetOf = (node: Node): Node => {
  if (isVariableDeclaration(node)) {
    return node.name;
  }
  if (isBinaryExpression(node)) {
    return node.left;
  }
  return node;
};

const isDefaultingOperator = (kind: SyntaxKind): boolean =>
  kind === SyntaxKind.BarBarToken || kind === SyntaxKind.QuestionQuestionToken;

const defaultedValue = (node: Node): Node => {
  if (isBinaryExpression(node) && isDefaultingOperator(node.operatorToken.kind)) {
    return node.right;
  }
  return node;
};

const declarationIsExpando = (node: Node): boolean => {
  if (isCallExpression(node)) {
    return Option.isSome(assignedExpandoInitializer(node));
  }
  const isPrototype = isPrototypeAccess(prototypeTargetOf(node));
  return initializerOf(node).pipe(
    Option.map((initializer) => defaultedValue(getRightMostAssignedExpression(initializer))),
    Option.flatMap((value) => expandoInitializer(value, isPrototype)),
    Option.isSome,
  );
};

const isExpandoSymbol = (symbol: BoundSymbol): boolean =>
  hasFlag(symbol.flags, EXPANDO_FLAGS) ||
  Option.exists(Option.fromNullishOr(symbol.valueDeclaration), declarationIsExpando);

const isFunctionSymbol = (symbol: Option.Option<BoundSymbol>): boolean =>
  symbol.pipe(
    Option.flatMap((found) => Option.fromNullishOr(found.valueDeclaration)),
    Option.exists(
      (declaration) =>
        isFunctionDeclaration(declaration) ||
        (isVariableDeclaration(declaration) && isFunctionLike(declaration.initializer)),
    ),
  );

const hasFunctionLikeExpandoInitializer = (declaration: Node): boolean =>
  Option.exists(assignedExpandoInitializer(declaration), isFunctionOrArrow);

export { hasFunctionLikeExpandoInitializer, isExpandoSymbol, isFunctionSymbol };
