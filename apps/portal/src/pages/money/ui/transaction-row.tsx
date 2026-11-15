import { Array as Arr, Option } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { TransactionValue } from "#/entities/money";
import { Row, TagList } from "#/shared/ui";

import { TransactionLine } from "./transaction-line";
import { TransactionMemo } from "./transaction-memo";

export type Labels = Readonly<{
  category: (id: string) => string;
  account: (id: string) => string;
}>;

const tagsOf = (transaction: TransactionValue, labels: Labels): readonly string[] =>
  Arr.getSomes([
    Option.some(labels.category(transaction.category)),
    Option.fromNullOr(transaction.label),
    Option.some(labels.account(transaction.accountId)),
  ]);

export const TransactionRow = ({
  labels,
  transaction,
}: Readonly<{ labels: Labels; transaction: TransactionValue }>): ReactNode => {
  const tags = useMemo(() => tagsOf(transaction, labels), [transaction, labels]);
  return (
    <Row lead={transaction.date}>
      <TransactionLine amount={transaction.amount} description={transaction.description} />
      <TransactionMemo memo={transaction.memo} />
      <TagList tags={tags} />
    </Row>
  );
};
