import { cn } from "@masseater.dev/web-ui";
import { asksTogether, branchesFor, outcomeOf, sentencesOf } from "@r_masseater/injection-bisect";
import type { Outcome } from "@r_masseater/injection-bisect";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { COUNT, DOLLARS } from "#/entities/inspection/index.ts";
import type { Answer, Phase, Row, Trace } from "#/entities/inspection/index.ts";
import { COPY } from "#/shared/config/index.ts";

import { GradeLine } from "./grade-line";
import { PhaseNotes } from "./phase-notes";
import { Stat } from "./stat";

type Answered = Extract<Answer, Readonly<{ status: "answered" }>>;

const NOTHING = 0;

const OUTCOME_LABEL = {
  clean: COPY.clean,
  injected: COPY.injected,
  unreadable: COPY.unread,
} as const satisfies Record<Outcome, string>;

const labelOf = (phase: Phase): string => {
  if (phase.status === "running") {
    return `${COPY.running}…`;
  }
  if (phase.status === "failed") {
    return COPY.failed;
  }
  return OUTCOME_LABEL[outcomeOf(phase.detection)];
};

const isAlarm = (phase: Phase): boolean =>
  phase.status === "failed" || (phase.status === "done" && outcomeOf(phase.detection) !== "clean");

const sumOf = (rows: readonly Row[], pick: (answered: Answered) => number): number => {
  let sum = NOTHING;
  for (const { answer } of rows) {
    if (answer.status === "answered") {
      sum += pick(answer);
    }
  }
  return sum;
};

const requestsOf = (model: string, rows: readonly Row[]): number => {
  if (asksTogether(model)) {
    return new Set(
      pipe(
        rows,
        Arr.map(({ depth }) => depth),
      ),
    ).size;
  }
  return rows.length;
};

const branchesOf = (model: string, sentences: number): number => {
  if (asksTogether(model)) {
    return sentences;
  }
  return branchesFor(sentences);
};

export const RunSummary = ({
  text,
  model,
  format,
  trace,
}: Readonly<{ text: string; model: string; format: string; trace: Trace }>): ReactNode => (
  <div className="flex flex-col gap-2">
    <h2 className={cn("text-xl font-semibold", isAlarm(trace.phase) && "text-destructive")}>
      {labelOf(trace.phase)}
    </h2>
    <PhaseNotes phase={trace.phase} />
    <GradeLine text={text} phase={trace.phase} />
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm sm:grid-cols-6">
      <Stat label={COPY.queries} value={`${requestsOf(model, trace.rows)}${COPY.times}`} />
      <Stat
        label={COPY.perSentence}
        value={`${sentencesOf({ text, format }).length}${COPY.times}`}
      />
      <Stat
        label={COPY.branches}
        value={String(branchesOf(model, sentencesOf({ text, format }).length))}
      />
      <Stat label={COPY.elapsed} value={`${COUNT.format(Math.round(trace.elapsed))}ms`} />
      <Stat
        label={COPY.tokens}
        value={COUNT.format(sumOf(trace.rows, (answer) => answer.inputTokens))}
      />
      <Stat label={COPY.spent} value={DOLLARS.format(sumOf(trace.rows, (answer) => answer.cost))} />
    </dl>
  </div>
);
