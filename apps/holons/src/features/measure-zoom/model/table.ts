import { Array as Arr, pipe } from "effect";

import type { Summary } from "./metrics.ts";

export type SummaryRow = Readonly<{
  sequence: string;
  scale: string;
  median: Summary;
}>;

const TENTHS = 1;
const WHOLE = 0;
const THOUSANDTHS = 3;

type Column = readonly [string, (summary: Summary) => string];

const COLUMNS: readonly Column[] = [
  [
    "frame ms (med/p90/max)",
    ({ frameMedianMs, frameP90Ms, frameMaxMs }) =>
      `${frameMedianMs.toFixed(TENTHS)}/${frameP90Ms.toFixed(TENTHS)}/${frameMaxMs.toFixed(TENTHS)}`,
  ],
  ["commit frame ms", ({ commitFrameMs }) => commitFrameMs.toFixed(TENTHS)],
  ["LoAF max ms", ({ longAnimationFrameMaxMs }) => longAnimationFrameMaxMs.toFixed(WHOLE)],
  ["blocking ms", ({ blockingMs }) => blockingMs.toFixed(WHOLE)],
  ["interaction ms", ({ interactionMaxMs }) => interactionMaxMs.toFixed(WHOLE)],
  ["input delay max ms", ({ inputDelayMaxMs }) => inputDelayMaxMs.toFixed(TENTHS)],
  [
    "wheels / deltaY received",
    ({ wheelsReceived, deltaYReceived }) =>
      `${wheelsReceived.toString()} / ${deltaYReceived.toString()}`,
  ],
  [
    "zoom (expected)",
    ({ zoom, zoomExpected }) =>
      `${zoom.toFixed(THOUSANDTHS)} (${zoomExpected.toFixed(THOUSANDTHS)})`,
  ],
  ["ratio", ({ zoomRatio }) => zoomRatio.toFixed(THOUSANDTHS)],
];

const blockOf = ({ sequence, scale, median }: SummaryRow): string =>
  pipe(
    COLUMNS,
    Arr.map(([label, format]) => `  ${label}: ${format(median)}`),
    Arr.prepend(`${sequence} @ ${scale}`),
    Arr.join("\n"),
  );

export const tableOf = (rows: readonly SummaryRow[]): string =>
  pipe(rows, Arr.map(blockOf), Arr.join("\n"));
