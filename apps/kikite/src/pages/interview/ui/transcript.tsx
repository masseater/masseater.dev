import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useEntries, useInterim } from "#/pages/interview/model/hooks";

import { HistoryItem } from "./history-item.tsx";
import { InterimItem } from "./interim-item.tsx";
import { useStickToBottom } from "./stick-to-bottom.ts";

export const Transcript = (): ReactNode => {
  const entries = useEntries();
  const interim = useInterim();
  const ref = useStickToBottom();
  return (
    <div ref={ref} className="min-h-0 flex-1 overflow-y-auto py-3 lg:px-5">
      <ol className="flex flex-col gap-2">
        {pipe(
          entries,
          Arr.map((entry) => <HistoryItem key={entry.id} entry={entry} />),
        )}
        <InterimItem text={interim} />
      </ol>
    </div>
  );
};
