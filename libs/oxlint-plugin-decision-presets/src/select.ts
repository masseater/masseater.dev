import type { DecisionRule, SelectMatch, SelectedNode } from "@r_masseater/oxlint-plugin-decision";
import {
  Match,
  Option,
  Predicate,
  Array as Arr,
  Record as Rec,
  pipe,
  Function as Fn,
} from "effect";

const DATA_FIRST_ARITY = 2;

type Select = NonNullable<DecisionRule["select"]>;

interface DualSelect {
  (match: SelectMatch): (node: SelectedNode) => boolean;
  (node: SelectedNode, match: SelectMatch): boolean;
}

const dualSelect = (select: Select): DualSelect => Fn.dual(DATA_FIRST_ARITY, select);

type NodeTest = Predicate.Predicate<SelectedNode>;

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

const containing =
  (test: NodeTest): NodeTest =>
  (node) =>
    pipe(
      descendantsOf(node),
      Arr.some((found) => test(found)),
    );

const ofType =
  (...types: readonly string[]): NodeTest =>
  (node) =>
    types.includes(node.type);

const identifierOf = (node: SelectedNode): Option.Option<string> =>
  Match.value(node).pipe(
    Match.when({ type: "Identifier" }, (identifier) => Option.some(identifier.name)),
    Match.orElse(() => Option.none()),
  );

export { containing, dualSelect, identifierOf, ofType };
export type { DualSelect, NodeTest, Select };
