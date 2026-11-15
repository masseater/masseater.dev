import { cn } from "@masseater.dev/ui/cn";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

export type Column = Readonly<{ label: string; className?: string }>;

const HEAD =
  "text-muted-foreground border-line-strong border-b-2 px-2 py-2 text-left text-xs font-bold";

export const TableHead = ({ columns }: Readonly<{ columns: readonly Column[] }>): ReactNode => (
  <thead>
    <tr>
      {pipe(
        columns,
        Arr.map((column) => (
          <th className={cn(HEAD, column.className)} key={column.label} scope="col">
            {column.label}
          </th>
        )),
      )}
    </tr>
  </thead>
);
