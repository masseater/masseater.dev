import { Array as Arr, Option, Record, pipe } from "effect";

import { table } from "#/shared/lib/markdown.ts";
import type { Row } from "#/shared/lib/markdown.ts";
import { MAXIMUM, MEDIAN, TAIL, percentile } from "#/shared/lib/stats.ts";

import type { Flow } from "./flow.ts";

const PHASES = [
  "totalSeconds",
  "beforeQueueSeconds",
  "queueSeconds",
  "ciSeconds",
  "queueWaitSeconds",
  "pushAfterCommitSeconds",
  "branchUpdates",
  "ejections",
  "checkReruns",
] as const;

const MISSING = "-";

const cell = (value: Option.Option<number>): string | number =>
  Option.getOrElse(value, (): string | number => MISSING);

const phaseRow =
  (flows: readonly Flow[]) =>
  (phase: (typeof PHASES)[number]): Row => {
    const values = pipe(
      flows,
      Arr.map((flow) => flow[phase]),
    );
    return {
      phase,
      p50: cell(percentile(MEDIAN)(values)),
      p90: cell(percentile(TAIL)(values)),
      max: cell(percentile(MAXIMUM)(values)),
    };
  };

const repositorySection = ([repository, flows]: readonly [string, readonly Flow[]]): string => {
  const rows = pipe(PHASES, Arr.map(phaseRow(flows)));
  const heading = `### ${repository} (${String(flows.length)} PRs)`;
  return Arr.join([heading, table(["phase", "p50", "p90", "max"])(rows)], "\n\n");
};

export const summaryOf = (flows: readonly Flow[]): string =>
  pipe(
    Arr.groupBy(flows, (flow) => flow.repository),
    Record.toEntries,
    Arr.map(repositorySection),
    Arr.join("\n\n"),
  );
