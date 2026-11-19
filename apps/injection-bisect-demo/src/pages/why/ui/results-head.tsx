import type { ReactNode } from "react";

import { COPY } from "#/pages/why/model/copy.ts";

const CELL = "px-3 py-2 text-left font-medium";

export const ResultsHead = (): ReactNode => (
  <thead className="bg-muted">
    <tr>
      <td className={CELL}>{COPY.results.corner}</td>
      <th scope="col" className={CELL}>
        {COPY.results.ours}
      </th>
      <th scope="col" className={CELL}>
        {COPY.results.direct}
      </th>
    </tr>
  </thead>
);
