import type { ScheduleRun } from "@masseater.dev/portal-protocol";
import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { RUN_LABELS, minuteOf, stateOf } from "#/pages/schedules/model/runs.ts";

const TEXT = { never: "まだ無い", thread: "スレッド" } as const;

const threadLink = (url: string): ReactNode => (
  <a className="text-link underline underline-offset-3" href={url}>
    {TEXT.thread}
  </a>
);

const RunLine = ({ run }: Readonly<{ run: ScheduleRun }>): ReactNode => {
  const state = stateOf(run);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="data-[state=waiting]:text-destructive font-bold" data-state={state}>
        {RUN_LABELS[state]}
      </span>
      <span className="text-muted-foreground text-xs tabular-nums">{minuteOf(run.createdAt)}</span>
      {pipe(Option.fromNullOr(run.threadUrl), Option.map(threadLink), Option.getOrNull)}
    </div>
  );
};

export const LastRun = ({ run }: Readonly<{ run: ScheduleRun | null }>): ReactNode =>
  pipe(
    Option.fromNullOr(run),
    Option.match({
      onNone: () => <span className="text-muted-foreground">{TEXT.never}</span>,
      onSome: (found) => <RunLine run={found} />,
    }),
  );
