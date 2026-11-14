import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { SECTIONS } from "#/pages/interview/model/handoff";
import { useSummary } from "#/pages/interview/model/hooks";

import { ReportSection } from "./report-section.tsx";

const ReportSummary = (): ReactNode =>
  Option.match(useSummary(), {
    onNone: () => false,
    onSome: (summary) => (
      <div className="flex flex-col gap-6">
        {pipe(
          SECTIONS,
          Arr.map(({ key, heading }) => (
            <ReportSection key={key} heading={heading} items={summary[key]} />
          )),
        )}
      </div>
    ),
  });

export { ReportSummary };
