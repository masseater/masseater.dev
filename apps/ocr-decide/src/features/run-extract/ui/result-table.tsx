import type { ReactNode } from "react";

import type { Line } from "#/entities/extraction/index.ts";
import { COPY } from "#/shared/config/index.ts";

import { ResultRows } from "./result-rows.tsx";

const FOCUSABLE = 0;

export const ResultTable = ({ lines }: Readonly<{ lines: readonly Line[] }>): ReactNode => (
  <section
    aria-label={COPY.result}
    className="overflow-x-auto rounded-lg border"
    tabIndex={FOCUSABLE}
  >
    <table className="w-full text-sm">
      <ResultRows lines={lines} />
    </table>
  </section>
);
