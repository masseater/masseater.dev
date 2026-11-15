import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { AccountBalanceValue } from "#/entities/money";
import type { SheetLine as Line } from "#/pages/money/model/sheet";

import { SheetLine } from "./sheet-line";

const SheetSide = ({
  accounts,
  lines,
  title,
}: Readonly<{
  accounts: readonly AccountBalanceValue[];
  lines: readonly Line[];
  title: string;
}>): ReactNode => (
  <div className="flex min-w-0 flex-col gap-2">
    <h3 className="font-display text-foreground/50 text-xs tracking-widest">{title}</h3>
    <dl className="border-foreground/10 border-b">
      {pipe(
        lines,
        Arr.map((line) => <SheetLine accounts={accounts} key={line.label} line={line} />),
      )}
    </dl>
  </div>
);

export { SheetSide };
