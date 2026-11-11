import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useStage } from "#/pages/interview/model/hooks";

import { HistoryItem } from "./history-item.tsx";

const History = (): ReactNode => (
  <ol className="flex flex-col gap-2 pt-4">
    {pipe(
      useStage().history,
      Arr.map((entry) => <HistoryItem key={entry.id} entry={entry} />),
    )}
  </ol>
);

export { History };
