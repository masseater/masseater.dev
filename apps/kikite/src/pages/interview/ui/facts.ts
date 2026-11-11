import { Array as Arr, Option, pipe } from "effect";

import type { Change, Report, Wait } from "#/pages/interview/model/review-hooks";

type FactKey = "wait" | "withdrawn" | "open" | "next";

type Fact = Readonly<{ key: FactKey; label: string; value: string }>;

const MS_PER_SECOND = 1000;
const DIGITS = 1;

const seconds = (ms: number): string => `${(ms / MS_PER_SECOND).toFixed(DIGITS)} 秒`;

const shrink = ([first, last]: readonly [number, number]): string => `${first} 件から ${last} 件`;

const waitFact = (wait: Wait): Fact => ({
  key: "wait",
  label: "質問が出るまで",
  value: `中央 ${seconds(wait.medianMs)}・最長 ${seconds(wait.maxMs)}`,
});

const changeFacts = (change: Change): readonly Fact[] => [
  { key: "open", label: "あいまい", value: shrink(change.open) },
  { key: "next", label: "まだ聞いていない", value: shrink(change.next) },
];

const factsOf = (report: Report): readonly Fact[] =>
  Arr.flatten([
    pipe(report.wait, Option.map(waitFact), Option.toArray),
    [
      {
        key: "withdrawn",
        label: "話の途中で引っ込めた質問",
        value: `${report.withdrawn} 回`,
      },
    ],
    pipe(report.change, Option.map(changeFacts), Option.getOrElse(Arr.empty<Fact>)),
  ]);

export { factsOf };
export type { Fact, FactKey };
