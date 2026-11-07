import type { ReactNode } from "react";

import type { Table } from "#/pages/ocr-engines/model/tables";

import { EnginesTable } from "./engines-table";

const EnginesSection = ({ table }: Readonly<{ table: Table }>): ReactNode => (
  <section className="flex flex-col gap-3">
    <h2 className="text-lg font-bold">{table.title}</h2>
    <EnginesTable columns={table.columns} />
  </section>
);

export { EnginesSection };
