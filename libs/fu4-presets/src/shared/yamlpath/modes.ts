import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Predicate, Result, pipe } from "effect";

import type { Document } from "./document.ts";
import { fieldOf, isPair, namedWhere, parentOf } from "./nodes.ts";
import { resolveTarget, walk } from "./query.ts";
import type { Route } from "./query.ts";

interface Resolved {
  readonly target: SyntaxNode;
  readonly structural: SyntaxNode;
}

const resolveRoute =
  (document: Document) =>
  (route: Route): Result.Result<Resolved, string> =>
    Result.flatMap(walk(document)(route), (found) =>
      Result.map(resolveTarget(document)(found), (target) => {
        if (target.id === found.id) {
          return { target, structural: target };
        }
        return { target, structural: found };
      }),
    );

const endsWithKey = (route: Route): boolean => Option.exists(Arr.last(route), Predicate.isString);

const parentOrSelf = (node: SyntaxNode): SyntaxNode => Option.getOrElse(parentOf(node), () => node);

export const queryExact =
  (document: Document) =>
  (route: Route): Result.Result<Option.Option<SyntaxNode>, string> =>
    Result.map(resolveRoute(document)(route), ({ target }) =>
      pipe(
        Option.some(target),
        Option.filter((node) => !isPair(node)),
      ),
    );

const pairOrParent = (structural: SyntaxNode): SyntaxNode => {
  if (isPair(structural)) {
    return structural;
  }
  return parentOrSelf(structural);
};

const prettyNode = (route: Route, structural: SyntaxNode): SyntaxNode => {
  if (!endsWithKey(route)) {
    return structural;
  }
  const node = pairOrParent(structural);
  if (node.type === "block_mapping_pair") {
    return node;
  }
  return parentOrSelf(node);
};

export const queryPretty =
  (document: Document) =>
  (route: Route): Result.Result<SyntaxNode, string> =>
    Result.map(resolveRoute(document)(route), ({ structural }) => prettyNode(route, structural));

const keyParent = (structural: SyntaxNode): SyntaxNode => {
  if (isPair(structural)) {
    return structural;
  }
  if (structural.type === "block_scalar") {
    return parentOrSelf(parentOrSelf(structural));
  }
  return parentOrSelf(structural);
};

const keyNode = (parent: SyntaxNode): Result.Result<SyntaxNode, string> => {
  if (parent.type === "flow_mapping") {
    return Result.fromOption(
      namedWhere((node) => node.type === "flow_node")(parent),
      () => `${parent.type} has no flow_node`,
    );
  }
  return Result.fromOption(fieldOf("key")(parent), () => `${parent.type} has no key`);
};

export const queryKeyOnly =
  (document: Document) =>
  (route: Route): Result.Result<SyntaxNode, string> => {
    if (!endsWithKey(route)) {
      return Result.fail("route must end with a key component for key-only routes");
    }
    return Result.flatMap(resolveRoute(document)(route), ({ structural }) =>
      keyNode(keyParent(structural)),
    );
  };
