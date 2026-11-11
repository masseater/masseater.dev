import { Option } from "effect";
import type { ReactNode } from "react";

import { summaryOf } from "#/pages/interview/model/hooks";
import type { SummaryState } from "#/pages/interview/model/hooks";

import { SummarySection } from "./summary-section.tsx";

const POINTS = "分かったこと";
const OPEN = "あいまい";
const NEXT = "まだ聞いていない";

const SummaryBody = ({ state }: Readonly<{ state: SummaryState }>): ReactNode =>
  Option.match(summaryOf(state), {
    onNone: () => false,
    onSome: (summary) => (
      <div className="flex flex-col gap-4">
        <SummarySection title={POINTS} items={summary.points} />
        <SummarySection title={OPEN} items={summary.open} />
        <SummarySection title={NEXT} items={summary.next} />
      </div>
    ),
  });

export { SummaryBody };
