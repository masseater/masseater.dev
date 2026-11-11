import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { summaryOf, useSummaryState } from "#/pages/interview/model/hooks";

const ReportPoints = (): ReactNode => (
  <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed">
    {pipe(
      summaryOf(useSummaryState()),
      Option.match({ onNone: Arr.empty<string>, onSome: (summary) => summary.points }),
      Arr.map((point) => <li key={point}>{point}</li>),
    )}
  </ul>
);

export { ReportPoints };
