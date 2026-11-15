import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useSummary } from "#/entities/interview";
import { SECTIONS } from "#/pages/report/model/handoff";

import { ReportSection } from "./report-section.tsx";

export const ReportSummary = (): ReactNode =>
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
