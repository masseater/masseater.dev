import type { ReactNode } from "react";

import type { Column } from "#/pages/ocr-engines/model/tables";

import { EngineRows } from "./engine-rows";
import { EnginesHead } from "./engines-head";

const EnginesTable = ({ columns }: Readonly<{ columns: readonly Column[] }>): ReactNode => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-sm">
      <EnginesHead columns={columns} />
      <EngineRows columns={columns} />
    </table>
  </div>
);

export { EnginesTable };
