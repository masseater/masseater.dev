import { Array as Arr, Match, Option, Predicate, pipe } from "effect";
import type { AstNode } from "langium";

import type { Control, Controller, TempoStep } from "#/entities/song/index.ts";
import { fractionOf, ticksOf } from "#/shared/lib/ticks.ts";
import { bpmOf, pitchOf, semitonesOf } from "#/shared/lib/units.ts";
import { isControlHold } from "#generated/langium/ast.ts";
import type {
  Control as ControlNode,
  ControlHold,
  ControlLine,
  ControlValue,
  Rest,
  TempoLine,
  TempoStep as TempoStepNode,
} from "#generated/langium/ast.ts";

import { problemAt } from "./problem.ts";
import type { Compiled, From, Problem } from "./problem.ts";

const NONE = 0;
const LOWEST = 0;
const HIGHEST = 127;

export interface Span {
  readonly bar: number;
  readonly start: number;
  readonly length: number;
}

interface Timed<Node> {
  readonly node: Node;
  readonly offset: number;
  readonly length: number;
}

interface Laid<Node> {
  readonly steps: readonly Timed<Node>[];
  readonly length: number;
  readonly problems: readonly Problem[];
}

type Stepped = ControlHold | Rest | TempoStepNode;

const durationTextOf: From<Stepped, string> = (node) => node.duration ?? "";

const layOut = <Node extends Stepped>(nodes: readonly Node[]): Laid<Node> => {
  const empty: Laid<Node> = { steps: [], length: NONE, problems: [] };
  return Arr.reduce(nodes, empty, (laid, node) =>
    Option.match(ticksOf(durationTextOf(node)), {
      onNone: () => ({
        ...laid,
        problems: [
          ...laid.problems,
          problemAt(node)("duration")(`${durationTextOf(node)} は細かすぎて表せません`),
        ],
      }),
      onSome: (length) => ({
        steps: [...laid.steps, { node, offset: laid.length, length }],
        length: laid.length + length,
        problems: laid.problems,
      }),
    }),
  );
};

interface Expected {
  readonly name: string;
  readonly length: number;
  readonly node: AstNode;
}

const verdictOf: From<Expected, From<number, string>> = (expected) => (actual) => {
  const gap = fractionOf(Math.abs(expected.length - actual));
  if (actual < expected.length) {
    return `${gap} 足りません`;
  }
  return `${gap} 多すぎます`;
};

const fillProblemsOf: From<Expected, From<number, readonly Problem[]>> = (expected) => (actual) => {
  if (actual === expected.length) {
    return [];
  }
  const verdict = verdictOf(expected)(actual);
  return [
    problemAt(expected.node)("steps")(
      `${expected.name} の合計は ${fractionOf(actual)} で、この小節の ${fractionOf(expected.length)} に ${verdict}`,
    ),
  ];
};

const controllerOf: From<ControlNode, Controller> = (node) =>
  Match.value(node.kind).pipe(
    Match.when("cc", (): Controller => ({ kind: "cc", number: node.number ?? NONE })),
    Match.when("pressure", (): Controller => ({
      kind: "pressure",
      midi: pipe(
        Option.fromNullishOr(node.pitch),
        Option.flatMap(pitchOf),
        Option.map((pitch) => pitch.midi),
      ),
    })),
    Match.when("bend", (): Controller => ({ kind: "bend" })),
    Match.orElse((): Controller => ({ kind: "program" })),
  );

const nameOf: From<ControlLine, string> = (line) => {
  const number = pipe(
    Option.fromNullishOr(line.control.number),
    Option.map((value) => ` ${String(value)}`),
    Option.getOrElse(() => ""),
  );
  const pitch = pipe(
    Option.fromNullishOr(line.control.pitch),
    Option.map((text) => ` ${text}`),
    Option.getOrElse(() => ""),
  );
  return `${line.track.$refText}.${line.control.kind}${number}${pitch}`;
};

const inByte = (value: number): boolean =>
  Number.isInteger(value) && value >= LOWEST && value <= HIGHEST;

const amountOf =
  (controller: Controller): From<ControlValue, Compiled<number>> =>
  (node) => {
    if (controller.kind === "bend") {
      if (!Predicate.isString(node.semitones)) {
        return {
          value: NONE,
          problems: [problemAt(node)("number")("bend の値は半音（例: +0.5st）で書きます")],
        };
      }
      return { value: semitonesOf(node.semitones), problems: [] };
    }
    if (!Predicate.isNumber(node.number) || !inByte(node.number)) {
      return {
        value: NONE,
        problems: [
          problemAt(node)("semitones")(
            `${controller.kind} の値は ${String(LOWEST)} から ${String(HIGHEST)} の整数で書きます`,
          ),
        ],
      };
    }
    return { value: node.number, problems: [] };
  };

const controllerProblemsOf: From<ControlLine, readonly Problem[]> = (line) => {
  const { control } = line;
  const number = pipe(
    Option.some(control),
    Option.filter((node) => node.kind === "cc" && !inByte(node.number ?? Number.NaN)),
    Option.map((node) => problemAt(node)("number")("cc の番号は 0 から 127 の整数で書きます")),
    Option.toArray,
  );
  const pitch = pipe(
    Option.fromNullishOr(control.pitch),
    Option.filter((text) => Option.isNone(pitchOf(text))),
    Option.map((text) => problemAt(control)("pitch")(`${text} は音の高さとして読めません`)),
    Option.toArray,
  );
  return [...number, ...pitch];
};

const rampProblemsOf =
  (controller: Controller): From<ControlHold, readonly Problem[]> =>
  (hold) => {
    if (controller.kind === "program" && Predicate.isNotUndefined(hold.target)) {
      return [problemAt(hold)("target")("program は -> で変化させられません")];
    }
    return [];
  };

interface Where extends Span {
  readonly track: string;
  readonly controller: Controller;
}

const controlOf: From<Where, From<Timed<ControlHold>, Compiled<Control>>> = (where) => (step) => {
  const value = amountOf(where.controller)(step.node.value);
  const target = pipe(
    Option.fromNullishOr(step.node.target),
    Option.map(amountOf(where.controller)),
  );
  return {
    value: {
      track: where.track,
      controller: where.controller,
      bar: where.bar,
      start: where.start + step.offset,
      length: step.length,
      value: value.value,
      target: pipe(
        target,
        Option.map((amount) => amount.value),
      ),
    },
    problems: [
      ...value.problems,
      ...Option.match(target, { onNone: () => [], onSome: (amount) => amount.problems }),
      ...rampProblemsOf(where.controller)(step.node),
    ],
  };
};

export const controlsOf =
  (span: Span): From<ControlLine, Compiled<readonly Control[]>> =>
  (line) => {
    const laid = layOut(line.steps);
    const controller = controllerOf(line.control);
    const where = { ...span, track: line.track.$refText, controller };
    const controls = pipe(
      laid.steps,
      Arr.filter((step): step is Timed<ControlHold> => isControlHold(step.node)),
      Arr.map(controlOf(where)),
    );
    return {
      value: pipe(
        controls,
        Arr.map((control) => control.value),
      ),
      problems: [
        ...laid.problems,
        ...controllerProblemsOf(line),
        ...pipe(
          controls,
          Arr.flatMap((control) => control.problems),
        ),
        ...fillProblemsOf({ name: nameOf(line), length: span.length, node: line })(laid.length),
      ],
    };
  };

export const tempoStepsOf =
  (length: number): From<TempoLine, Compiled<readonly TempoStep[]>> =>
  (line) => {
    const laid = layOut(line.steps);
    return {
      value: pipe(
        laid.steps,
        Arr.map((step) => ({
          offset: step.offset,
          length: step.length,
          bpm: bpmOf(step.node.bpm),
          target: pipe(Option.fromNullishOr(step.node.target), Option.map(bpmOf)),
        })),
      ),
      problems: [
        ...laid.problems,
        ...fillProblemsOf({ name: "tempo", length, node: line })(laid.length),
      ],
    };
  };
