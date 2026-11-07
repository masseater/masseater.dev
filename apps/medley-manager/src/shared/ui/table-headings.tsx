import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { TableHead } from "./table-head";
import { TableHeader } from "./table-header";
import { TableRow } from "./table-row";

const TableHeadings = ({ labels }: Readonly<{ labels: readonly string[] }>): ReactNode => (
  <TableHeader>
    <TableRow>
      {pipe(
        labels,
        Array.map((label) => <TableHead key={label}>{label}</TableHead>),
      )}
    </TableRow>
  </TableHeader>
);

export { TableHeadings };
