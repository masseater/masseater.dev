import type { ReactNode } from "react";

import type { Line } from "#/entities/extraction/index.ts";

import { ResultRows } from "./result-rows.tsx";

export const ResultTable = ({ lines }: Readonly<{ lines: readonly Line[] }>): ReactNode => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-sm">
      <ResultRows lines={lines} />
    </table>
  </div>
);
