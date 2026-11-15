import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { ModelName } from "#/entities/benchmark";
import type { TableColumn } from "#/features/sort-table/model/sorting";
import { TableCell } from "#/shared/ui/table-cell";
import { TableHead } from "#/shared/ui/table-head";
import { TableRow } from "#/shared/ui/table-row";

export const SortBodyRow = <Row,>({
  row,
  label,
  color,
  columns,
}: Readonly<{
  row: Row;
  label: string;
  color: string;
  columns: readonly TableColumn<Row>[];
}>): ReactNode => (
  <TableRow>
    <TableHead scope="row">
      <ModelName color={color} label={label} />
    </TableHead>
    {pipe(
      columns,
      Arr.map((column) => (
        <TableCell key={column.id} className="text-right tabular-nums">
          {column.display(row)}
        </TableCell>
      )),
    )}
  </TableRow>
);
