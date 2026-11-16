import type { ReactNode } from "react";

import { usePhase } from "#/entities/interview/index.ts";
import { InterviewPage } from "#/pages/interview/index.ts";
import { ReportView } from "#/pages/report/index.ts";

export const Screen = (): ReactNode => {
  const { status } = usePhase();
  if (status === "report") {
    return <ReportView />;
  }
  return <InterviewPage />;
};
