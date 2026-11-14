import type { ReactNode } from "react";

import { ReportHeader } from "./report-header.tsx";
import { ReportMeasures } from "./report-measures.tsx";
import { ReportSummary } from "./report-summary.tsx";

const ReportView = (): ReactNode => (
  <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
    <ReportHeader />
    <ReportSummary />
    <ReportMeasures />
  </main>
);

export { ReportView };
