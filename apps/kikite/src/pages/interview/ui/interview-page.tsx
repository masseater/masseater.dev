import type { ReactNode } from "react";

import { usePhase } from "#/pages/interview/model/hooks";

import { SessionView } from "./session-view.tsx";
import { SetupForm } from "./setup-form.tsx";

const InterviewPage = (): ReactNode => {
  if (usePhase().status === "setup") {
    return <SetupForm />;
  }
  return <SessionView />;
};

export { InterviewPage };
