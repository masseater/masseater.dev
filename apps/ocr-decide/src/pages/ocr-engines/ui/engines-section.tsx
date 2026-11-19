import { useId } from "react";
import type { ReactNode } from "react";

import type { Table } from "#/pages/ocr-engines/model/tables.ts";

import { EnginesTable } from "./engines-table.tsx";

export const EnginesSection = ({ table }: Readonly<{ table: Table }>): ReactNode => {
  const titleId = useId();
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold" id={titleId}>
        {table.title}
      </h2>
      <EnginesTable columns={table.columns} labelledBy={titleId} />
    </section>
  );
};
