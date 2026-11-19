import type { ReactNode } from "react";

import { ResultsBody } from "./results-body.tsx";
import { ResultsHead } from "./results-head.tsx";

const FOCUSABLE = 0;

export const ResultsTable = ({ label }: Readonly<{ label: string }>): ReactNode => (
  <section aria-label={label} className="overflow-x-auto rounded-lg border" tabIndex={FOCUSABLE}>
    <table className="w-full text-sm">
      <ResultsHead />
      <ResultsBody />
    </table>
  </section>
);
