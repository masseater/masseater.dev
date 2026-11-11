import type { ReactNode } from "react";

import { usePhase } from "#/pages/interview/model/hooks";

import { ReportView } from "./report-view.tsx";
import { SessionView } from "./session-view.tsx";

const InterviewPage = (): ReactNode => {
  const { status } = usePhase();
  if (status === "report") {
    return <ReportView />;
  }
  return <SessionView />;
};

export { InterviewPage };
