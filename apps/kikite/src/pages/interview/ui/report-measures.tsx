import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useReport } from "#/pages/interview/model/review-hooks";

import { FactLine } from "./fact-line.tsx";
import { factsOf } from "./facts.ts";
import { StrategyTable } from "./strategy-table.tsx";

const ReportMeasures = (): ReactNode => {
  const report = useReport();
  return (
    <section className="text-muted-foreground flex flex-col gap-6 border-t pt-8 text-sm">
      <StrategyTable rows={report.rows} />
      <ul className="flex flex-col gap-3">
        {pipe(
          factsOf(report),
          Arr.map((fact) => <FactLine key={fact.key} fact={fact} />),
        )}
      </ul>
    </section>
  );
};

export { ReportMeasures };
