import type { ReactNode } from "react";

import { yen } from "#/entities/money";
import type { AccountBalanceValue } from "#/entities/money";

const AccountLine = ({ account }: Readonly<{ account: AccountBalanceValue }>): ReactNode => (
  <div className="text-foreground/60 flex items-baseline justify-between gap-4 pt-1 pl-4 text-xs">
    <dt>{account.name}</dt>
    <dd className="tabular-nums">{yen(account.amount)}</dd>
  </div>
);

export { AccountLine };
