import { Array as Arr, Option, pipe } from "effect";

import type { Meter, Tempo } from "#/entities/song/index.ts";
import { partsOf } from "#/shared/lib/ticks.ts";
import { barsOf, bpmOf } from "#/shared/lib/units.ts";
import type { Meter as MeterNode, Tempo as TempoNode } from "#generated/langium/ast.ts";

import { problemAt } from "./problem.ts";
import type { Compiled, From } from "./problem.ts";

const NONE = 0;

const groupingProblemsOf: From<MeterNode, Compiled<Meter>["problems"]> = (node) => {
  const sum = Arr.reduce(node.groups, NONE, (total, group) => total + group);
  return pipe(
    partsOf(node.signature),
    Option.filter(({ numerator }) => Arr.isReadonlyArrayNonEmpty(node.groups) && sum !== numerator),
    Option.map(({ numerator }) =>
      problemAt(node)("groups")(
        `拍の区切りの合計は ${String(sum)} で、${node.signature} の ${String(numerator)} と合いません`,
      ),
    ),
    Option.toArray,
  );
};

export const meterOf: From<MeterNode, Compiled<Option.Option<Meter>>> = (node) =>
  Option.match(partsOf(node.signature), {
    onNone: () => ({
      value: Option.none(),
      problems: [problemAt(node)("signature")(`${node.signature} は拍子として読めません`)],
    }),
    onSome: (parts) => ({
      value: Option.some({ ...parts, groups: node.groups }),
      problems: groupingProblemsOf(node),
    }),
  });

export const tempoOf: From<TempoNode, Tempo> = (node) => ({
  bpm: bpmOf(node.bpm),
  ramp: pipe(
    Option.all({
      target: Option.fromNullishOr(node.target),
      span: Option.fromNullishOr(node.span),
    }),
    Option.map(({ target, span }) => ({ bpm: bpmOf(target), bars: barsOf(span) })),
  ),
});

export const tempoAfter: From<Tempo, Tempo> = (tempo) =>
  Option.match(tempo.ramp, {
    onNone: () => tempo,
    onSome: (ramp) => ({ bpm: ramp.bpm, ramp: Option.none() }),
  });
