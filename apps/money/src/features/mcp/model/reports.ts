import { Array as Arr, Match, Number as Num, Option, Order, Record as Rec, pipe } from "effect";

import type { AccountClass } from "./accounts";
import { CATEGORY_LABELS, flowOf } from "./categories";
import type { Category } from "./categories";

type CategoryTotal = Readonly<{ category: Category; label: string | null; amount: number }>;

type MonthTotal = Readonly<{ month: string; category: Category; amount: number }>;

type NodeType = "income" | "income-sub" | "total" | "expense" | "expense-sub";

type FlowNode = Readonly<{ id: string; label: string; nodeType: NodeType }>;

type FlowLink = Readonly<{ source: string; target: string; value: number }>;

type MoneyFlow = Readonly<{
  nodes: readonly FlowNode[];
  links: readonly FlowLink[];
  income: number;
  expense: number;
}>;

type Month = Readonly<{ month: string; income: number; expense: number; balance: number }>;

type AccountPosition = Readonly<{
  id: string;
  name: string;
  class: AccountClass;
  snapshot: Readonly<{ date: string; balance: number }> | null;
  movement: number;
}>;

type AccountBalance = Readonly<{
  id: string;
  name: string;
  class: AccountClass;
  amount: number;
  basis: "snapshot" | "transactions";
}>;

type BalanceSheet = Readonly<{
  left: Readonly<{ currentAssets: number; fixedAssets: number; debtExcess: number }>;
  right: Readonly<{ currentLiabilities: number; fixedLiabilities: number; netAssets: number }>;
  accounts: readonly AccountBalance[];
}>;

type Side = "income" | "expense";

type Bucket = Readonly<{
  category: Category;
  total: number;
  labels: Readonly<Record<string, number>>;
}>;

const TOTAL_ID = "total";

const SAVINGS = "savings";

const SAVINGS_LABELS: Readonly<Record<Side, string>> = {
  income: "貯金から",
  expense: "貯金へ",
};

const SIGN: Readonly<Record<Side, number>> = { income: 1, expense: -1 };

const FIRST_MONTH = 1;

const LAST_MONTH = 12;

const MONTH_WIDTH = 2;

const DECIMAL = 10;

const sideOf = (category: Category): Option.Option<Side> =>
  Match.value(flowOf(category)).pipe(
    Match.when("income", () => Option.some<Side>("income")),
    Match.when("expense", () => Option.some<Side>("expense")),
    Match.orElse(() => Option.none()),
  );

const bucketsOf = (totals: readonly CategoryTotal[], side: Side): readonly Bucket[] =>
  pipe(
    totals,
    Arr.filter(({ category }) => Option.contains(sideOf(category), side)),
    Arr.groupBy(({ category }): string => category),
    Rec.values,
    Arr.map((rows): Bucket => {
      const value = (amount: number): number => amount * SIGN[side];
      return {
        category: Arr.headNonEmpty(rows).category,
        total: Num.sumAll(Arr.map(rows, ({ amount }) => value(amount))),
        labels: pipe(
          rows,
          Arr.map(({ label, amount }) =>
            Option.map(Option.fromNullishOr(label), (name) => [name, value(amount)] as const),
          ),
          Arr.getSomes,
          Arr.groupBy(([name]) => name),
          Rec.map((pairs) => Num.sumAll(Arr.map(pairs, ([, amount]) => amount))),
          Rec.filter((amount) => amount > 0),
        ),
      };
    }),
    Arr.filter(({ total }) => total > 0),
    Arr.sort(Order.mapInput(Order.Number, ({ total }: Bucket) => -total)),
  );

const categoryId = (side: Side, category: string): string => `${side}:${category}`;

const subId = (side: Side, category: string, label: string): string =>
  `${side}:${category}:${label}`;

const sideNodes = (side: Side, buckets: readonly Bucket[]): readonly FlowNode[] =>
  Arr.flatMap(buckets, ({ category, labels }) => [
    { id: categoryId(side, category), label: CATEGORY_LABELS[category], nodeType: side },
    ...Arr.map(Rec.keys(labels), (label) => ({
      id: subId(side, category, label),
      label,
      nodeType: side === "income" ? ("income-sub" as const) : ("expense-sub" as const),
    })),
  ]);

const sideLinks = (side: Side, buckets: readonly Bucket[]): readonly FlowLink[] =>
  Arr.flatMap(buckets, ({ category, total, labels }) => {
    const node = categoryId(side, category);
    const main =
      side === "income"
        ? { source: node, target: TOTAL_ID, value: total }
        : { source: TOTAL_ID, target: node, value: total };
    const subs = Arr.map(Rec.toEntries(labels), ([label, value]) => {
      const sub = subId(side, category, label);
      return side === "income"
        ? { source: sub, target: node, value }
        : { source: node, target: sub, value };
    });
    return [main, ...subs];
  });

const savings = (side: Side, value: number): Readonly<{ node: FlowNode; link: FlowLink }> => {
  const id = categoryId(side, SAVINGS);
  return {
    node: { id, label: SAVINGS_LABELS[side], nodeType: side },
    link:
      side === "income"
        ? { source: id, target: TOTAL_ID, value }
        : { source: TOTAL_ID, target: id, value },
  };
};

const moneyFlow = (totals: readonly CategoryTotal[]): MoneyFlow => {
  const income = bucketsOf(totals, "income");
  const expense = bucketsOf(totals, "expense");
  const incomeTotal = Num.sumAll(Arr.map(income, ({ total }) => total));
  const expenseTotal = Num.sumAll(Arr.map(expense, ({ total }) => total));
  const gap = incomeTotal - expenseTotal;
  const balancing = Match.value(Num.sign(gap)).pipe(
    Match.when(1, () => [savings("expense", gap)]),
    Match.when(-1, () => [savings("income", -gap)]),
    Match.orElse(() => []),
  );
  return {
    nodes: [
      ...sideNodes("income", income),
      { id: TOTAL_ID, label: "合計", nodeType: "total" },
      ...sideNodes("expense", expense),
      ...Arr.map(balancing, ({ node }) => node),
    ],
    links: [
      ...sideLinks("income", income),
      ...sideLinks("expense", expense),
      ...Arr.map(balancing, ({ link }) => link),
    ],
    income: incomeTotal,
    expense: expenseTotal,
  };
};

const monthIndex = (month: string): number => {
  const [year = "0", part = "0"] = month.split("-");
  return Number.parseInt(year, DECIMAL) * LAST_MONTH + Number.parseInt(part, DECIMAL) - FIRST_MONTH;
};

const monthOf = (index: number): string => {
  const year = Math.floor(index / LAST_MONTH);
  const month = (index % LAST_MONTH) + FIRST_MONTH;
  return `${year}-${String(month).padStart(MONTH_WIDTH, "0")}`;
};

const monthsBetween = (from: string, to: string): readonly string[] =>
  Arr.map(Arr.range(monthIndex(from), monthIndex(to)), monthOf);

const monthlyTotals = (from: string, to: string, totals: readonly MonthTotal[]): readonly Month[] =>
  Arr.map(monthsBetween(from, to), (month) => {
    const rows = Arr.filter(totals, (row) => row.month === month);
    const sum = (side: Side): number =>
      Num.sumAll(
        pipe(
          rows,
          Arr.filter(({ category }) => Option.contains(sideOf(category), side)),
          Arr.map(({ amount }) => amount * SIGN[side]),
        ),
      );
    const income = sum("income");
    const expense = sum("expense");
    return { month, income, expense, balance: income - expense };
  });

const isLiability = (accountClass: AccountClass): boolean =>
  accountClass === "current-liability" || accountClass === "fixed-liability";

const balanceOf = (position: AccountPosition): AccountBalance => {
  const direction = isLiability(position.class) ? -1 : 1;
  return {
    id: position.id,
    name: position.name,
    class: position.class,
    amount: Option.match(Option.fromNullishOr(position.snapshot), {
      onNone: () => position.movement * direction,
      onSome: ({ balance }) => balance + position.movement * direction,
    }),
    basis: position.snapshot === null ? "transactions" : "snapshot",
  };
};

const balanceSheet = (positions: readonly AccountPosition[]): BalanceSheet => {
  const accounts = Arr.map(positions, balanceOf);
  const sumOf = (accountClass: AccountClass): number =>
    Num.sumAll(
      pipe(
        accounts,
        Arr.filter((account) => account.class === accountClass),
        Arr.map(({ amount }) => amount),
      ),
    );
  const currentAssets = sumOf("current-asset");
  const fixedAssets = sumOf("fixed-asset");
  const currentLiabilities = sumOf("current-liability");
  const fixedLiabilities = sumOf("fixed-liability");
  const net = currentAssets + fixedAssets - currentLiabilities - fixedLiabilities;
  return {
    left: { currentAssets, fixedAssets, debtExcess: Math.max(-net, 0) },
    right: { currentLiabilities, fixedLiabilities, netAssets: Math.max(net, 0) },
    accounts,
  };
};

export { balanceSheet, monthlyTotals, moneyFlow };
export type {
  AccountBalance,
  AccountPosition,
  BalanceSheet,
  CategoryTotal,
  FlowLink,
  FlowNode,
  Month,
  MoneyFlow,
  MonthTotal,
  NodeType,
};
