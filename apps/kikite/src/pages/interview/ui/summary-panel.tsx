import type { ReactNode } from "react";

import { useSummaryState } from "#/pages/interview/model/hooks";

import { SummaryBody } from "./summary-body.tsx";
import { SummaryHeading } from "./summary-heading.tsx";

const SummaryPanel = (): ReactNode => {
  const state = useSummaryState();
  return (
    <aside className="bg-card flex flex-col gap-4 rounded-lg border p-4 lg:w-88 lg:shrink-0">
      <SummaryHeading updating={state.status === "updating"} />
      {state.status === "failed" && <p className="text-destructive text-xs">{state.message}</p>}
      <SummaryBody state={state} />
    </aside>
  );
};

export { SummaryPanel };
