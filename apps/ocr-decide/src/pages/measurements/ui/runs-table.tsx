import type { ReactNode } from "react";

import type { Column } from "#/pages/measurements/model/tables.ts";

import { RunRows } from "./run-rows.tsx";
import { TableHead } from "./table-head.tsx";

const FOCUSABLE = 0;

export const RunsTable = ({
  columns,
  labelledBy,
}: Readonly<{ columns: readonly Column[]; labelledBy: string }>): ReactNode => (
  <section
    aria-labelledby={labelledBy}
    className="overflow-x-auto rounded-lg border"
    tabIndex={FOCUSABLE}
  >
    <table className="w-full text-sm">
      <TableHead columns={columns} />
      <RunRows columns={columns} />
    </table>
  </section>
);
