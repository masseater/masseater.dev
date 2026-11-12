import type { ReactNode } from "react";

import { ReportHeader } from "./report-header.tsx";
import { ReportMeasures } from "./report-measures.tsx";
import { ReportPoints } from "./report-points.tsx";

const ReportView = (): ReactNode => (
  <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
    <ReportHeader />
    <ReportPoints />
    <ReportMeasures />
  </main>
);

export { ReportView };
