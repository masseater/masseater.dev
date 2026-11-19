import type { ReactNode } from "react";

import type { Column } from "#/pages/ocr-engines/model/tables.ts";

import { EngineRows } from "./engine-rows.tsx";
import { EnginesHead } from "./engines-head.tsx";

const FOCUSABLE = 0;

export const EnginesTable = ({
  columns,
  labelledBy,
}: Readonly<{ columns: readonly Column[]; labelledBy: string }>): ReactNode => (
  <section
    aria-labelledby={labelledBy}
    className="overflow-x-auto rounded-lg border"
    tabIndex={FOCUSABLE}
  >
    <table className="w-full text-sm">
      <EnginesHead columns={columns} />
      <EngineRows columns={columns} />
    </table>
  </section>
);
