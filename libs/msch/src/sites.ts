import { Array as Arr, Option, pipe } from "effect";

import {
  isArrayLiteralExpression,
  isCallExpression,
  isEnumDeclaration,
  isTypeReferenceNode,
  isUnionTypeNode,
} from "./compiler.ts";
import type {
  ArrayLiteralExpression,
  CallExpression,
  Checker,
  Expression,
  Node,
  TypeSymbol,
  TypeNode,
  UnionTypeNode,
} from "./compiler.ts";
import {
  childrenOf,
  declarationsOf,
  isTypeDeclaration,
  propertyNamesOf,
  referencedSymbols,
} from "./syntax.ts";
import { finiteValuesOf, isSubsetOf, literalUnionOf, schemaTypeOf } from "./values.ts";
import type { Value } from "./values.ts";

interface ValueSite {
  readonly node: Node;
  readonly values: readonly Value[];
  readonly sources: readonly TypeSymbol[];
}

const namedValuesOf =
  (checker: Checker) =>
  (symbol: TypeSymbol): Option.Option<readonly Value[]> => {
    if (
      pipe(
        declarationsOf(symbol),
        Arr.some((declaration) => isTypeDeclaration(declaration)),
      )
    ) {
      return finiteValuesOf(checker)(checker.getDeclaredTypeOfSymbol(symbol));
    }
    return finiteValuesOf(checker)(checker.getTypeOfSymbol(symbol));
  };

const hasFiniteContext =
  (checker: Checker) =>
  (node: Expression): boolean =>
    Option.fromUndefinedOr(checker.getContextualType(node)).pipe(
      Option.flatMap(finiteValuesOf(checker)),
      Option.isSome,
    );

const expressionValuesOf =
  (checker: Checker) =>
  (node: Expression): Option.Option<readonly Value[]> => {
    if (hasFiniteContext(checker)(node)) {
      return Option.none();
    }
    const type = checker.getTypeAtLocation(node);
    if (isArrayLiteralExpression(node)) {
      return finiteValuesOf(checker)(type);
    }
    return schemaTypeOf(checker)(type).pipe(Option.flatMap(literalUnionOf));
  };

const selectsKeys =
  (checker: Checker) =>
  (node: UnionTypeNode, values: readonly Value[]): boolean => {
    const { parent } = node;
    if (!isTypeReferenceNode(parent)) {
      return false;
    }
    const typeArguments: readonly TypeNode[] = parent.typeArguments ?? [];
    return pipe(
      typeArguments,
      Arr.filter((argument) => argument !== node),
      Arr.some((argument) =>
        isSubsetOf(values, propertyNamesOf(checker)(checker.getTypeFromTypeNode(argument))),
      ),
    );
  };

const unionValuesOf =
  (checker: Checker) =>
  (node: UnionTypeNode): Option.Option<readonly Value[]> =>
    literalUnionOf(checker.getTypeFromTypeNode(node)).pipe(
      Option.filter((values) => !selectsKeys(checker)(node, values)),
    );

const isExpressionSite = (node: Node): node is ArrayLiteralExpression | CallExpression =>
  isArrayLiteralExpression(node) || isCallExpression(node);

const expressionSiteValuesOf =
  (checker: Checker) =>
  (node: Node): Option.Option<readonly Value[]> =>
    Option.liftPredicate(node, isExpressionSite).pipe(Option.flatMap(expressionValuesOf(checker)));

const siteValuesOf =
  (checker: Checker) =>
  (node: Node): Option.Option<readonly Value[]> => {
    if (isUnionTypeNode(node)) {
      return unionValuesOf(checker)(node);
    }
    if (isEnumDeclaration(node)) {
      return literalUnionOf(checker.getTypeAtLocation(node.name));
    }
    return expressionSiteValuesOf(checker)(node);
  };

const derivationScopeOf = (node: Node): Node => {
  if (isTypeReferenceNode(node.parent)) {
    return node.parent;
  }
  return node;
};

const sourcesOf =
  (checker: Checker) =>
  (node: Node): readonly TypeSymbol[] =>
    pipe(
      referencedSymbols(checker)(derivationScopeOf(node)),
      Arr.filter((symbol) => Option.isSome(namedValuesOf(checker)(symbol))),
    );

const sitesUnder =
  (checker: Checker) =>
  (node: Node): readonly ValueSite[] => {
    const nested = pipe(
      childrenOf(node),
      Arr.flatMap((child) => sitesUnder(checker)(child)),
    );
    if (Arr.isReadonlyArrayNonEmpty(nested)) {
      return nested;
    }
    return siteValuesOf(checker)(node).pipe(
      Option.map((values) => ({ node, values, sources: sourcesOf(checker)(node) })),
      Option.toArray,
    );
  };

export { sitesUnder };
export type { ValueSite };
