import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useReport } from "#/pages/interview/model/review-hooks";

import { FactLine } from "./fact-line.tsx";
import { factsOf } from "./facts.ts";
import { ReportHeader } from "./report-header.tsx";
import { StrategyTable } from "./strategy-table.tsx";

const ReportView = (): ReactNode => {
  const report = useReport();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <ReportHeader />
      <StrategyTable rows={report.rows} />
      <ul className="flex flex-col gap-3">
        {pipe(
          factsOf(report),
          Arr.map((fact) => <FactLine key={fact.key} fact={fact} />),
        )}
      </ul>
    </main>
  );
};

export { ReportView };
