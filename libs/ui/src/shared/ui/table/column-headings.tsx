import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { TableHeadVariant } from "#/shared/lib/table-class.ts";

import { TableHead } from "./table-head.tsx";
import { TableHeader } from "./table-header.tsx";
import { TableRow } from "./table-row.tsx";

export type ColumnHeading = Readonly<{ key?: string; label: string; className?: string }>;

export const ColumnHeadings = ({
  columns,
  variant,
}: Readonly<{
  columns: readonly ColumnHeading[];
  variant?: TableHeadVariant;
}>): ReactNode => (
  <TableHeader>
    <TableRow>
      {pipe(
        columns,
        Arr.map(({ key, label, className }) => (
          <TableHead key={key ?? label} scope="col" variant={variant} className={className}>
            {label}
          </TableHead>
        )),
      )}
    </TableRow>
  </TableHeader>
);
