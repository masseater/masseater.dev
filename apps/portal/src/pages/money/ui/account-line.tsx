import type { ReactNode } from "react";

import { YEN } from "#/entities/money";
import type { AccountBalanceValue } from "#/entities/money";

export const AccountLine = ({ account }: Readonly<{ account: AccountBalanceValue }>): ReactNode => (
  <div className="text-foreground/60 flex items-baseline justify-between gap-4 pt-1 pl-4 text-xs">
    <dt>{account.name}</dt>
    <dd className="tabular-nums">{YEN.format(account.amount)}</dd>
  </div>
);
