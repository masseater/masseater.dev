import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { COPY } from "#/pages/ocr-engines/model/copy";

const CELL = "px-3 py-2 text-left font-medium whitespace-nowrap";

const EnginesHead = ({
  columns,
}: Readonly<{ columns: readonly Readonly<{ id: string; label: string }>[] }>): ReactNode => (
  <thead className="bg-muted">
    <tr>
      <th className={CELL}>{COPY.engine}</th>
      {pipe(
        columns,
        Arr.map(({ id, label }) => (
          <th key={id} className={CELL}>
            {label}
          </th>
        )),
      )}
    </tr>
  </thead>
);

export { EnginesHead };
