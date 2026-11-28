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
    ({ frameMedianMs, frameP90Ms, frameMaxMs }: Summary): string =>
      `${frameMedianMs.toFixed(TENTHS)}/${frameP90Ms.toFixed(TENTHS)}/${frameMaxMs.toFixed(TENTHS)}`,
  ],
  ["commit frame ms", ({ commitFrameMs }: Summary): string => commitFrameMs.toFixed(TENTHS)],
  [
    "LoAF max ms",
    ({ longAnimationFrameMaxMs }: Summary): string => longAnimationFrameMaxMs.toFixed(WHOLE),
  ],
  ["blocking ms", ({ blockingMs }: Summary): string => blockingMs.toFixed(WHOLE)],
  ["interaction ms", ({ interactionMaxMs }: Summary): string => interactionMaxMs.toFixed(WHOLE)],
  ["input delay max ms", ({ inputDelayMaxMs }: Summary): string => inputDelayMaxMs.toFixed(TENTHS)],
  [
    "wheels / deltaY received",
    ({ wheelsReceived, deltaYReceived }: Summary): string =>
      `${wheelsReceived.toString()} / ${deltaYReceived.toString()}`,
  ],
  [
    "zoom (expected)",
    ({ zoom, zoomExpected }: Summary): string =>
      `${zoom.toFixed(THOUSANDTHS)} (${zoomExpected.toFixed(THOUSANDTHS)})`,
  ],
  ["ratio", ({ zoomRatio }: Summary): string => zoomRatio.toFixed(THOUSANDTHS)],
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
