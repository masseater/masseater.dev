import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { summaryOf, useSummaryState } from "#/pages/interview/model/hooks";

const SummaryPanel = (): ReactNode => {
  const points = pipe(
    summaryOf(useSummaryState()),
    Option.match({ onNone: Arr.empty<string>, onSome: (summary) => summary.points }),
  );
  return (
    Arr.isReadonlyArrayNonEmpty(points) && (
      <aside className="hidden w-72 shrink-0 pt-6 lg:block">
        <ul className="text-muted-foreground flex flex-col gap-2 text-sm leading-relaxed">
          {pipe(
            points,
            Arr.map((point) => <li key={point}>{point}</li>),
          )}
        </ul>
      </aside>
    )
  );
};

export { SummaryPanel };
