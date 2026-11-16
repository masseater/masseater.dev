import type { ReactNode } from "react";

import type { Table } from "#/pages/measurements/model/tables.ts";

import { RunsTable } from "./runs-table.tsx";

export const RunsSection = ({ table }: Readonly<{ table: Table }>): ReactNode => (
  <section className="flex flex-col gap-3">
    <h2 className="text-lg font-bold">{table.title}</h2>
    <RunsTable columns={table.columns} />
  </section>
);
