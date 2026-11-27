import { ColumnHeadings, Table } from "@masseater.dev/ui/table";
import type { ReactNode } from "react";

import { headingsOf } from "#/pages/measurements/model/tables.ts";
import type { Column } from "#/pages/measurements/model/tables.ts";

import { RunRows } from "./run-rows.tsx";

export const RunsTable = ({
  columns,
  labelledBy,
}: Readonly<{ columns: readonly Column[]; labelledBy: string }>): ReactNode => (
  <Table labelledBy={labelledBy} containerClassName="rounded-lg border">
    <ColumnHeadings variant="compact" columns={headingsOf(columns)} />
    <RunRows columns={columns} />
  </Table>
);
