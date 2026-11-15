import { Array as Arr, Option, pipe } from "effect";

import { declarationKey, locationOf } from "#/entities/project/index.ts";
import { isSatisfiesExpression, isVariableDeclaration } from "#/shared/lib/compiler.ts";
import type { Checker, Node } from "#/shared/lib/compiler.ts";
import { declarationsOf, referencedSymbols } from "#/shared/lib/syntax.ts";

const contractOf = (node: Node): readonly Node[] => {
  const { parent } = node;
  if (isSatisfiesExpression(parent) && parent.expression === node) {
    return [parent.type];
  }
  if (isVariableDeclaration(parent) && parent.initializer === node) {
    return Option.toArray(Option.fromUndefinedOr(parent.type));
  }
  return [];
};

export const derivedDeclarationsOf =
  (checker: Checker) =>
  (node: Node): ReadonlySet<string> => {
    const scopes = Arr.prepend(contractOf(node), node);
    return new Set(
      pipe(
        scopes,
        Arr.flatMap((scope) => referencedSymbols(checker)(scope)),
        Arr.flatMap((symbol) => declarationsOf(symbol)),
        Arr.map((declaration) => declarationKey(locationOf(declaration))),
      ),
    );
  };
