import {
  Match,
  Option,
  Predicate,
  Array as Arr,
  Record as Rec,
  pipe,
  Function as Fn,
} from "effect";

import type { DecisionRule, SelectMatch, SelectedNode } from "#/entities/decision/index.ts";

const DATA_FIRST_ARITY = 2;

export type Select = NonNullable<DecisionRule["select"]>;

export interface DualSelect {
  (match: SelectMatch): (node: SelectedNode) => boolean;
  (node: SelectedNode, match: SelectMatch): boolean;
}

export const dualSelect = (select: Select): DualSelect => Fn.dual(DATA_FIRST_ARITY, select);

export type NodeTest = Predicate.Predicate<SelectedNode>;

const childrenOf = (node: SelectedNode): readonly SelectedNode[] =>
  pipe(
    Rec.toEntries<string, unknown>(node),
    Arr.filter(([key]) => key !== "parent"),
    Arr.flatMap(([, value]) => Arr.ensure(value)),
    Arr.filter((value): value is SelectedNode => Predicate.hasProperty(value, "type")),
  );

const descendantsOf = (node: SelectedNode): readonly SelectedNode[] => [
  node,
  ...pipe(
    childrenOf(node),
    Arr.flatMap((child) => descendantsOf(child)),
  ),
];

export const containing =
  (test: NodeTest): NodeTest =>
  (node) =>
    pipe(
      descendantsOf(node),
      Arr.some((found) => test(found)),
    );

export const ofType =
  (...types: readonly string[]): NodeTest =>
  (node) =>
    types.includes(node.type);

export const identifierOf = (node: SelectedNode): Option.Option<string> =>
  Match.value(node).pipe(
    Match.when({ type: "Identifier" }, (identifier) => Option.some(identifier.name)),
    Match.orElse(() => Option.none()),
  );
