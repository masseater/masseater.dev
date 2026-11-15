import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { SIGNED_YEN } from "#/entities/money";
import type { TransactionValue } from "#/entities/money";

export type Labels = Readonly<{
  category: (id: string) => string;
  account: (id: string) => string;
}>;

const CELL = "border-b px-2 py-2.5 align-top";

const INCOME = 0;

const subline = (text: string): ReactNode => (
  <p className="text-muted-foreground text-xs">{text}</p>
);

const sublineOf = (text: string | null): ReactNode =>
  pipe(Option.fromNullOr(text), Option.map(subline), Option.getOrNull);

export const TransactionRow = ({
  labels,
  transaction,
}: Readonly<{ labels: Labels; transaction: TransactionValue }>): ReactNode => (
  <tr className="hover:bg-muted">
    <td className={`${CELL} tabular-nums`}>{transaction.date}</td>
    <td className={CELL}>
      <p className="break-words">{transaction.description}</p>
      {sublineOf(transaction.memo)}
    </td>
    <td className={CELL}>
      <p>{labels.category(transaction.category)}</p>
      {sublineOf(transaction.label)}
    </td>
    <td className={CELL}>{labels.account(transaction.accountId)}</td>
    <td
      className={`${CELL} data-[in=true]:text-income-strong text-right font-bold tabular-nums`}
      data-in={transaction.amount > INCOME}
    >
      {SIGNED_YEN.format(transaction.amount)}
    </td>
  </tr>
);
