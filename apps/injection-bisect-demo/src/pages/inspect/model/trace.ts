import type { Detection, Probe } from "@r_masseater/injection-bisect";
import { Array as Arr, pipe } from "effect";

import type { InspectEvent } from "#/pages/inspect/api/inspect-events";

type Answer =
  | { readonly status: "pending" }
  | (Probe & { readonly status: "answered"; readonly answeredAt: number });

interface Row {
  readonly id: number;
  readonly depth: number;
  readonly start: number;
  readonly end: number;
  readonly askedAt: number;
  readonly answer: Answer;
}

type Phase =
  | { readonly status: "running" }
  | { readonly status: "done"; readonly detection: Detection }
  | { readonly status: "failed"; readonly reason: string };

interface Trace {
  readonly rows: readonly Row[];
  readonly phase: Phase;
  readonly elapsed: number;
}

const START = 0;

const PENDING: Answer = { status: "pending" };

const answerRow = (row: Row, event: Extract<InspectEvent, { type: "answered" }>): Row => {
  if (row.id !== event.id) {
    return row;
  }
  const { type: _type, id: _id, at, ...probe } = event;
  return { ...row, answer: { ...probe, status: "answered", answeredAt: at } };
};

const step = (trace: Trace, event: InspectEvent): Trace => {
  const elapsed = Math.max(trace.elapsed, event.at);
  if (event.type === "asked") {
    const { id, depth, start, end, at } = event;
    const row: Row = { id, depth, start, end, askedAt: at, answer: PENDING };
    return { ...trace, elapsed, rows: [...trace.rows, row] };
  }
  if (event.type === "answered") {
    return {
      ...trace,
      elapsed,
      rows: pipe(
        trace.rows,
        Arr.map((row) => answerRow(row, event)),
      ),
    };
  }
  if (event.type === "done") {
    return { ...trace, elapsed, phase: { status: "done", detection: event.detection } };
  }
  return { ...trace, elapsed, phase: { status: "failed", reason: event.reason } };
};

const traceOf = (events: readonly InspectEvent[]): Trace => {
  let trace: Trace = { rows: [], phase: { status: "running" }, elapsed: START };
  for (const event of events) {
    trace = step(trace, event);
  }
  return trace;
};

export type { Answer, Phase, Row, Trace };
export { traceOf };
