import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { summaryOf, useSummaryState } from "#/pages/interview/model/hooks";

const SummaryPanel = (): ReactNode => {
  const points = pipe(
    summaryOf(useSummaryState()),
    Option.match({ onNone: Arr.empty<string>, onSome: (summary) => summary.points }),
  );
  return (
    <aside className="hidden w-72 shrink-0 pt-4 lg:block">
      {Arr.isReadonlyArrayNonEmpty(points) && (
        <ul className="bg-muted/50 sticky top-4 flex flex-col gap-2 rounded-xl p-4 text-sm leading-relaxed">
          {pipe(
            points,
            Arr.map((point) => (
              <li key={point} className="animate-in fade-in duration-700">
                {point}
              </li>
            )),
          )}
        </ul>
      )}
    </aside>
  );
};

export { SummaryPanel };
