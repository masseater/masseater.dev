import type { ReactNode } from "react";

import { usePhase } from "#/entities/interview";
import { InterviewPage } from "#/pages/interview";
import { ReportView } from "#/pages/report";

export const Screen = (): ReactNode => {
  const { status } = usePhase();
  if (status === "report") {
    return <ReportView />;
  }
  return <InterviewPage />;
};
