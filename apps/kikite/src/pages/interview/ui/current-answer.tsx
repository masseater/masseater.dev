import { cn } from "@masseater.dev/ui/cn";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useInterim, usePanel, useStage } from "#/entities/interview";
import { useStickToBottom } from "#/shared/lib/stick-to-bottom";

import { HistoryItem } from "./history-item.tsx";
import { InterimItem } from "./interim-item.tsx";

export const CurrentAnswer = (): ReactNode => {
  const { said } = useStage();
  const interim = useInterim();
  const ref = useStickToBottom();
  const empty = Arr.isReadonlyArrayEmpty(said) && interim === "";
  return (
    <div
      ref={ref}
      hidden={empty}
      className={cn(
        "max-h-44 shrink-0 overflow-y-auto lg:max-h-96",
        usePanel() === "transcript" && "max-lg:hidden",
      )}
    >
      <ol aria-live="polite" className="flex flex-col gap-2 lg:text-lg">
        {pipe(
          said,
          Arr.map((entry) => <HistoryItem key={entry.id} entry={entry} />),
        )}
        <InterimItem text={interim} />
      </ol>
    </div>
  );
};
