import { Array as Arr, Option, pipe } from "effect";

import { isSatisfiesExpression, isVariableDeclaration } from "./compiler.ts";
import type { Checker, Node } from "./compiler.ts";
import { declarationKey, locationOf } from "./library.ts";
import { declarationsOf, referencedSymbols } from "./syntax.ts";

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

const derivedDeclarationsOf =
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

export { derivedDeclarationsOf };
