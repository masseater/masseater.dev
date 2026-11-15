import { Array as Arr, String as Str, pipe } from "effect";
import type { ReactNode } from "react";

import type { Trace } from "#/entities/inspection";
import { COPY } from "#/shared/config";

import { Legend } from "./legend";
import { TraceRow } from "./trace-row";

const MIN_SPAN = 1;

const TraceView = ({ text, trace }: Readonly<{ text: string; trace: Trace }>): ReactNode => (
  <div className="flex flex-col gap-2">
    <h2 className="text-lg font-semibold">{COPY.trace}</h2>
    <Legend />
    <ol className="flex flex-col">
      {pipe(
        trace.rows,
        Arr.map((row) => (
          <TraceRow
            key={row.id}
            row={row}
            excerpt={Str.slice(row.start, row.end)(text)}
            total={Math.max(trace.elapsed, MIN_SPAN)}
          />
        )),
      )}
    </ol>
  </div>
);

export { TraceView };
