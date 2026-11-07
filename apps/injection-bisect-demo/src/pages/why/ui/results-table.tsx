import type { ReactNode } from "react";

import { ResultsBody } from "./results-body";
import { ResultsHead } from "./results-head";

const ResultsTable = (): ReactNode => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-sm">
      <ResultsHead />
      <ResultsBody />
    </table>
  </div>
);

export { ResultsTable };
