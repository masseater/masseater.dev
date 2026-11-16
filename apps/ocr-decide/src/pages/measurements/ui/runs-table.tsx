import type { ReactNode } from "react";

import type { Column } from "#/pages/measurements/model/tables.ts";

import { RunRows } from "./run-rows.tsx";
import { TableHead } from "./table-head.tsx";

export const RunsTable = ({ columns }: Readonly<{ columns: readonly Column[] }>): ReactNode => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-sm">
      <TableHead columns={columns} />
      <RunRows columns={columns} />
    </table>
  </div>
);
