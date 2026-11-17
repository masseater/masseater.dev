import { Array as Arr, Option, Predicate, pipe } from "effect";

import type { Automation, Bar, Control, Tempo, TempoStep } from "#/entities/song/index.ts";
import { bpmOf } from "#/shared/lib/units.ts";
import { isAutomation, isControlLine, isTempoLine } from "#generated/langium/ast.ts";
import type { Bar as BarNode, TempoLine } from "#generated/langium/ast.ts";

import { automationOf } from "./automation.ts";
import { controlsOf, tempoStepsOf } from "./controls.ts";
import type { Span } from "./controls.ts";
import { tempoAfter } from "./meter.ts";
import { problemAt, problemsOf } from "./problem.ts";
import type { Compiled, From, Problem } from "./problem.ts";

const FIRST = 1;

const tempoLinesOf: From<BarNode, readonly TempoLine[]> = (node) =>
  pipe(node.lines, Arr.filter(isTempoLine));

export const lineTempoOf: From<BarNode, Option.Option<Tempo>> = (node) =>
  pipe(
    Arr.head(tempoLinesOf(node)),
    Option.flatMap((line) => Arr.head(line.steps)),
    Option.map((step): Tempo => ({ bpm: bpmOf(step.bpm), ramp: Option.none() })),
  );

export const tempoLineProblemsOf: From<BarNode, readonly Problem[]> = (node) => {
  const lines = tempoLinesOf(node);
  const doubled = pipe(
    Option.some(node),
    Option.filter(
      (bar) => Predicate.isNotUndefined(bar.tempo) && Arr.isReadonlyArrayNonEmpty(lines),
    ),
    Option.map((bar) =>
      problemAt(bar)("tempo")("小節の頭の tempo と tempo の行は片方だけ書きます"),
    ),
    Option.toArray,
  );
  const extra = pipe(
    lines,
    Arr.drop(FIRST),
    Arr.map((line) => problemAt(line)("steps")("tempo の行は 1 小節に 1 つだけ書きます")),
  );
  return [...doubled, ...extra];
};

export const barTempoStepsOf =
  (length: number): From<BarNode, Compiled<readonly TempoStep[]>> =>
  (node) =>
    pipe(
      Arr.head(tempoLinesOf(node)),
      Option.map(tempoStepsOf(length)),
      Option.getOrElse(() => ({ value: [], problems: [] })),
    );

const lastTempoOf: From<TempoStep, Tempo> = (step) => ({
  bpm: Option.getOrElse(step.target, () => step.bpm),
  ramp: Option.none(),
});

export const tempoAfterBar: From<Bar, Tempo> = (bar) =>
  Option.match(Arr.last(bar.tempoSteps), {
    onNone: () => tempoAfter(bar.tempo),
    onSome: lastTempoOf,
  });

export const barControlsOf =
  (span: Span): From<BarNode, Compiled<readonly Control[]>> =>
  (node) => {
    const controls = pipe(node.lines, Arr.filter(isControlLine), Arr.map(controlsOf(span)));
    return {
      value: pipe(
        controls,
        Arr.flatMap((control) => control.value),
      ),
      problems: problemsOf(controls),
    };
  };

export const barAutomationsOf =
  (where: Pick<Automation, "bar" | "start">): From<BarNode, readonly Automation[]> =>
  (node) =>
    pipe(node.lines, Arr.filter(isAutomation), Arr.map(automationOf(where)));
