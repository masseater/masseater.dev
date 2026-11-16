import {
  Array as Arr,
  Function as Fn,
  Number as Num,
  Option,
  Order,
  Record as Rec,
  pipe,
} from "effect";

import type { ProfileLine } from "#/entities/owner-profile/index.ts";

import type { ItemValue, Rule } from "./profile-outline.ts";
import { ruleKey } from "./profile-rules.ts";

export type Placed = Readonly<{ line: ProfileLine; weight: number; ids: readonly number[] }>;

export type Lookup = Readonly<Record<string, Rule>>;

export const heaviestFirst =
  <Item>(weight: (item: Item) => number) =>
  (items: readonly Item[]): readonly Item[] =>
    pipe(items, Arr.sortWith(weight, Order.flip(Order.Number)));

export const sumOf =
  <Item>(weight: (item: Item) => number) =>
  (items: readonly Item[]): number =>
    pipe(items, Arr.map(weight), Num.sumAll);

export const lookupOf = (rules: readonly Rule[]): Lookup =>
  Rec.fromEntries(
    pipe(
      rules,
      Arr.map((rule) => [ruleKey(rule.id), rule] as const),
    ),
  );

const refsOfRules = (rules: readonly Rule[]): readonly number[] =>
  pipe(
    rules,
    Arr.flatMap((rule) => rule.refs),
    Arr.dedupe,
    Arr.sortWith(Fn.identity, Order.Number),
  );

const rulesFor =
  (lookup: Lookup) =>
  (ids: readonly string[]): readonly Rule[] =>
    pipe(
      ids,
      Arr.dedupe,
      Arr.map((id) => Rec.get(lookup, id)),
      Arr.getSomes,
    );

const placedFrom =
  (item: ItemValue) =>
  (rules: Arr.NonEmptyReadonlyArray<Rule>): Placed => ({
    line: { text: item.text, refs: refsOfRules(rules) },
    weight: sumOf((rule: Rule) => rule.weight)(rules),
    ids: pipe(
      rules,
      Arr.map((rule) => rule.id),
    ),
  });

export const placedOf =
  (lookup: Lookup) =>
  (item: ItemValue): Option.Option<Placed> =>
    pipe(
      Option.liftPredicate(rulesFor(lookup)(item.ids), Arr.isReadonlyArrayNonEmpty),
      Option.map(placedFrom(item)),
    );

export const bareOf = (item: ItemValue): Placed => ({
  line: { text: item.text, refs: [] },
  weight: 0,
  ids: [],
});

export const linesOfPlaced = (placed: readonly Placed[]): readonly ProfileLine[] =>
  pipe(
    placed,
    Arr.map((one) => one.line),
  );

export const idsOf = (placed: readonly Placed[]): readonly number[] =>
  pipe(
    placed,
    Arr.flatMap((one) => one.ids),
  );
