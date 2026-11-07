import type { Region } from "@r_masseater/injection-bisect";
import { cutoffFor } from "@r_masseater/injection-bisect";
import { Array as Arr, String as Str, pipe } from "effect";

import type { InspectEvent } from "#/pages/inspect/api/inspect-events";

import { COPY } from "./copy";
import { formatCount, formatDollars, formatPercent } from "./format";

interface LogLine {
  readonly key: string;
  readonly tone: "asked" | "answered" | "done" | "failed";
  readonly text: string;
}

const TIME_WIDTH = 6;

const NEXT = 1;

const stamp = (at: number): string => `+${Str.padStart(TIME_WIDTH)(String(Math.round(at)))}ms`;

const rangeOf = ({ start, end }: Readonly<{ start: number; end: number }>): string =>
  `[${start}, ${end})`;

const verdictOf = ({
  probability,
  model,
}: Readonly<{ probability: number; model: string }>): string => {
  const cutoff = cutoffFor(model);
  if (probability >= cutoff) {
    return COPY.over(cutoff);
  }
  return COPY.under(cutoff);
};

const resultOf = (event: Extract<InspectEvent, { type: "done" }>): string => {
  if (event.detection.status === "clean") {
    return `${COPY.clean}  ${formatPercent(event.detection.probability)}`;
  }
  const regions = pipe(
    event.detection.regions,
    Arr.map((region: Region) => rangeOf(region)),
    Arr.join(" "),
  );
  return `${COPY.injected}  ${COPY.regions} ${regions}`;
};

const lineOf = (event: InspectEvent): LogLine => {
  const at = stamp(event.at);
  if (event.type === "asked") {
    return {
      key: `asked-${event.id}`,
      tone: "asked",
      text: `${at}  #${event.id}  ${event.depth + NEXT}${COPY.depth}  ${rangeOf(event)}  ${formatCount(event.end - event.start)}${COPY.chars}`,
    };
  }
  if (event.type === "answered") {
    return {
      key: `answered-${event.id}`,
      tone: "answered",
      text: `${at}  #${event.id}  ${formatPercent(event.probability)} ${verdictOf(event)}  ${Math.round(event.millis)}ms  ${formatCount(event.inputTokens)} tok  ${formatDollars(event.cost)}  ${event.model}`,
    };
  }
  if (event.type === "done") {
    return { key: "done", tone: "done", text: `${at}  ${resultOf(event)}` };
  }
  return { key: "failed", tone: "failed", text: `${at}  ${event.reason}` };
};

const logOf = (events: readonly InspectEvent[]): readonly LogLine[] =>
  pipe(
    events,
    Arr.map((event) => lineOf(event)),
  );

export type { LogLine };
export { logOf };
