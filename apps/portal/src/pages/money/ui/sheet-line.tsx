import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { yen } from "#/entities/money";
import type { AccountBalanceValue } from "#/entities/money";
import { accountsIn } from "#/pages/money/model/sheet";
import type { SheetLine as Line } from "#/pages/money/model/sheet";

import { AccountLine } from "./account-line";

const SheetLine = ({
  accounts,
  line,
}: Readonly<{ accounts: readonly AccountBalanceValue[]; line: Line }>): ReactNode => (
  <div className="border-foreground/10 border-t py-3">
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm">{line.label}</dt>
      <dd className="font-display text-lg font-light tabular-nums">{yen(line.amount)}</dd>
    </div>
    {pipe(
      accountsIn(line)(accounts),
      Arr.map((account) => <AccountLine account={account} key={account.id} />),
    )}
  </div>
);

export { SheetLine };
