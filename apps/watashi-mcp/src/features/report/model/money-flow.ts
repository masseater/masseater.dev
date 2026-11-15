import { Array as Arr, Match, Number as Num, Option, Order, Record as Rec, pipe } from "effect";

import { CATEGORY_LABELS, isOn, valueOn } from "#/entities/ledger";
import type { Category, Side } from "#/entities/ledger";

export type CategoryTotal = Readonly<{
  category: Category;
  label: Option.Option<string>;
  amount: number;
}>;

export type NodeType = "income" | "income-sub" | "total" | "expense" | "expense-sub";

export type FlowNode = Readonly<{ id: string; label: string; nodeType: NodeType }>;

export type FlowLink = Readonly<{ source: string; target: string; value: number }>;

export type MoneyFlow = Readonly<{
  nodes: readonly FlowNode[];
  links: readonly FlowLink[];
  income: number;
  expense: number;
}>;

type Bucket = Readonly<{
  category: Category;
  total: number;
  labels: Readonly<Record<string, number>>;
}>;

type Edge = Readonly<{ side: Side; outer: string; inner: string; value: number }>;

const TOTAL_ID = "total";

const SAVINGS = "savings";

const SAVINGS_LABELS: Readonly<Record<Side, string>> = { income: "貯金から", expense: "貯金へ" };

const SUB_TYPES: Readonly<Record<Side, NodeType>> = {
  income: "income-sub",
  expense: "expense-sub",
};

const NOTHING = 0;

const MORE = 1;

const LESS = -1;

const DESCENDING = Order.flip(Order.Number);

const isPositive = (amount: number): boolean => amount > NOTHING;

const labelTotals = (
  side: Side,
  rows: readonly CategoryTotal[],
): Readonly<Record<string, number>> =>
  pipe(
    rows,
    Arr.map(({ label, amount }) =>
      pipe(
        label,
        Option.map((name) => [name, valueOn(side)(amount)] as const),
      ),
    ),
    Arr.getSomes,
    Arr.groupBy(([name]) => name),
    Rec.map((pairs) =>
      pipe(
        pairs,
        Arr.map(([, amount]) => amount),
        Num.sumAll,
      ),
    ),
    Rec.filter(isPositive),
  );

const bucketOf =
  (side: Side) =>
  (rows: Arr.NonEmptyReadonlyArray<CategoryTotal>): Bucket => ({
    category: Arr.headNonEmpty(rows).category,
    total: pipe(
      rows,
      Arr.map(({ amount }) => valueOn(side)(amount)),
      Num.sumAll,
    ),
    labels: labelTotals(side, rows),
  });

const bucketsOf = (totals: readonly CategoryTotal[], side: Side): readonly Bucket[] =>
  pipe(
    totals,
    Arr.filter(isOn(side)),
    Arr.groupBy(({ category }): string => category),
    Rec.values,
    Arr.map(bucketOf(side)),
    Arr.filter(({ total }) => isPositive(total)),
    Arr.sortWith(({ total }: Bucket) => total, DESCENDING),
  );

const categoryId = (side: Side, category: string): string => `${side}:${category}`;

const linkOf = ({ side, outer, inner, value }: Edge): FlowLink =>
  Match.value(side).pipe(
    Match.when("income", () => ({ source: outer, target: inner, value })),
    Match.orElse(() => ({ source: inner, target: outer, value })),
  );

const sideNodes = (side: Side, buckets: readonly Bucket[]): readonly FlowNode[] =>
  pipe(
    buckets,
    Arr.flatMap(({ category, labels }) => [
      { id: categoryId(side, category), label: CATEGORY_LABELS[category], nodeType: side },
      ...pipe(
        Rec.keys(labels),
        Arr.map((label) => ({
          id: `${categoryId(side, category)}:${label}`,
          label,
          nodeType: SUB_TYPES[side],
        })),
      ),
    ]),
  );

const sideLinks = (side: Side, buckets: readonly Bucket[]): readonly FlowLink[] =>
  pipe(
    buckets,
    Arr.flatMap(({ category, total, labels }) => {
      const node = categoryId(side, category);
      const subs = pipe(
        Rec.toEntries(labels),
        Arr.map(([label, value]) =>
          linkOf({ side, outer: `${node}:${label}`, inner: node, value }),
        ),
      );
      return [linkOf({ side, outer: node, inner: TOTAL_ID, value: total }), ...subs];
    }),
  );

const savingsOf = (side: Side, value: number): readonly [FlowNode, FlowLink] => {
  const id = categoryId(side, SAVINGS);
  return [
    { id, label: SAVINGS_LABELS[side], nodeType: side },
    linkOf({ side, outer: id, inner: TOTAL_ID, value }),
  ];
};

const balancing = (gap: number): readonly (readonly [FlowNode, FlowLink])[] =>
  Match.value(Num.sign(gap)).pipe(
    Match.when(MORE, () => [savingsOf("expense", gap)]),
    Match.when(LESS, () => [savingsOf("income", -gap)]),
    Match.orElse(() => []),
  );

const sumOf = (buckets: readonly Bucket[]): number =>
  pipe(
    buckets,
    Arr.map(({ total }) => total),
    Num.sumAll,
  );

export const moneyFlow = (totals: readonly CategoryTotal[]): MoneyFlow => {
  const income = bucketsOf(totals, "income");
  const expense = bucketsOf(totals, "expense");
  const savings = balancing(sumOf(income) - sumOf(expense));
  return {
    nodes: [
      ...sideNodes("income", income),
      { id: TOTAL_ID, label: "合計", nodeType: "total" },
      ...sideNodes("expense", expense),
      ...pipe(
        savings,
        Arr.map(([node]) => node),
      ),
    ],
    links: [
      ...sideLinks("income", income),
      ...sideLinks("expense", expense),
      ...pipe(
        savings,
        Arr.map(([, link]) => link),
      ),
    ],
    income: sumOf(income),
    expense: sumOf(expense),
  };
};
