import type { ReactNode } from "react";

import type { Column } from "#/pages/measurements/model/tables";

import { RunRows } from "./run-rows";
import { TableHead } from "./table-head";

const RunsTable = ({ columns }: Readonly<{ columns: readonly Column[] }>): ReactNode => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-sm">
      <TableHead columns={columns} />
      <RunRows columns={columns} />
    </table>
  </div>
);

export { RunsTable };
