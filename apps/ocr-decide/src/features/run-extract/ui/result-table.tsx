import type { ReactNode } from "react";

import type { Line } from "#/entities/extraction";

import { ResultRows } from "./result-rows";

const ResultTable = ({ lines }: Readonly<{ lines: readonly Line[] }>): ReactNode => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-sm">
      <ResultRows lines={lines} />
    </table>
  </div>
);

export { ResultTable };
