import { fractionOf } from "@r_masseater/fumx-parser";
import { Array as Arr, Option, pipe } from "effect";

import type { From } from "#/shared/lib/from.ts";

import { quoted } from "./cells.ts";
import { controlLinesOf } from "./control-lines.ts";
import type { Timeline } from "./events.ts";
import { barsOf, bpmText } from "./layout.ts";
import type { LaidBar, LaidTempo } from "./layout.ts";
import { planOf } from "./plan.ts";
import type { Plan, PlannedPart } from "./plan.ts";
import { voiceLinesOf } from "./voice-lines.ts";

const SINGLE = 1;
const INDENT = "  ";

export interface Written {
  readonly text: string;
  readonly plan: Plan;
  readonly bars: readonly LaidBar[];
}

interface Previous {
  readonly meter: Option.Option<string>;
  readonly microseconds: Option.Option<number>;
}

const START: Previous = { meter: Option.none(), microseconds: Option.none() };

const isRamp: From<LaidTempo, boolean> = (step) => Option.isSome(step.target);

const stepText: From<LaidTempo, string> = (step) => {
  const ramp = Option.match(step.target, {
    onNone: () => "",
    onSome: (target) => ` -> ${bpmText(target)}`,
  });
  return `${bpmText(step.microseconds)}${ramp} ${fractionOf(step.length)}`;
};

const tempoLineOf: From<LaidBar, Option.Option<string>> = (bar) => {
  if (bar.tempo.length <= SINGLE && !pipe(bar.tempo, Arr.some(isRamp))) {
    return Option.none();
  }
  const steps = pipe(bar.tempo, Arr.map(stepText));
  return Option.some(`tempo: ${Arr.join(steps, ", ")}`);
};

const differs =
  <Value>(previous: Option.Option<Value>): From<Value, boolean> =>
  (current) =>
    Option.match(previous, { onNone: () => true, onSome: (value) => value !== current });

const headerTempoOf =
  (previous: Previous): From<LaidBar, readonly string[]> =>
  (bar) =>
    pipe(
      Arr.head(bar.tempo),
      Option.filter(() => bar.tempo.length === SINGLE && !pipe(bar.tempo, Arr.some(isRamp))),
      Option.map((step) => step.microseconds),
      Option.filter(differs(previous.microseconds)),
      Option.map((microseconds) => `tempo ${bpmText(microseconds)}`),
      Option.toArray,
    );

const barHeadOf =
  (previous: Previous): From<LaidBar, string> =>
  (bar) => {
    const meter = pipe(
      Option.some(bar.meter),
      Option.filter(differs(previous.meter)),
      Option.map((current) => `meter ${current}`),
      Option.toArray,
    );
    const mark = pipe(
      Option.some(bar.marks),
      Option.filter(Arr.isReadonlyArrayNonEmpty),
      Option.map((marks) => `mark ${quoted(Arr.join(marks, " / "))}`),
      Option.toArray,
    );
    return Arr.join(["bar", ...meter, ...headerTempoOf(previous)(bar), ...mark, "{"], " ");
  };

const barBodyOf: From<Plan, From<LaidBar, readonly string[]>> = (plan) => (bar) => [
  ...Option.toArray(tempoLineOf(bar)),
  ...pipe(
    plan.parts,
    Arr.flatMap((planned) => [
      ...voiceLinesOf({ plan, bar })(planned),
      ...controlLinesOf(bar)(planned),
    ]),
  ),
];

interface Walk {
  readonly lines: readonly string[];
  readonly previous: Previous;
}

const afterBar: From<LaidBar, Previous> = (bar) => ({
  meter: Option.some(bar.meter),
  microseconds: pipe(
    Arr.last(bar.tempo),
    Option.map((step) => Option.getOrElse(step.target, () => step.microseconds)),
  ),
});

const walkStep: From<Plan, (walk: Walk, bar: LaidBar) => Walk> =
  (plan) =>
  ({ lines, previous }, bar) => ({
    lines: [
      ...lines,
      "",
      barHeadOf(previous)(bar),
      ...pipe(
        barBodyOf(plan)(bar),
        Arr.map((line) => `${INDENT}${line}`),
      ),
      "}",
    ],
    previous: afterBar(bar),
  });

const instrumentLinesOf: From<Plan, readonly string[]> = (plan) =>
  pipe(
    Arr.fromIterable(plan.instruments),
    Arr.map(([program, name]) => `instrument ${name} plugin gm program ${String(program)}`),
  );

const kitLinesOf: From<Plan, readonly string[]> = (plan) => {
  if (plan.drumVoices.size < SINGLE) {
    return [];
  }
  const voices = pipe(
    Arr.fromIterable(plan.drumVoices.values()),
    Arr.map((name) => `${INDENT}${name} ${quoted(`gm-drums/${name}.flac`)}`),
  );
  return ["kit gm-drums {", ...voices, "}"];
};

const trackLineOf: From<PlannedPart, string> = (planned) => {
  if (planned.source.kind === "kit") {
    return `track ${planned.name} kit gm-drums role drums`;
  }
  return `track ${planned.name} instrument ${planned.source.instrument}`;
};

interface Heading {
  readonly plan: Plan;
  readonly title: string;
}

const headerOf: From<Heading, readonly string[]> = ({ plan, title }) => [
  `song ${quoted(title)}`,
  "",
  'plugin gm from "./gm.ts" { program: number = 0 }',
  "",
  ...instrumentLinesOf(plan),
  ...kitLinesOf(plan),
  "",
  ...pipe(plan.parts, Arr.map(trackLineOf)),
];

export interface WriteInput {
  readonly timeline: Timeline;
  readonly title: string;
}

export const writeFumx: From<WriteInput, Written> = ({ timeline, title }) => {
  const plan = planOf(timeline);
  const bars = barsOf(timeline);
  const walked = Arr.reduce(
    bars,
    { lines: headerOf({ plan, title }), previous: START },
    walkStep(plan),
  );
  return { text: `${Arr.join(walked.lines, "\n")}\n`, plan, bars };
};
