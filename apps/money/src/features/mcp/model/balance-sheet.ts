import { Array as Arr, Number as Num, Option, pipe } from "effect";

import { directionOf } from "#/features/mcp/model/accounts";
import type { AccountClass } from "#/features/mcp/model/accounts";

type Snapshot = Readonly<{ date: string; balance: number }>;

type AccountPosition = Readonly<{
  id: string;
  name: string;
  class: AccountClass;
  snapshot: Option.Option<Snapshot>;
  movement: number;
}>;

type Basis = "snapshot" | "transactions";

type AccountBalance = Readonly<{
  id: string;
  name: string;
  class: AccountClass;
  amount: number;
  basis: Basis;
}>;

type BalanceSheet = Readonly<{
  left: Readonly<{ currentAssets: number; fixedAssets: number; debtExcess: number }>;
  right: Readonly<{ currentLiabilities: number; fixedLiabilities: number; netAssets: number }>;
  accounts: readonly AccountBalance[];
}>;

const NOTHING = 0;

const balanceOf = (position: AccountPosition): AccountBalance => {
  const moved = position.movement * directionOf(position.class);
  return {
    id: position.id,
    name: position.name,
    class: position.class,
    amount: Option.match(position.snapshot, {
      onNone: () => moved,
      onSome: ({ balance }) => balance + moved,
    }),
    basis: Option.match(position.snapshot, {
      onNone: (): Basis => "transactions",
      onSome: (): Basis => "snapshot",
    }),
  };
};

const sumOf =
  (accounts: readonly AccountBalance[]) =>
  (accountClass: AccountClass): number =>
    pipe(
      accounts,
      Arr.filter((account) => account.class === accountClass),
      Arr.map(({ amount }) => amount),
      Num.sumAll,
    );

const balanceSheet = (positions: readonly AccountPosition[]): BalanceSheet => {
  const accounts = pipe(positions, Arr.map(balanceOf));
  const sum = sumOf(accounts);
  const assets = sum("current-asset") + sum("fixed-asset");
  const liabilities = sum("current-liability") + sum("fixed-liability");
  const net = assets - liabilities;
  return {
    left: {
      currentAssets: sum("current-asset"),
      fixedAssets: sum("fixed-asset"),
      debtExcess: Math.max(-net, NOTHING),
    },
    right: {
      currentLiabilities: sum("current-liability"),
      fixedLiabilities: sum("fixed-liability"),
      netAssets: Math.max(net, NOTHING),
    },
    accounts,
  };
};

export { balanceSheet };
export type { AccountBalance, AccountPosition, BalanceSheet, Basis, Snapshot };
