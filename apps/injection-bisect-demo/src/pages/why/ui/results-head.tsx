import type { ReactNode } from "react";

import { COPY } from "#/pages/why/model/copy";

const CELL = "px-3 py-2 text-left font-medium";

const ResultsHead = (): ReactNode => (
  <thead className="bg-muted">
    <tr>
      <th className={CELL}>{COPY.results.corner}</th>
      <th className={CELL}>{COPY.results.ours}</th>
      <th className={CELL}>{COPY.results.direct}</th>
    </tr>
  </thead>
);

export { ResultsHead };
