import { TableCell, TableHead, TableRow } from "@masseater.dev/ui/table";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { ModelName } from "#/entities/benchmark/index.ts";
import type { TableColumn } from "#/features/sort-table/model/sorting.ts";

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
