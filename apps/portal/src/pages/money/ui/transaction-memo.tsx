import { Option } from "effect";
import type { ReactNode } from "react";

const TransactionMemo = ({ memo }: Readonly<{ memo: string | null }>): ReactNode =>
  Option.match(Option.fromNullOr(memo), {
    onNone: () => false,
    onSome: (text) => <p className="text-foreground/60 text-xs">{text}</p>,
  });

export { TransactionMemo };
